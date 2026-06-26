import { In } from 'typeorm';
import {
  validateEntityIds,
  EntityRepository,
} from './validate-entity-ids.helper';

type TestEntity = { id: number; name: string };

describe('validateEntityIds', () => {
  const createRepository = (
    entities: TestEntity[],
  ): EntityRepository<TestEntity> => ({
    find: jest
      .fn()
      .mockImplementation(
        ({ where }: { where: { id: ReturnType<typeof In> } }) => {
          const allowedIds = new Set(where.id.value);
          return Promise.resolve(
            entities.filter((entity) => allowedIds.has(entity.id)),
          );
        },
      ),
  });

  const buildError = (missingIds: number[]) =>
    new Error(`Missing entity IDs: ${missingIds.join(', ')}`);

  it('should return all entities when every ID exists', async () => {
    const entities: TestEntity[] = [
      { id: 1, name: 'One' },
      { id: 2, name: 'Two' },
    ];
    const repository = createRepository(entities);

    const result = await validateEntityIds(repository, [1, 2], buildError);

    expect(result).toEqual(entities);
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: In([1, 2]) }),
      }),
    );
  });

  it('should throw when some IDs are missing', async () => {
    const entities: TestEntity[] = [{ id: 1, name: 'One' }];
    const repository = createRepository(entities);

    await expect(
      validateEntityIds(repository, [1, 2, 3], buildError),
    ).rejects.toThrow('Missing entity IDs: 2, 3');
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: In([1, 2, 3]) }),
      }),
    );
  });

  it('should return an empty array when no IDs are provided', async () => {
    const repository = createRepository([]);

    const result = await validateEntityIds(repository, [], buildError);

    expect(result).toEqual([]);
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('should deduplicate IDs before querying', async () => {
    const entities: TestEntity[] = [{ id: 1, name: 'One' }];
    const repository = createRepository(entities);

    const result = await validateEntityIds(repository, [1, 1, 1], buildError);

    expect(result).toEqual([{ id: 1, name: 'One' }]);
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: In([1]) }),
      }),
    );
  });
});
