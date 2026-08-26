import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { PrismaPostgresAdapter } from '@prisma/adapter-ppg';

const apiDirectory = fileURLToPath(new URL('../', import.meta.url));
const port = 3017;
const ids = {
  user: '00000000-0000-4000-8000-000000000001',
  session: '00000000-0000-4000-8000-000000000002',
  projectA: '00000000-0000-4000-8000-000000000003',
  projectB: '00000000-0000-4000-8000-000000000004',
};

test('release path proves authenticated project isolation and exact evidence retrieval', async () => {
  const connectionString = process.env.PRISMA_DIRECT_TCP_URL;
  assert.match(
    connectionString ?? '',
    /^postgres(?:ql)?:\/\//,
    'PRISMA_DIRECT_TCP_URL must be an explicit PostgreSQL TCP URL',
  );

  const prisma = new PrismaClient({
    adapter: new PrismaPostgresAdapter({ connectionString }),
  });
  const api = spawn(
    process.execPath,
    ['dist/main.js'],
    {
      cwd: apiDirectory,
      env: {
        ...process.env,
        PRISMA_DIRECT_TCP_URL: connectionString,
        PORT: String(port),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  try {
    await prisma.durableCalculationSnapshot.deleteMany({
      where: { projectId: { in: [ids.projectA, ids.projectB] } },
    });
    await prisma.session.deleteMany({ where: { id: ids.session } });
    await prisma.projectMember.deleteMany({
      where: { projectId: { in: [ids.projectA, ids.projectB] } },
    });
    await prisma.project.deleteMany({
      where: { id: { in: [ids.projectA, ids.projectB] } },
    });
    await prisma.user.deleteMany({ where: { id: ids.user } });

    await prisma.user.create({
      data: {
        id: ids.user,
        email: 'release-e2e@example.invalid',
        passwordHash: 'release-e2e-fixture',
        name: 'Release E2E Fixture',
      },
    });
    await prisma.session.create({
      data: {
        id: ids.session,
        userId: ids.user,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    await prisma.project.createMany({
      data: [
        { id: ids.projectA, name: 'Release E2E Project A' },
        { id: ids.projectB, name: 'Release E2E Project B' },
      ],
    });
    await prisma.projectMember.create({
      data: { projectId: ids.projectA, userId: ids.user, role: 'OWNER' },
    });

    await waitForHealth(api);
    const cookie = `jaryan_session=${ids.session}`;

    const unauthenticated = await request(
      `/projects/${ids.projectA}/access`,
    );
    assert.equal(unauthenticated.status, 401);

    const authorized = await request(
      `/projects/${ids.projectA}/access`,
      { cookie },
    );
    assert.equal(authorized.status, 200);
    assert.deepEqual(authorized.body, {
      projectId: ids.projectA,
      userId: ids.user,
      membershipRole: 'OWNER',
    });

    const unauthorizedProject = await request(
      `/projects/${ids.projectB}/access`,
      { cookie },
    );
    assert.equal(unauthorizedProject.status, 403);

    const execution = await request(
      `/projects/${ids.projectA}/calculations/superadobe`,
      {
        method: 'POST',
        cookie,
        body: {
          innerDiameterM: 6,
          wallThicknessM: 0.4,
          bagWidthM: 0.4,
          rowHeightM: 0.2,
          domeHeightM: 3,
          geometryType: 'circular',
          compactedDensityKgM3: 1800,
        },
      },
    );
    assert.equal(execution.status, 201);
    assert.equal(execution.body.status, 'COMPLETED');
    assert.ok(execution.body.snapshotBindings.length > 0);

    const binding = execution.body.snapshotBindings[0];
    const persisted = await prisma.durableCalculationSnapshot.findUnique({
      where: { snapshotId: binding.snapshotId },
    });
    assert.equal(persisted?.projectId, ids.projectA);
    assert.equal(persisted?.snapshotId, binding.snapshotId);

    const historical = await request(
      `/projects/${ids.projectA}/calculations/${binding.calculationIdentity.id}/evidence/${binding.snapshotId}`,
      { cookie },
    );
    assert.equal(historical.status, 200);
    assert.equal(historical.body.status, 'RESOLVED');
    assert.equal(
      historical.body.snapshot.snapshotId,
      binding.snapshotId,
    );
    assert.ok(historical.body.reconstruction);

    const wrongProjectEvidence = await request(
      `/projects/${ids.projectB}/calculations/${binding.calculationIdentity.id}/evidence/${binding.snapshotId}`,
      { cookie },
    );
    assert.equal(wrongProjectEvidence.status, 403);

    const wrongCalculation = await request(
      `/projects/${ids.projectA}/calculations/not-the-bound-calculation/evidence/${binding.snapshotId}`,
      { cookie },
    );
    assert.equal(wrongCalculation.status, 404);

    const wrongSnapshot = await request(
      `/projects/${ids.projectA}/calculations/${binding.calculationIdentity.id}/evidence/00000000-0000-4000-8000-000000000099`,
      { cookie },
    );
    assert.equal(wrongSnapshot.status, 404);
  } finally {
    api.kill();
    await prisma.durableCalculationSnapshot.deleteMany({
      where: { projectId: { in: [ids.projectA, ids.projectB] } },
    });
    await prisma.session.deleteMany({ where: { id: ids.session } });
    await prisma.projectMember.deleteMany({
      where: { projectId: { in: [ids.projectA, ids.projectB] } },
    });
    await prisma.project.deleteMany({
      where: { id: { in: [ids.projectA, ids.projectB] } },
    });
    await prisma.user.deleteMany({ where: { id: ids.user } });
    await prisma.$disconnect();
  }
});

async function waitForHealth(api) {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch {
      // The API is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  api.kill();
  throw new Error('API did not become healthy within 15 seconds.');
}

async function request(path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.cookie ? { cookie: options.cookie } : {}),
      ...(options.body ? { 'content-type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text.length === 0 ? null : JSON.parse(text),
  };
}
