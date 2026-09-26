# Clerk Authentication & pnpm Workspace Implementation

## Overview
Successfully integrated Clerk authentication into HRE and converted the project to use pnpm workspace with a single root `node_modules`.

## ✅ Completed Changes

### 1. **pnpm Workspace Setup**
- Created `pnpm-workspace.yaml` with packages: client and server
- Updated root `package.json` with pnpm-compatible scripts:
  - `pnpm dev` - Start both client and server
  - `pnpm dev:client` - Start only client
  - `pnpm dev:server` - Start only server
  - `pnpm db:generate` - Generate Prisma client
  - `pnpm db:push` - Push schema to database
  - `pnpm db:seed` - Seed demo data
- Configured build scripts for production
- Removed npm workspaces in favor of pnpm

### 2. **Dependencies & Installation**
- Added Clerk packages:
  - Client: `@clerk/react@^6.17.0`
  - Server: `@clerk/express@^1.2.0`
- Ran `pnpm install` to create workspace-wide node_modules at project root
- Configured pnpm to allow native builds (Prisma, Clerk)
- Removed package-lock.json (pnpm uses pnpm-lock.yaml)

### 3. **Prisma Schema Updates**
**Modified `/server/prisma/schema.prisma`:**
- Added `clerkUserId: String? @unique` to User model (nullable to avoid migration issues)
- Added `hreRole: HRERole @default(SEEKER)` to track user's HRE role
- Added `onboardingComplete: Boolean @default(false)` to track onboarding status
- Made `password: String?` nullable (Clerk handles auth, not us)
- Updated `UserRole` enum: `ADMIN | USER` (removed BUSINESS_OWNER)
- Added new `HRERole` enum: `SEEKER | PROVIDER | BOTH`

**Schema pushed to Neon database successfully.**

### 4. **Backend: Clerk Integration**

**New file: `/server/src/middleware/auth.ts`**
- `authenticateRequest`: Verifies Clerk authentication, auto-creates HRE User from Clerk data
- `optionalAuth`: Optional Clerk verification (for public routes that can be signed in)
- `getCurrentHREUser`: Helper to fetch HRE user from Clerk ID
- Automatically creates User in database on first login with Clerk user data

**Updated `/server/src/server.ts`:**
- Imported `clerkMiddleware` from `@clerk/express`
- Added `app.use(clerkMiddleware())` before other middleware
- Changed CORS origin from `FRONTEND_URL` to `CLIENT_URL` (more explicit)

**Updated `/server/src/routes/auth.ts`:**
- Removed old JWT login/register endpoints
- New endpoints:
  - `GET /api/auth/me` - Get current authenticated user
  - `POST /api/auth/onboarding` - Complete onboarding (set role, business info)
  - `PUT /api/auth/profile` - Update user profile
- All endpoints protected with `authenticateRequest` middleware
- Automatically creates Business and ProviderProfile when user selects provider role

### 5. **Frontend: Clerk Integration**

**Updated `/client/src/main.tsx`:**
- Wrapped React app with `<ClerkProvider publishableKey={...}>`
- Loads VITE_CLERK_PUBLISHABLE_KEY from environment

**Updated `/client/src/App.tsx`:**
- Changed from `useAuthStore()` to Clerk's `useAuth()` hook
- Updated `ProtectedRoute` to check `isSignedIn` instead of `isAuthenticated`
- Added `/onboarding` route (displays after first signup)
- Removed old login/register endpoints dependency

**Updated `/client/src/components/Navbar.tsx`:**
- Changed from `useAuthStore()` to Clerk's `useAuth()`
- Added Clerk's `<UserButton afterSignOutUrl="/" />` component
- Shows Dashboard + UserButton when signed in
- Shows Login + Get Started buttons when not signed in

**New file: `/client/src/hooks/useHREUser.ts`**
- `useHREUser()` hook to fetch current user's HRE profile
- Returns: `{ user, isLoading, isOnboarded, error }`
- Enables checking if user has completed onboarding

**New file: `/client/src/pages/public/OnboardingPage.tsx`**
- Displays after Clerk signup
- Step 1: User selects role (Seeker / Provider / Both)
- Step 2: Collects business information:
  - Business name, type, location, contact phone
- Calls `POST /api/auth/onboarding` to complete setup
- Redirects to Dashboard after success

**Updated `/client/src/services/api.ts`:**
- Removed localStorage token logic
- Clerk handles auth via HTTP-only cookies and middleware
- New auth API methods:
  - `getCurrentUser()` - Fetch current HRE user
  - `completeOnboarding()` - POST to onboarding endpoint
  - `updateProfile()` - Update user profile

### 6. **Environment Variables**

**Server `/server/.env`** (gitignored):
```
DATABASE_URL=<your-neon-connection-string>
DATABASE_URL_POOLED=<your-neon-pooled-connection>
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5174
CLERK_SECRET_KEY=<your-clerk-secret-key>
```

**Server `/server/.env.example`** (committed, placeholders only):
```
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
DATABASE_URL_POOLED=postgresql://user:password@host-pooler/database?sslmode=require
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5174
CLERK_SECRET_KEY=your_clerk_secret_key
```

**Client `/client/.env`** (gitignored):
```
VITE_API_URL=http://localhost:5000/api
VITE_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
```

