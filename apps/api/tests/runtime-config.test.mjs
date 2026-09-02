import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readRuntimeConfig } from '../dist/runtime-config.js';

const valid = {
  PRISMA_DIRECT_TCP_URL: 'postgresql://user:password@db.example.test:5432/jaryan',
  PORT: '3019',
  HOST: '127.0.0.1',
};

test('runtime configuration accepts explicit PostgreSQL TCP settings', () => {
  assert.deepEqual(readRuntimeConfig(valid), {
    host: '127.0.0.1',
    port: 3019,
    prismaDirectTcpUrl: valid.PRISMA_DIRECT_TCP_URL,
  });
});

test('runtime configuration rejects invalid values without exposing secrets', () => {
  for (const environment of [
    {},
    { PRISMA_DIRECT_TCP_URL: 'sqlite://local' },
    { PRISMA_DIRECT_TCP_URL: valid.PRISMA_DIRECT_TCP_URL, PORT: '0' },
    { PRISMA_DIRECT_TCP_URL: valid.PRISMA_DIRECT_TCP_URL, HOST: ' ' },
  ]) {
    assert.throws(() => readRuntimeConfig(environment), (error) => {
      assert.doesNotMatch(error.message, /password|db\.example/i);
      return true;
    });
  }
});
