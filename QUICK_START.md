# Quick Start Guide - Clerk + pnpm Setup

## ⚡ TL;DR

```bash
# 1. Dependencies already installed via pnpm
pnpm install

# 2. Ensure Clerk keys are in environment
# server/.env and client/.env already configured with your Neon credentials

# 3. Start development
pnpm dev
# Browser opens to http://localhost:5174
```

## 🔑 Clerk Setup (Required One-Time)

1. **Create Clerk Account**
   - Go to https://dashboard.clerk.com
   - Sign up or log in

2. **Create Application**
   - Click "Create application"
   - Choose authentication method (Email, Google, etc.)
   - Application name: "HRE" (or your preference)

3. **Get API Keys**
   - In Clerk dashboard, go to "API Keys"
   - Copy "Publishable Key" and "Secret Key"

4. **Update Environment Files**
   ```bash
   # server/.env (already configured, but verify)
   CLERK_SECRET_KEY=sk_test_... (from Clerk dashboard)
   
   # client/.env (already configured, but verify)
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_... (from Clerk dashboard)
   ```

5. **Configure Redirect URLs** (in Clerk Dashboard)
   - Go to Settings → Redirects
   - Add:
     - http://localhost:5174 (development)
     - http://localhost:5174/onboarding (onboarding page)

## 🚀 Start Development

```bash
# Option 1: Start both client & server (recommended)
pnpm dev
# - Client: http://localhost:5174
# - Server: http://localhost:5000

# Option 2: Start them separately
pnpm dev:client      # Terminal 1: http://localhost:5174
pnpm dev:server      # Terminal 2: http://localhost:5000
```

## 📝 First Time User Flow

1. Open http://localhost:5174
2. Click "Get Started"
3. Clerk sign-up form appears
4. Sign up with email (or social login if enabled)
5. Clerk redirects back to app
6. App shows Onboarding page:
   - Select role: Seeker / Provider / Both
   - Fill business info: name, type, location, phone
7. Click "Complete Onboarding"
8. Redirected to Dashboard

## 🔐 Already Authenticated?

Your credentials:
- **Neon Database**: Connected (DATABASE_URL in server/.env)
- **Clerk Keys**: Configured (check .env files)
- **Backend Auth**: Running on http://localhost:5000

## 📚 Learn More

- **Full Documentation**: See `CLERK_IMPLEMENTATION.md`
- **Clerk Docs**: https://clerk.com/docs
- **pnpm Workspaces**: https://pnpm.io/workspaces

## ❓ Troubleshooting

### "Missing VITE_CLERK_PUBLISHABLE_KEY"
- Check client/.env has the key
- Key must start with `pk_test_` or `pk_live_`

### "Unauthorized" on dashboard
- Make sure you've completed onboarding
- Check browser console for auth errors
- Verify Clerk keys in environment files

### Database connection failed
- Check DATABASE_URL in server/.env
- Verify Neon database is online
- Ports 54329 (old Postgres) might be running - that's okay

### npm vs pnpm
- **DO NOT use**: `npm install`, `npm run dev`
- **DO use**: `pnpm install`, `pnpm dev`
- The project is now pnpm-only

## 🎯 Next Steps

After first test:
1. Create a test account via Clerk
2. Complete onboarding
3. Verify dashboard loads
4. Check database: business should be created
5. Explore marketplace and features

Then:
- Update LoginPage/RegisterPage to use Clerk components
- Add onboarding redirect guards to protected routes  
- Test provider-specific features
- Review `CLAUDE.md` for architecture notes

---

**Status**: ✅ Ready to develop
**Last Updated**: 2026-09-26
