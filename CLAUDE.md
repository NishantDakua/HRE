# HRE Project Documentation

## Project Overview

**HRE** (Hospitality Resource Exchange) is a B2B marketplace connecting hospitality businesses that need resources with verified providers.

### Core Innovation
- One requirement → Multiple providers → One coordinated solution
- Intelligent matching algorithm combines capacity from multiple providers
- Individual negotiation with each provider
- Atomic multi-provider booking with inventory management

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- TanStack Query (data fetching & caching)
- React Hook Form + Zod (forms & validation)
- Framer Motion (animations)
- Lucide React (icons)
- Zustand (state management)

### Backend
- Express.js + TypeScript
- Prisma ORM
- PostgreSQL (Neon)
- JWT (authentication - mock)
- Zod (validation)

## Database Architecture

Key principle: **Multi-provider booking atomicity**

### Core Models
- **User**: Individual accounts
- **Business**: Business profiles with verification status
- **ProviderProfile**: Provider-specific metrics (rating, fulfillment rate)
- **Resource**: Physical resources/services
- **Inventory**: Real-time availability tracking
- **Requirement**: Buyer's resource needs
- **Match**: Matching results (single or multi-provider)
- **MatchItem**: Individual provider in a match
- **Negotiation**: Per-provider negotiation state
- **Booking**: Confirmed order
- **BookingItem**: Individual provider fulfillment in booking
- **Fulfillment**: Delivery tracking
- **Payment**: Payment lifecycle

### Critical Relationships
```
Requirement (1) → (many) Match (1) → (many) MatchItem → Provider
Booking (1) → (many) BookingItem (many) → Provider
BookingItem tracks: quantity, agreedPrice, fulfillmentStatus, paymentStatus
```

## Project Structure

```
hre/
├── client/                    # React SPA
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   │   ├── public/        # Landing, marketplace, auth
│   │   │   ├── auth/          # Authenticated buyer pages
│   │   │   └── provider/      # Provider-specific pages
│   │   ├── layouts/           # PublicLayout, AuthLayout, ProviderLayout
│   │   ├── services/          # API client (api.ts)
│   │   ├── stores/            # Zustand stores (auth.ts)
│   │   ├── types/             # TypeScript interfaces
│   │   ├── App.tsx            # Routing config
│   │   └── index.css          # Global styles
│   └── vite.config.ts
│
├── server/                    # Express backend
│   ├── src/
│   │   ├── routes/            # API endpoints
│   │   │   ├── auth.ts
│   │   │   ├── resources.ts
│   │   │   ├── requirements.ts
│   │   │   ├── bookings.ts
│   │   │   └── ...
│   │   ├── middleware/        # Auth, validation, etc.
│   │   ├── controllers/       # Business logic (optional)
│   │   └── server.ts          # Express app
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.ts            # Demo data
│   └── .env                   # Database credentials
│
└── package.json               # Monorepo config
```

## Key Features Status

### ✅ Implemented
- Complete landing page with hero, categories, core differentiator
- Authentication pages (login/register stubs)
- Dashboard layout (sidebar navigation)
- Marketplace page with resource cards
- Prisma schema with all models
- Database seed with 6 businesses, multiple resources
- API route structure
- Frontend routing
- Auth store (Zustand)
- API service layer (axios)

### 🔄 In Progress
- Basic API routes (auth, resources, categories)
- Page scaffolding (most pages are stubs)

### ⏳ Not Started
- Matching algorithm
- Negotiation workflow
- Booking transaction logic
- Fulfillment tracking UI
- Provider dashboard
- Analytics
- Payment management
- Search & filters
- Real-time notifications
- WebSocket support

## Development Guidelines

### Code Style
- Use TypeScript strictly (no `any`)
- Prefer functional components with hooks
- Use Tailwind utility classes
- Reuse shadcn/ui components where applicable
- Keep components small and focused

### API Design
- RESTful endpoints
- Validation with Zod on server
- Return proper HTTP status codes
- Include pagination for large datasets

