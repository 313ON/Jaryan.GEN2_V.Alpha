export interface RuntimeConfig {
  readonly host: string;
  readonly port: number;
  readonly prismaDirectTcpUrl: string;
}

export function readRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeConfig {
  const connectionString = environment['PRISMA_DIRECT_TCP_URL'];
  if (!connectionString) {
    throw new Error(
      'PRISMA_DIRECT_TCP_URL must be set for the Prisma Postgres runtime adapter.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error('PRISMA_DIRECT_TCP_URL must be a valid PostgreSQL URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error(
      'PRISMA_DIRECT_TCP_URL must use the postgres:// or postgresql:// protocol.',
    );
  }
  if (!parsed.hostname || !parsed.pathname || parsed.pathname === '/') {
    throw new Error(
      'PRISMA_DIRECT_TCP_URL must include a PostgreSQL host and database name.',
    );
  }

  const portText = environment['PORT'] ?? '3001';
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const host = environment['HOST'] ?? '0.0.0.0';
  if (!host.trim()) {
    throw new Error('HOST must not be empty.');
  }

  return { host, port, prismaDirectTcpUrl: connectionString };
}
