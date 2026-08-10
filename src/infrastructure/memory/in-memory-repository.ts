import { ProjectContext, ProjectScopedEntity, IRepository } from '../domain/shared/repository';
import { ProjectRole } from '../domain/shared/repository';
import { injectable, inject } from 'inversify';

@injectable()
export class InMemoryRepository<T extends ProjectScopedEntity> implements IRepository<T> {
  private storage = new Map<string, T>();

  async findById(id: string, context: ProjectContext): Promise<T | null> {
    const entity = this.storage.get(id);
    if (!entity) return null;
    if (entity.projectId !== context.projectId) return null;
    return entity;
  }

  async findAll(context: ProjectContext): Promise<T[]> {
    return Array.from(this.storage.values()).filter((e) => e.projectId === context.projectId);
  }

  async save(entity: T, context: ProjectContext): Promise<T> {
    if (entity.projectId !== context.projectId) {
      throw new Error('Entity belongs to a different project');
    }
    this.storage.set(entity.id, entity);
    return entity;
  }

  async delete(id: string, context: ProjectContext): Promise<boolean> {
    const entity = this.storage.get(id);
    if (!entity || entity.projectId !== context.projectId) return false;
    this.storage.delete(id);
    return true;
  }
}