### Database Operations
- Use Prisma queries (type-safe)
- Leverage Prisma transactions for multi-step operations
- Always validate inventory before booking
- Never trust client-side data

### Frontend
- Use React Query for server state
- Use Zustand for client state (auth)
- Implement loading/error/empty states
- Responsive design (mobile-first)
- Use Framer Motion sparingly

## Database Credentials

⚠️ **CRITICAL**: Store in `server/.env`

```
DATABASE_URL=postgresql://...
DATABASE_URL_POOLED=postgresql://...
```

Get from: https://console.neon.tech

## Demo Accounts

Pre-seeded in database:

**Buyer:**
- Email: buyer@hotelsunrise.com
- Password: demo123
- Business: Hotel Sunrise

**Providers:**
- Grand Events
- Royal Caterers
- Urban Banquets
- Metro Hospitality
- Elite Services

(All seeded in `server/prisma/seed.ts`)

## Important Routes

### Public
- `/` - Landing
- `/marketplace` - Browse resources
- `/marketplace/:id` - Resource detail
- `/providers` - Provider listing
- `/login`, `/register` - Auth

### Authenticated
- `/dashboard` - Main dashboard
- `/discover` - Resource discovery
- `/requirements` - Post/manage requirements
- `/matches` - Matching results
- `/negotiations` - Active negotiations
- `/bookings` - Bookings & fulfillment
- `/analytics` - Procurement analytics

### Provider
- `/provider/dashboard` - Provider view
- `/provider/resources` - Resource management
- `/provider/bookings` - Incoming orders

## Common Tasks

### Add a New Page
1. Create component in `client/src/pages/{scope}/{PageName}.tsx`
2. Add route in `client/src/App.tsx`
3. Create any needed API calls via `client/src/services/api.ts`

### Add an API Endpoint
1. Create route in `server/src/routes/{resource}.ts`
2. Import and mount in `server/src/server.ts`
3. Update `client/src/services/api.ts` if needed
4. Use Zod for validation

### Database Schema Change
1. Update `server/prisma/schema.prisma`
2. Run `npm run prisma:push -w server` to apply
3. Regenerate client: `npm run prisma:generate -w server`

### Add Styling
- Tailwind CSS (primary)
- CSS modules (if needed)
- Global styles in `client/src/index.css`
- Design system components in `client/src/components/`

## Known Limitations

- Authentication is mock (JWT but no real OAuth)
- No real payment processing
- EntityLocker verification is mocked
- No WebSocket/real-time features yet
- Search is basic (no Elasticsearch)
- No image uploads yet
- Limited error handling

## Future Enhancements

1. **Real OAuth** - EntityLocker integration
2. **WebSocket** - Real-time notifications & live matching
3. **Search** - Elasticsearch for advanced queries
4. **File Uploads** - Business documents, resource images
5. **Payment** - Real gateway integration (Stripe/Razorpay)
6. **Mobile** - React Native app
7. **Analytics** - Advanced dashboards with Recharts/D3
8. **Notifications** - Email, SMS, push
9. **Reviews** - Rating system & testimonials
10. **Internationalization** - Multi-language support

## Performance Considerations

- React Query caches resource data
- Pagination for large datasets
- Lazy load components where possible
- Optimize database queries (indexes)
- Use debouncing for search

## Security Checklist

- ✅ .env files in .gitignore
- ✅ Never expose DATABASE_URL to frontend
- ✅ Server validates all input
- ✅ CORS configured
- ✅ No hardcoded secrets
- ⏳ Need: Auth middleware
- ⏳ Need: Rate limiting
- ⏳ Need: Input sanitization

## Useful Commands

```bash
# Start development
npm run dev

# Type check
npm run type-check

# Database
npm run prisma:generate -w server      # Regenerate client
npm run prisma:push -w server          # Apply schema changes
npm run prisma:seed -w server          # Seed demo data
npm run prisma:studio -w server        # GUI database explorer

# Build for production
npm run build
```

## Contact & Questions

For questions about the project structure or implementation decisions, refer to this file first.

---

**Last Updated:** 2024
**Built for:** Hackathon
**Status:** MVP Phase
