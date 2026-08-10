import { InMemoryRepository } from '../../src/infrastructure/memory/in-memory-repository';
import { ProjectContext } from '../../src/domain/shared/repository';

interface TestEntity {
  id: string;
  projectId: string;
  name: string;
}

describe('InMemoryRepository', () => {
  let repository: InMemoryRepository<TestEntity>;
  const ownerContext: ProjectContext = { projectId: 'proj_1', userId: 'user_1', role: 'OWNER' };
  const editorContext: ProjectContext = { projectId: 'proj_1', userId: 'user_2', role: 'EDITOR' };
  const viewerContext: ProjectContext = { projectId: 'proj_1', userId: 'user_3', role: 'VIEWER' };
  const otherProjectContext: ProjectContext = { projectId: 'proj_2', userId: 'user_1', role: 'OWNER' };

  beforeEach(() => {
    repository = new InMemoryRepository<TestEntity>();
  });

  describe('findById', () => {
    it('returns entity from same project', async () => {
      const entity = { id: '1', projectId: 'proj_1', name: 'Entity' };
      await repository.save(entity, ownerContext);
      
      const result = await repository.findById('1', ownerContext);
      expect(result).toEqual(entity);
    });

    it('returns null for different project', async () => {
      const entity = { id: '1', projectId: 'proj_1', name: 'Entity' };
      await repository.save(entity, ownerContext);
      
      const result = await repository.findById('1', otherProjectContext);
      expect(result).toBeNull();
    });

    it('returns null for non-existent entity', async () => {
      const result = await repository.findById('nonexistent', ownerContext);
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns all entities from same project', async () => {
      const entities = [
        { id: '1', projectId: 'proj_1', name: 'Entity1' },
        { id: '2', projectId: 'proj_1', name: 'Entity2' },
      ];
      await Promise.all(entities.map(e => repository.save(e, ownerContext)));
      
      const results = await repository.findAll(ownerContext);
      expect(results).toHaveLength(2);
    });

    it('returns empty array for different project', async () => {
      const entity = { id: '1', projectId: 'proj_1', name: 'Entity' };
      await repository.save(entity, ownerContext);
      
      const results = await repository.findAll(otherProjectContext);
      expect(results).toHaveLength(0);
    });
  });

  describe('save', () => {
    it('saves entity for same project as OWNER', async () => {
      const entity = { id: '1', projectId: 'proj_1', name: 'Entity' };
      const result = await repository.save(entity, ownerContext);
      expect(result).toEqual(entity);
    });

    it('saves entity for same project as EDITOR', async () => {
      const entity = { id: '1', projectId: 'proj_1', name: 'Entity' };
      const result = await repository.save(entity, editorContext);
      expect(result).toEqual(entity);
    });

    it('throws when saving entity for different project', async () => {
      const entity = { id: '1', projectId: 'proj_2', name: 'Entity' };
      await expect(repository.save(entity, ownerContext)).rejects.toThrow('different project');
    });
  });

  describe('delete', () => {
    it('deletes entity as OWNER', async () => {
      const entity = { id: '1', projectId: 'proj_1', name: 'Entity' };
      await repository.save(entity, ownerContext);
      
      const result = await repository.delete('1', ownerContext);
      expect(result).toBe(true);
      
      const found = await repository.findById('1', ownerContext);
      expect(found).toBeNull();
    });

    it('returns false when deleting non-existent entity', async () => {
      const result = await repository.delete('nonexistent', ownerContext);
      expect(result).toBe(false);
    });

    it('returns false when deleting entity from different project', async () => {
      const entity = { id: '1', projectId: 'proj_1', name: 'Entity' };
      await repository.save(entity, ownerContext);
      
      const result = await repository.delete('1', otherProjectContext);
      expect(result).toBe(false);
    });
  });

  describe('cross-project isolation', () => {
    it('entities from different projects are completely isolated', async () => {
      await repository.save({ id: '1', projectId: 'proj_1', name: 'Proj1Entity' }, ownerContext);
      await repository.save({ id: '2', projectId: 'proj_2', name: 'Proj2Entity' }, otherProjectContext);
      
      const proj1List = await repository.findAll(ownerContext);
      const proj2List = await repository.findAll(otherProjectContext);
      
      expect(proj1List).toHaveLength(1);
      expect(proj1List[0].name).toBe('Proj1Entity');
      expect(proj2List).toHaveLength(1);
      expect(proj2List[0].name).toBe('Proj2Entity');
    });

    it('does not leak data when querying with wrong project context', async () => {
      await repository.save({ id: '1', projectId: 'proj_1', name: 'Secret' }, ownerContext);
      
      const result = await repository.findById('1', otherProjectContext);
      expect(result).toBeNull();
    });
  });
});