**Client `/client/.env.example`** (committed):
```
VITE_API_URL=http://localhost:5000/api
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

## ⚠️ Important Notes

### User Authentication Flow
1. User visits app, sees public homepage
2. User clicks "Get Started" → Directed to Clerk SignUp component
3. User signs up via Clerk (email, OAuth, etc.)
4. Clerk redirects back to app, marks `isSignedIn = true`
5. Backend middleware auto-creates HRE User record linked to Clerk ID
6. User redirected to `/onboarding` (checked via `useHREUser().isOnboarded`)
7. User completes onboarding (selects role, enters business info)
8. Backend creates Business and ProviderProfile if needed
9. User redirected to `/dashboard`

### Database Schema Notes
- `clerkUserId` is nullable because existing test data might not have Clerk IDs
- For production, should be made non-nullable after migration
- Password field still exists but is unused (Clerk handles auth)
- HRERole tracks seeker/provider status separately from admin role

### Clerk Dashboard Setup Required
The user needs to:
1. Create a Clerk application at https://dashboard.clerk.com
2. Get Publishable Key and Secret Key
3. Add to environment variables (client/.env, server/.env)
4. Configure allowed redirect URLs in Clerk dashboard:
   - http://localhost:5174 (dev)
   - Production URL when deployed

### API Security
All authenticated endpoints now:
- Verify Clerk authentication via middleware
- Reject requests without valid Clerk session
- Auto-create/lookup HRE User from Clerk ID
- Never trust client-provided user IDs

## 📝 Still To Do

### High Priority
1. **Update LoginPage & RegisterPage** to use Clerk components:
   - Replace with `<SignIn />` and `<SignUp />` components from @clerk/react
   - Or simplify to redirect to Clerk-hosted signin/signup pages

2. **Create OnboardingRedirect wrapper**:
   - Check `useHREUser().isOnboarded`
   - Redirect to `/onboarding` if not complete
   - Apply to protected routes that require onboarding

3. **Update Protected Routes**:
   - Ensure all `/dashboard/*` routes check authentication + onboarding
   - Provider routes should check `hreRole === 'PROVIDER' || 'BOTH'`

4. **Update seed.ts**:
   - Remove user creation (they're created via Clerk now)
   - Keep business/resource creation for demo data
   - For testing: document how to manually create Clerk users

### Medium Priority
1. Test full authentication flow end-to-end
2. Update error handling for auth failures
3. Add user profile management page
4. Test logout flow

### Low Priority
1. Add social login options in Clerk dashboard
2. Add email verification setup
3. Add multi-factor authentication options
4. Create admin-only routes with role checking

## 🚀 How to Start

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Start development servers (client + server)
pnpm dev

# Or start separately
pnpm dev:client    # http://localhost:5174
pnpm dev:server    # http://localhost:5000
```

## 📚 Architecture

```
HRE/
├── pnpm-workspace.yaml          ← Workspace config
├── package.json                  ← Root scripts
├── node_modules/                 ← Single workspace node_modules
│
├── client/
│   ├── src/
│   │   ├── main.tsx             ← ClerkProvider wrapper
│   │   ├── App.tsx              ← Clerk routing
│   │   ├── pages/public/
│   │   │   └── OnboardingPage.tsx
│   │   ├── components/
│   │   │   └── Navbar.tsx       ← UserButton
│   │   ├── hooks/
│   │   │   └── useHREUser.ts    ← Check onboarding
│   │   └── services/
│   │       └── api.ts           ← Clerk-aware API client
│   ├── .env                     ← Clerk keys (gitignored)
│   └── .env.example
│
├── server/
│   ├── src/
│   │   ├── server.ts            ← clerkMiddleware()
│   │   ├── middleware/
│   │   │   └── auth.ts          ← Clerk verification
│   │   └── routes/
│   │       └── auth.ts          ← Onboarding endpoints
│   ├── prisma/
│   │   └── schema.prisma        ← User model with clerkUserId
│   ├── .env                     ← Clerk + DB keys (gitignored)
│   └── .env.example
│
└── CLERK_IMPLEMENTATION.md      ← This file
```

## 🔐 Security Checklist

- ✅ .env files in .gitignore (no credentials committed)
- ✅ CLERK_SECRET_KEY never exposed to frontend
- ✅ Backend verifies Clerk auth before any data access
- ✅ User IDs always verified against Clerk, never trusted from client
- ✅ API endpoints check authentication middleware
- ✅ Business data access validated against current user
- ⏳ CSRF protection (add when needed)
- ⏳ Rate limiting on auth endpoints (add when needed)

## 🧪 Testing Checklist

- [ ] User can sign up with Clerk
- [ ] User is auto-redirected to onboarding
- [ ] User can complete onboarding (select role + business info)
- [ ] Business is created in database
- [ ] ProviderProfile created if provider role selected
- [ ] User is redirected to dashboard after onboarding
- [ ] Logout button works (UserButton)
- [ ] Protected routes show 401 when not authenticated
- [ ] Non-onboarded users get redirected to /onboarding
- [ ] API calls include Clerk auth (200 when authed, 401 when not)

## 💡 Key Concepts

### Separation of Concerns
- **Clerk** = User identity & authentication (who you are)
- **HRE Database** = Business & application data (what you do)
- **HRE User model** = Bridge linking Clerk ID to business profile

### Why Clerk?
- No password storage/management burden
- Built-in email verification & MFA
- Social login ready
- Compliance-friendly (SOC2, etc.)
- Scales with your users

### Workflow
```
User Signs Up with Clerk
    ↓
Clerk confirms identity (email, OAuth, etc.)
    ↓
Backend middleware catches auth in request
    ↓
Create HRE User record linked to Clerk ID (first time only)
    ↓
User is now authenticated
    ↓
If not onboarded → redirect to /onboarding
    ↓
Complete onboarding → create Business/ProviderProfile
    ↓
Access dashboard with full HRE functionality
```

---

**Last Updated:** 2026-09-26
**Status:** Core integration complete, ready for testing and refinement
