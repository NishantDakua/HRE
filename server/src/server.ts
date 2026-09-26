import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { clerkMiddleware } from '@clerk/express';

dotenv.config();

const app: Express = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(clerkMiddleware());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3100',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import homeRoutes from './routes/home.js';
import newsletterRoutes from './routes/newsletter.js';
import exchangeRoutes from './routes/exchange.js';

app.use('/api/auth', authRoutes);
app.use('/api', exchangeRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/newsletter', newsletterRoutes);

app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(error);
  console.error(error);
  res.status(500).json({ error: 'Request failed' });
});

const start = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✓ Database connected');

    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

start();

export { app, prisma };
