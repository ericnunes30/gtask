import { Repository, In, FindOptionsWhere } from 'typeorm';

export async function validateEntityIds<T extends { id: number }>(
  repository: Repository<T>,
  ids: number[],
  errorFactory: (missingIds: number[]) => Error,
): Promise<T[]> {
  const entities = await repository.find({
    where: { id: In(ids) } as FindOptionsWhere<T>,
  });

  const foundIds = new Set(entities.map((e) => e.id));
  const missingIds = ids.filter((id) => !foundIds.has(id));

  if (missingIds.length > 0) {
    throw errorFactory(missingIds);
  }

  return entities;
}
