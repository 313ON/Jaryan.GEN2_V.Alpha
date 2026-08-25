import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RuntimeSecurityError,
  RuntimeSecurityService,
} from '../src/runtime-security.ts';

const setup = ({
  sessions = new Map(),
  users = new Map(),
  projects = new Map(),
  memberships = new Map(),
} = {}) => new RuntimeSecurityService({
  sessions: { findById: async (id) => sessions.get(id) ?? null },
  users: { findById: async (id) => users.get(id) ?? null },
  projects: { findById: async (id) => projects.get(id) ?? null },
  memberships: {
    findByProjectAndUser: async (projectId, userId) =>
      memberships.get(`${projectId}:${userId}`) ?? null,
  },
});

const session = (id, userId, expiresAt = new Date(Date.now() + 60_000)) => ({
  id,
  userId,
  expiresAt,
});

test('missing, expired, and orphaned sessions have explicit failure states', async () => {
  const service = setup({
    sessions: new Map([
      ['expired', session('expired', 'user-1', new Date(Date.now() - 1))],
      ['orphan', session('orphan', 'missing-user')],
    ]),
    users: new Map([['user-1', { id: 'user-1' }]]),
  });

  await assert.rejects(
    service.authenticate(null),
    (error) => error instanceof RuntimeSecurityError && error.code === 'UNAUTHENTICATED',
  );
  await assert.rejects(
    service.authenticate('expired'),
    (error) => error instanceof RuntimeSecurityError && error.code === 'INVALID_SESSION',
  );
  await assert.rejects(
    service.authenticate('orphan'),
    (error) => error instanceof RuntimeSecurityError && error.code === 'INVALID_SESSION',
  );
});

test('authenticated membership produces an immutable authorized context', async () => {
  const service = setup({
    sessions: new Map([['session-a', session('session-a', 'user-a')]]),
    users: new Map([['user-a', { id: 'user-a' }]]),
    projects: new Map([
      ['project-a', { id: 'project-a' }],
      ['project-b', { id: 'project-b' }],
    ]),
    memberships: new Map([
      ['project-a:user-a', {
        projectId: 'project-a',
        userId: 'user-a',
        role: 'EDITOR',
      }],
    ]),
  });

  const context = await service.authorize('session-a', 'project-a');
  assert.deepEqual(context, {
    projectId: 'project-a',
    principal: { userId: 'user-a' },
    membershipRole: 'EDITOR',
  });
  assert.equal(Object.isFrozen(context), true);
  assert.equal(Object.isFrozen(context.principal), true);
});

test('project existence and membership are enforced against authenticated identity', async () => {
  const service = setup({
    sessions: new Map([['session-a', session('session-a', 'user-a')]]),
    users: new Map([['user-a', { id: 'user-a' }]]),
    projects: new Map([
      ['project-a', { id: 'project-a' }],
      ['project-b', { id: 'project-b' }],
    ]),
    memberships: new Map([
      ['project-a:user-a', {
        projectId: 'project-a',
        userId: 'user-a',
        role: 'OWNER',
      }],
    ]),
  });

  await assert.rejects(
    service.authorize('session-a', 'project-missing'),
    (error) => error.code === 'PROJECT_NOT_FOUND',
  );
  await assert.rejects(
    service.authorize('session-a', 'project-b'),
    (error) => error.code === 'PROJECT_ACCESS_DENIED',
  );
});

test('a member of project A cannot authorize project B', async () => {
  const service = setup({
    sessions: new Map([['session-a', session('session-a', 'user-a')]]),
    users: new Map([['user-a', { id: 'user-a' }]]),
    projects: new Map([
      ['project-a', { id: 'project-a' }],
      ['project-b', { id: 'project-b' }],
    ]),
    memberships: new Map([
      ['project-a:user-a', {
        projectId: 'project-a',
        userId: 'user-a',
        role: 'VIEW_ONLY',
      }],
    ]),
  });

  await assert.rejects(
    service.authorize('session-a', 'project-b'),
    (error) => error.code === 'PROJECT_ACCESS_DENIED',
  );
});

for (const role of ['OWNER', 'EDITOR', 'VIEW_ONLY']) {
  test(`${role} membership is preserved in authorized context`, async () => {
    const service = setup({
      sessions: new Map([['s', session('s', 'u')]]),
      users: new Map([['u', { id: 'u' }]]),
      projects: new Map([['p', { id: 'p' }]]),
      memberships: new Map([['p:u', { projectId: 'p', userId: 'u', role }]]),
    });
    assert.equal((await service.authorize('s', 'p')).membershipRole, role);
  });
}
