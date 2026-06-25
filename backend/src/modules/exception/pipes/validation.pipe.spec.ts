import { UnprocessableEntityException } from '@nestjs/common';
import { IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { GlobalValidationPipe } from './validation.pipe';

class TestDto {
  @IsString()
  name!: string;

  @IsInt()
  @Type(() => Number)
  age!: number;
}

describe('GlobalValidationPipe', () => {
  let pipe: GlobalValidationPipe;

  beforeEach(() => {
    pipe = new GlobalValidationPipe();
  });

  it('should throw 422 for an invalid field', async () => {
    await expect(
      pipe.transform(
        { name: 123, age: 30 },
        { type: 'body', metatype: TestDto },
      ),
    ).rejects.toThrow(UnprocessableEntityException);

    try {
      await pipe.transform(
        { name: 123, age: 30 },
        { type: 'body', metatype: TestDto },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect(error.getStatus()).toBe(422);
      const response = error.getResponse() as Record<string, unknown>;
      expect(response.message).toBe('Validation failed');
      expect(response.details).toEqual([
        {
          field: 'name',
          errors: expect.arrayContaining([expect.stringContaining('string')]),
        },
      ]);
    }
  });

  it('should throw 422 for a forbidden (non-whitelisted) field', async () => {
    const payload = { name: 'John', age: 30, extraField: 'not allowed' };

    await expect(
      pipe.transform(payload, { type: 'body', metatype: TestDto }),
    ).rejects.toThrow(UnprocessableEntityException);

    try {
      await pipe.transform(payload, { type: 'body', metatype: TestDto });
    } catch (error) {
      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect(error.getStatus()).toBe(422);
    }
  });

  it('should transform and return a valid payload', async () => {
    const payload = { name: 'John', age: '30' };

    const result = await pipe.transform(payload, {
      type: 'body',
      metatype: TestDto,
    });

    expect(result).toEqual({ name: 'John', age: 30 });
    expect(result).toBeInstanceOf(TestDto);
  });
});
