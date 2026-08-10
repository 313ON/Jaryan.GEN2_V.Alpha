/**
 * Repository interface with project scoping
 */
export interface IRepository<T extends ProjectScopedEntity> {
  findById(id: string, context: ProjectContext): Promise<T | null>;
  findAll(context: ProjectContext): Promise<T[]>;
  save(entity: T, context: ProjectContext): Promise<T>;
  delete(id: string, context: ProjectContext): Promise<boolean>;
}