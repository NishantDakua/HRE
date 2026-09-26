# HRE Setup Guide

This guide will help you get the entire HRE application running locally.

## Prerequisites

1. **Node.js 18 or higher**
   ```bash
   node --version  # Should show v18.0.0 or higher
   ```

2. **npm or yarn**
   ```bash
   npm --version
   ```

3. **PostgreSQL via Neon**
   - Create a free account at https://console.neon.tech
   - Create a new project
   - Copy your database connection strings (regular and pooled)

4. **Git**
   ```bash
   git --version
   ```

## Step 1: Get Database URLs

From Neon:
1. Go to https://console.neon.tech
2. Create or select a project
3. Copy the connection string:
   - **DATABASE_URL** (regular): `postgresql://user:password@host/dbname`
   - **DATABASE_URL_POOLED** (pooled): `postgresql://user:password@host/dbname?sslmode=require`

## Step 2: Configure Environment Variables

### Server Configuration

Create `server/.env`:

```bash
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
DATABASE_URL_POOLED="postgresql://user:password@host/dbname?sslmode=require"
JWT_SECRET="your-secret-key-change-me"
NODE_ENV="development"
PORT=5000
FRONTEND_URL="http://localhost:5173"
```

### Client Configuration

Create `client/.env.local`:

```bash
VITE_API_URL="http://localhost:5000/api"
```

## Step 3: Install Dependencies

```bash
# Install root dependencies
npm install

# This automatically installs dependencies for both client and server (monorepo)
```

## Step 4: Set Up Database

### Initialize the database schema:

```bash
# Generate Prisma client
npm run prisma:generate -w server

# Create tables in the database
npm run prisma:push -w server

# (Optional) Seed demo data
npm run prisma:seed -w server
```

**Note:** If you've already run `prisma:push`, you can just run:
```bash
npm run prisma:seed -w server
```

### Verify Database Connection

```bash
npm run prisma:generate -w server
```

If this succeeds, your database connection is working.

## Step 5: Start Development Servers

Open two terminals:

### Terminal 1: Backend Server
```bash
npm run dev -w server
```

You should see:
```
✓ Database connected
✓ Server running on http://localhost:5000
```

### Terminal 2: Frontend Server
```bash
npm run dev -w client
```

You should see:
```
  Local:   http://localhost:5173/
```

Alternatively, run both in one terminal:
```bash
npm run dev
```

## Step 6: Access the Application

1. Open browser: **http://localhost:5173**
2. You should see the HRE landing page

## Demo Login

### Pre-loaded Demo Account:
- **Email:** `buyer@hotelsunrise.com`
- **Password:** `demo123`
- **Business:** Hotel Sunrise

### How to Login:
1. Click "Login" in the navbar
2. Enter demo credentials
3. You'll be taken to the dashboard

Or click "Demo Buyer Account" button on the login page for quick fill.

## Troubleshooting

### "Database connection failed"
- Check `DATABASE_URL` in `server/.env`
- Verify Neon database is running
- Test connection: `npm run prisma:generate -w server`

### "Port 5000 already in use"
- Change `PORT` in `server/.env` to another port (e.g., 5001)
- Update FRONTEND_URL to match

### "Port 5173 already in use"
- Vite will automatically use the next available port
- Check your browser console for the actual URL

### "Cannot find module" errors
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Clear build cache: `rm -rf client/dist server/dist`

### "Prisma client not found"
```bash
npm run prisma:generate -w server
```

### Database schema is out of sync
```bash
# Push the latest schema
npm run prisma:push -w server

# Seed demo data
npm run prisma:seed -w server
```

## Key Project Commands

```bash
# Development
npm run dev                    # Run both frontend and backend
npm run dev -w client          # Run only frontend
npm run dev -w server          # Run only backend

# Building
npm run build                  # Build both
npm run build -w client        # Build only frontend
npm run build -w server        # Build only backend

# Type checking
npm run type-check             # Check all types

# Database
npm run prisma:generate -w server    # Generate Prisma client
npm run prisma:push -w server        # Push schema to DB
npm run prisma:seed -w server        # Seed demo data
npm run prisma:migrate -w server     # Create migration
```

## Project Structure

```
hre/
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/              # Reusable components
│   │   ├── pages/                   # Page components
│   │   │   ├── public/              # Public pages
│   │   │   ├── auth/                # Authenticated pages
│   │   │   └── provider/            # Provider pages
│   │   ├── layouts/                 # Layout components
│   │   ├── services/                # API services
│   │   ├── stores/                  # Zustand stores
│   │   ├── types/                   # TypeScript types
│   │   ├── App.tsx                  # Main app
│   │   ├── main.tsx                 # Entry point
│   │   └── index.css                # Global styles
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.ts
│
├── server/                          # Express backend
│   ├── src/
│   │   ├── routes/                  # API routes
│   │   ├── controllers/             # Business logic (optional)
│   │   ├── middleware/              # Express middleware
│   │   └── server.ts                # Main server file
│   ├── prisma/
│   │   ├── schema.prisma            # Database schema
│   │   └── seed.ts                  # Demo data seeding
│   ├── .env                         # Environment variables
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── package.json                     # Root workspace
├── README.md
├── SETUP.md
└── .gitignore
```

## Next Steps After Setup

1. **Explore the Landing Page**
   - Browse the homepage
   - Check out "How It Works" section
   - View marketplace resources

2. **Login to Dashboard**
   - Use demo account
   - See dashboard statistics
   - Navigate authenticated pages

3. **Test Core Features**
   - View marketplace
   - Browse providers
   - Check requirement posting (form structure)

4. **Extend the Application**
   - Implement additional API routes
   - Build out full page features
   - Add more seed data
   - Implement WebSocket for real-time features

## Important Notes

### Security
- Never commit `.env` files
- Never hardcode API keys
- Change `JWT_SECRET` in production
- Always validate on the server side

### Database
- The schema is comprehensive and ready for production
- All tables have proper relationships
- Seed data includes multiple providers and resources
- Do NOT run `prisma migrate reset` (it drops all data)

### Performance
- Frontend uses React Query for caching
- API routes should implement pagination
- Add database indexes as needed
- Implement rate limiting in production

## Support

If you encounter issues:
1. Check this troubleshooting section
2. Review error messages in console
3. Verify all environment variables
4. Check database connection

## What's Built

✅ Complete landing page with hero, categories, and "One Requirement → Multiple Providers" section
✅ Login/auth pages
✅ Basic marketplace page with resource cards
✅ Dashboard layout and structure
✅ Complete Prisma schema with all models
✅ Seed data with 6 businesses and multiple resources
✅ Demo accounts ready to use
✅ API routes structure
✅ Frontend routing
✅ Component scaffolding
✅ Tailwind CSS configuration
✅ TypeScript setup

## What Needs Development

Pages to complete:
- Full marketplace with filters
- Resource detail pages
- Requirement posting flow
- Matching results display
- Negotiation interface
- Booking confirmation
- Fulfillment tracking
- Analytics dashboard
- Provider dashboard
- And more...

Backend features to add:
- Full CRUD for all resources
- Matching algorithm implementation
- Negotiation workflow
- Booking transaction logic
- Payment status management
- Notification system
- Authentication middleware
- Error handling
- Input validation
- Rate limiting

Get started and happy coding! 🚀
