// First import: loads server/.env before any module reads process.env (ESM evaluates imports first).
import 'dotenv/config';
import express, { Express } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from './exchange/db.js';
import { authMode, withClerk } from './exchange/actor.js';

const app: Express = express();
const PORT = Number(process.env.PORT || 5000);
const isDev = process.env.NODE_ENV !== 'production';

// Browser origins: CLIENT_URL (comma-separated) plus, in development, any localhost port —
// the client may run on 3100, 3101, … (dev traffic normally arrives via the Vite proxy anyway).
const allowed = (process.env.CLIENT_URL || 'http://localhost:3100').split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || allowed.includes(origin) || (isDev && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))),
    credentials: true,
  })
);
app.use(withClerk);
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/uploads', express.static(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads')));

/** Liveness + dependencies: { ok, db, auth }. `ok` is false when the database is unreachable; auth is 'off' without Clerk keys. */
app.get('/api/health', async (_req, res) => {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    db = false;
  }
  res.status(db ? 200 : 503).json({ ok: db, db, auth: authMode() });
});

// API Routes
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import homeRoutes from './routes/home.js';
import newsletterRoutes from './routes/newsletter.js';
import exchangeRoutes from './routes/exchange.js';
import contractRoutes from './routes/contracts.js';
import meRoutes from './routes/me.js';

app.use('/api/auth', authRoutes);
app.use('/api', meRoutes);
app.use('/api', exchangeRoutes);
app.use('/api', contractRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/newsletter', newsletterRoutes);

// Unknown API paths get JSON, not Express's HTML 404.
app.use('/api', (req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}`, code: 'NOT_FOUND' }));

app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(error);
  console.error(error);
  res.status(500).json({ error: isDev && error instanceof Error ? error.message : 'Request failed' });
});

async function start() {
  // Listen even if the database is down, so /api/health can say so instead of the proxy failing.
  try {
    await prisma.$connect();
    console.log('✓ Database connected');
  } catch (error) {
    console.error('✗ Database unreachable — check DATABASE_URL in server/.env', error instanceof Error ? error.message : error);
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API ready on :${PORT} (auth: ${authMode()})`);
  });
}

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

start();

export { app, prisma };
