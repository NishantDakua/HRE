# HRE - Hospitality Resource Exchange

A modern B2B marketplace connecting hospitality businesses with verified providers for seamless resource fulfillment.

## Project Structure

```
hre/
├── client/          # React frontend
├── server/          # Express backend
├── package.json     # Root workspace config
└── .gitignore
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL (Neon database)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
# Create server/.env with Neon database credentials
cp server/.env.example server/.env
```

### Database Setup

```bash
# Generate Prisma client
npm run prisma:generate -w server

# Push schema to database
npm run prisma:push -w server

# Seed demo data
npm run prisma:seed -w server
```

### Running Development Servers

```bash
# Run both frontend and backend
npm run dev

# Or run them separately:
# Frontend (http://localhost:5173)
npm run dev -w client

# Backend (http://localhost:5000)
npm run dev -w server
```

## Demo Login

**Buyer Account:**
- Email: `buyer@hotelsunrise.com`
- Password: `demo123`

**Business:** Hotel Sunrise

## Architecture

### Frontend (React + Vite)
- **Framework:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **State:** Zustand
- **Data Fetching:** TanStack Query
- **Forms:** React Hook Form + Zod
- **Animations:** Framer Motion
- **Components:** shadcn/ui inspired, Lucide icons
- **Charts:** Recharts

### Backend (Express + Prisma)
- **Framework:** Express.js
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma
- **Authentication:** JWT (mock implementation)
- **Validation:** Zod

### Database Schema
Key models:
- `User` - User accounts
- `Business` - Business profiles with verification
- `ProviderProfile` - Provider-specific data
- `Resource` - Physical resources/services
- `Requirement` - Buyer requirements
- `Match` - Matching algorithm results
- `Negotiation` - Multi-provider negotiation
- `Booking` - Confirmed bookings with items
- `BookingItem` - Individual provider items in booking
- `Fulfillment` - Delivery tracking
- `Payment` - Payment status tracking

## Key Features

### Marketplace
- Browse hospitality resources
- Search and filter
- Provider verification badges
- Resource ratings and reviews

### Smart Matching
- Multi-provider matching algorithm
- Combine capacity from multiple verified providers
- Fulfillment completeness calculation

### Negotiations
- Individual negotiation with each provider
- Price negotiation per provider
- Delivery terms discussion
- Message conversation timeline

### Booking
- Atomic multi-provider booking
- Automatic inventory reservation
- Transaction safety with Prisma

### Fulfillment
- Real-time delivery tracking
- Multi-provider status monitoring
- Timeline visibility

### Analytics
- Procurement trends
- Spend analysis by category
- Provider utilization metrics

## API Routes

```
/api/auth          - Authentication
/api/businesses    - Business management
/api/categories    - Resource categories
/api/resources     - Resource management
/api/requirements  - Requirement posting
/api/matches       - Matching algorithm
/api/negotiations  - Negotiation flow
/api/bookings      - Booking management
/api/payments      - Payment tracking
/api/notifications - Real-time notifications
```

## Pages

### Public
- `/` - Home/Landing
- `/marketplace` - Resource marketplace
- `/marketplace/:id` - Resource detail
- `/providers` - Verified providers
- `/providers/:id` - Provider profile
- `/how-it-works` - How HRE works
- `/financing` - Financing tools
- `/about` - About HRE
- `/contact` - Contact form
- `/faq` - FAQ
- `/login` - Login
- `/register` - Registration
- `/verify-business` - Business verification

### Authenticated Buyer
- `/dashboard` - Main dashboard
- `/discover` - Discover resources
- `/requirements` - My requirements
- `/requirements/new` - Post requirement
- `/requirements/:id` - Requirement detail
- `/matches` - Matching results
- `/negotiations` - Active negotiations
- `/bookings` - My bookings
- `/bookings/:id` - Booking detail
- `/fulfillment` - Fulfillment tracking
- `/resources/my` - My resources (if provider)
- `/resources/new` - Add resource
- `/payments` - Payment status
- `/notifications` - Notifications
- `/messages` - Messaging
- `/analytics` - Business analytics
- `/business` - Business profile
- `/settings` - Settings

### Provider Specific
- `/provider/dashboard` - Provider dashboard
- `/provider/resources` - Manage resources
- `/provider/requests` - Incoming requirements
- `/provider/negotiations` - Provider negotiations
- `/provider/bookings` - Provider bookings

## Environment Variables

### Server (.env)
```
DATABASE_URL=postgresql://...
DATABASE_URL_POOLED=postgresql://...
JWT_SECRET=your-secret-key
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
```

### Client (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## Development

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

### Building
```bash
npm run build
```

## Database Migrations

```bash
# Create a migration
npm run prisma:migrate -w server

# Generate Prisma client after schema changes
npm run prisma:generate -w server

# View database state
npm run prisma:studio -w server
```

## Design System

### Colors
- **Primary:** Navy (#354778)
- **Secondary:** Blue (#4a5fa2)
- **Accent:** Sky Blue (#87ceeb)
- **Status:** Green (success), Amber (pending), Red (error)

### Typography
- Headings: 4xl-5xl (bold)
- Body: base-lg
- Captions: xs-sm

### Components
- Premium rounded corners (rounded-xl/2xl)
- Subtle shadows
- Generous spacing
- Clean borders
- Smooth transitions

## Demo Flow

1. Login as Hotel Sunrise buyer
2. Dashboard shows active requirements and bookings
3. Post a new requirement
4. HRE matches with verified providers
5. View multi-provider solution
6. Negotiate with each provider individually
7. Confirm booking (atomic transaction)
8. Track fulfillment in real-time
9. View payment status
10. Analytics update with new procurement

## Security Considerations

- JWT-based authentication (mock)
- Server-side validation with Zod
- No hardcoded credentials
- Database credentials in environment variables
- CORS configured
- Frontend never accesses database directly
- All prices/inventory validated server-side

## Future Enhancements

- Real OAuth integration (EntityLocker)
- WebSocket for real-time notifications
- File uploads for business documents
- Advanced search with Elasticsearch
- Real payment gateway integration
- Vendor rating system
- Reviews and testimonials
- Advanced analytics dashboard
- Mobile app
- Multi-language support

## Support

For questions or issues, reach out to hello@hre.com

---

Built with ❤️ for the hospitality industry
