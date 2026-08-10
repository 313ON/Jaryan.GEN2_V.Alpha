import { ProjectContext, ProjectRole } from './repository';

/**
 * Validates that the user has permission to perform the specified action
 * @param context The project context
 * @param action The action to check (save, delete)
 * @returns True if the user has permission
 */
export function hasPermission(context: ProjectContext, action: 'save' | 'delete'): boolean {
  switch (action) {
    case 'save':
      return context.role === 'OWNER' || context.role === 'EDITOR';
    case 'delete':
      return context.role === 'OWNER';
    default:
      return false;
  }
}

/**
 * Validates that the entity belongs to the project specified in the context
 * @param entity The entity to check
 * @param context The project context
 * @returns True if the entity belongs to the project
 */
export function belongsToProject<T extends { projectId: string }>(entity: T, context: ProjectContext): boolean {
  return entity.projectId === context.projectId;
}