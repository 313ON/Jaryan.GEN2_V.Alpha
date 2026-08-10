export type ProjectRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface ProjectContext {
  readonly projectId: string;
  readonly userId: string;
  readonly role: ProjectRole;
}

export interface ProjectScopedEntity {
  readonly id: string;
  readonly projectId: string;
}

export interface IRepository<T extends ProjectScopedEntity> {
  findById(id: string, context: ProjectContext): Promise<T | null>;
  findAll(context: ProjectContext): Promise<T[]>;
  save(entity: T, context: ProjectContext): Promise<T>;
  delete(id: string, context: ProjectContext): Promise<boolean>;
}