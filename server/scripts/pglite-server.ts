/**
 * Local Postgres for offline development and tests: PGlite (Postgres in WASM) behind the wire
 * protocol, so Prisma connects like to any server. Data is in-memory unless --data <dir> is given.
 *
 *   npm run db:local -w server        # 127.0.0.1:5439
 *   DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5439/postgres?sslmode=disable&connection_limit=1&pgbouncer=true"
 */
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const port = Number(arg('port') ?? 5439);
const db = await PGlite.create(arg('data') ?? 'memory://');
// PGlite is a single session; the server multiplexes client connections over it.
const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 10 });
await server.start();
console.log(`PGlite listening on 127.0.0.1:${port}`);

const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
