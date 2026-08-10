import { InMemoryRepository } from '../../src/infrastructure/memory/in-memory-repository';
import { ProjectContext } from '../../src/domain/shared/repository';

interface TestEntity {
  id: string;
  projectId: string;
  name: string;
}

describe('IRepository contracts', () => {
  let repository: InMemoryRepository<TestEntity>;
  let context: ProjectContext;

  beforeEach(() => {
    repository = new InMemoryRepository<TestEntity>();
    context = { projectId: 'proj_1', userId: 'user_1', role: 'OWNER' };
  });

  it('findById returns only entities from the requested project', async () => {
    const entity1 = { id: '1', projectId: 'proj_1', name: 'Entity1' };
    const entity2 = { id: '2', projectId: 'proj_2', name: 'Entity2' };
    
    await repository.save(entity1, context);
    await repository.save(entity2, { projectId: 'proj_2', userId: 'user_2', role: 'OWNER' });
    
    const result = await repository.findById('1', context);
    expect(result).toEqual(entity1);
    expect(result?.projectId).toBe('proj_1');
  });

  it('findAll returns only entities from the requested project', async () => {
    const entity1 = { id: '1', projectId: 'proj_1', name: 'Entity1' };
    const entity2 = { id: '2', projectId: 'proj_2', name: 'Entity2' };
    
    await repository.save(entity1, context);
    await repository.save(entity2, { projectId: 'proj_2', userId: 'user_2', role: 'OWNER' });
    
    const results = await repository.findAll(context);
    expect(results).toHaveLength(1);
    expect(results[0].projectId).toBe('proj_1');
  });

  it('saving an entity for another project throws', async () => {
    const entity = { id: '1', projectId: 'proj_2', name: 'Entity' };
    
    await expect(repository.save(entity, context)).rejects.toThrow('different project');
  });

  it('VIEWER cannot save', async () => {
    const viewerContext = { projectId: 'proj_1', userId: 'user_1', role: 'VIEWER' as const };
    const entity = { id: '1', projectId: 'proj_1', name: 'Entity' };
    
    await expect(repository.save(entity, viewerContext)).rejects.toThrow('permission');
  });

  it('EDITOR can save', async () => {
    const editorContext = { projectId: 'proj_1', userId: 'user_1', role: 'EDITOR' as const };
    const entity = { id: '1', projectId: 'proj_1', name: 'Entity' };
    
    await expect(repository.save(entity, editorContext)).resolves.toEqual(entity);
  });

  it('VIEWER cannot delete', async () => {
    const viewerContext = { projectId: 'proj_1', userId: 'user_1', role: 'VIEWER' as const };
    
    await expect(repository.delete('1', viewerContext)).rejects.toThrow('permission');
  });

  it('EDITOR cannot delete', async () => {
    const editorContext = { projectId: 'proj_1', userId: 'user_1', role: 'EDITOR' as const };
    
    await expect(repository.delete('1', editorContext)).rejects.toThrow('permission');
  });

  it('OWNER can delete', async () => {
    const entity = { id: '1', projectId: 'proj_1', name: 'Entity' };
    await repository.save(entity, context);
    
    const result = await repository.delete('1', context);
    expect(result).toBe(true);
  });

  it('findById returns Promise<T | null>', async () => {
    const entity = { id: '1', projectId: 'proj_1', name: 'Entity' };
    await repository.save(entity, context);
    
    const result = await repository.findById('1', context);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('1');
  });

  it('no cross-project data leakage', async () => {
    const entity1 = { id: '1', projectId: 'proj_1', name: 'Entity1' };
    const entity2 = { id: '2', projectId: 'proj_2', name: 'Entity2' };
    
    await repository.save(entity1, context);
    await repository.save(entity2, { projectId: 'proj_2', userId: 'user_2', role: 'OWNER' });
    
    const leakedResult = await repository.findById('2', context);
    expect(leakedResult).toBeNull();
    
    const leakedList = await repository.findAll({ projectId: 'proj_2', userId: 'user_2', role: 'OWNER' });
    expect(leakedList).toHaveLength(1);
    expect(leakedList[0].projectId).toBe('proj_2');
  });
});