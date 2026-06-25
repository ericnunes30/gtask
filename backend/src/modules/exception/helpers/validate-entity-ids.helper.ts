import { In, type Repository, type FindOptionsWhere } from 'typeorm';

export type EntityRepository<T extends { id: number }> = Pick<
  Repository<T>,
  'find'
>;

export type EntityIdErrorFactory = (missingIds: number[]) => Error;

export async function validateEntityIds<T extends { id: number }>(
  repository: EntityRepository<T>,
  ids: number[],
  buildError: EntityIdErrorFactory,
): Promise<T[]> {
  if (ids.length === 0) {
    return [];
  }

  const uniqueIds = [...new Set(ids)];
  const entities = await repository.find({
    where: { id: In(uniqueIds) } as FindOptionsWhere<T>,
  });

  const foundIds = new Set(entities.map((entity) => entity.id));
  const missingIds = uniqueIds.filter((id) => !foundIds.has(id));

  if (missingIds.length > 0) {
    throw buildError(missingIds);
  }

  return entities;
}
