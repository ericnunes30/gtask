import { ValidationError } from 'class-validator';
import { formatValidationErrors } from './validation-error.formatter';

describe('formatValidationErrors', () => {
  it('should map a ValidationError with constraints to { field, errors }', () => {
    const error = {
      property: 'email',
      constraints: {
        isEmail: 'email must be a valid email',
        isNotEmpty: 'email should not be empty',
      },
    } as ValidationError;

    const result = formatValidationErrors([error]);

    expect(result).toEqual([
      {
        field: 'email',
        errors: ['email must be a valid email', 'email should not be empty'],
      },
    ]);
  });

  it('should return an empty errors array when constraints is undefined', () => {
    const error = {
      property: 'name',
      constraints: undefined,
    } as ValidationError;

    const result = formatValidationErrors([error]);

    expect(result).toEqual([{ field: 'name', errors: [] }]);
  });

  it('should map multiple validation errors preserving order', () => {
    const errors = [
      { property: 'email', constraints: { isEmail: 'invalid email' } },
      { property: 'age', constraints: { min: 'too young' } },
    ] as ValidationError[];

    const result = formatValidationErrors(errors);

    expect(result).toEqual([
      { field: 'email', errors: ['invalid email'] },
      { field: 'age', errors: ['too young'] },
    ]);
  });
});
