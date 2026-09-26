# HRE Quick Start

## In 5 Minutes

### Step 1: Get Database URLs
Visit **https://console.neon.tech** and get your connection strings.

### Step 2: Set Environment Variables
Create `server/.env`:
```
DATABASE_URL=postgresql://...
DATABASE_URL_POOLED=postgresql://...
JWT_SECRET=my-secret-key
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
```

### Step 3: Install & Setup
```bash
cd C:\Users\suraj\Desktop\HRE

npm install

npm run prisma:push -w server

npm run prisma:seed -w server
```

### Step 4: Run
```bash
npm run dev
```

### Step 5: Access
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:5000

### Login
```
Email: buyer@hotelsunrise.com
Password: demo123
```

---

## What's Built ✅

### Frontend
- ✅ Landing page (hero, categories, core differentiator section)
- ✅ Login page
- ✅ Marketplace (resource cards)
- ✅ Dashboard layout
- ✅ Full routing (30+ pages scaffolded)
- ✅ Responsive design
- ✅ Dark mode support

### Backend
- ✅ Express server
- ✅ Database schema (20+ models)
- ✅ API routes (auth, resources, requirements, bookings)
- ✅ Demo data (6 businesses, multiple resources)

### Database
- ✅ Prisma ORM
- ✅ PostgreSQL (Neon)
- ✅ Complete schema with relationships
- ✅ Seed data ready

### Documentation
- ✅ README.md
- ✅ SETUP.md
- ✅ CLAUDE.md
- ✅ IMPLEMENTATION_STATUS.md
- ✅ QUICKSTART.md (this file)

---

## What's Ready to Build

1. **Requirement Posting Flow** - Multi-step form to post requirements
2. **Matching Algorithm** - Combine multiple providers for one requirement
3. **Negotiation System** - Per-provider negotiation interface
4. **Booking Confirmation** - Multi-provider bundle booking
5. **Fulfillment Tracking** - Real-time delivery status
6. **Provider Dashboard** - Dashboard for resource providers
7. **Analytics** - Procurement insights and trends
8. **Advanced Search** - Filters, sorting, autocomplete
9. **Real-Time Features** - WebSocket notifications
10. **Review System** - Ratings and testimonials

---

## Key Folders

```
client/src/
├── pages/              # Page components (30+ pages)
├── components/         # Reusable UI
├── layouts/            # Page layouts
├── services/api.ts     # API client
├── stores/auth.ts      # Auth state
└── index.css           # Global styles

server/src/
├── routes/             # API endpoints
├── server.ts           # Express app
└── prisma/
    ├── schema.prisma   # Database schema
    └── seed.ts         # Demo data
```

---

## Troubleshooting

**"Can't connect to database"**
- Check DATABASE_URL in server/.env
- Verify Neon database is active

**"Port already in use"**
- Change PORT in server/.env
- Frontend will auto-find next port

**"Module not found"**
```bash
rm -rf node_modules
npm install
npm run prisma:generate -w server
```

**"Prisma client error"**
```bash
npm run prisma:generate -w server
```

---

## File Reference

| File | Purpose |
|------|---------|
| README.md | Project overview |
| SETUP.md | Detailed setup guide |
| CLAUDE.md | Developer documentation |
| IMPLEMENTATION_STATUS.md | What's done, what's left |
| QUICKSTART.md | This file |
| server/.env.example | Environment template |

---

## Demo Data

Pre-loaded businesses:
- **Hotel Sunrise** (buyer)
- **Royal Caterers** (provider)
- **Urban Banquets** (provider)
- **Metro Hospitality** (provider)
- **Elite Services** (provider)
- **Grand Events** (provider)

Demo Login:
- Email: `buyer@hotelsunrise.com`
- Password: `demo123`

---

## Next: Pick Your First Feature

Recommended order:
1. Implement matching algorithm
2. Build requirement posting form
3. Create matching results display
4. Build negotiation UI
5. Implement booking flow

Each typically takes 2-4 hours.

---

## Support

- **Full Guide:** See SETUP.md
- **Architecture:** See CLAUDE.md
- **Status:** See IMPLEMENTATION_STATUS.md

---

**Ready?** → `npm run dev` → Go to http://localhost:5173

Let's build HRE! 🚀
