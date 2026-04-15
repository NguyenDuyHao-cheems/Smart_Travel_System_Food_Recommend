<!-- BEGIN:folder-description -->

# Project Structure

```
Smart_Travel_System_Food_Recommend/
├── Frontend/                    # Next.js 16 + React 19 + Tailwind CSS v4
│   └── src/
│       ├── app/                 # App Router pages & layouts
│       │   ├── page.tsx         # Homepage (HeroSection + BentoGrid → redirects to /result)
│       │   ├── result/          # AI recommendation results page
│       │   ├── search/          # Search flow page
│       │   ├── detail/          # Restaurant detail page
│       │   ├── auth/            # Login / Register pages
│       │   ├── layout.tsx       # Root layout (fonts, metadata)
│       │   └── globals.css      # Design tokens (oklch variables, dark mode)
│       ├── components/          # Reusable UI components
│       │   ├── Header.tsx       # Global navigation bar
│       │   ├── HeroSection.tsx  # Homepage hero with search input
│       │   ├── BentoGrid.tsx    # Feature showcase grid
│       │   ├── ui/              # Atomic UI primitives (ResultCard, LoadingState)
│       │   ├── shared/          # Cross-page components (Footer, RestaurantCard)
│       │   └── figma/           # Figma-exported components
│       ├── hooks/               # Custom React hooks (useGeolocation)
│       ├── services/            # API client functions
│       ├── store/               # Global state management
│       └── types/               # TypeScript interfaces
│
├── core_backend/                # FastAPI microservice (Port 8000)
│   ├── app/
│   │   ├── main.py              # FastAPI instance, CORS, router registration
│   │   ├── core/                # Config, database connection, security
│   │   ├── domains/             # DDD business logic (router → service → repository)
│   │   │   ├── users/           # User management & onboarding
│   │   │   ├── restaurants/     # Restaurant CRUD
│   │   │   └── search/          # GPS search & AI recommendation endpoints
│   │   └── services/            # Shared application services
│   ├── tests/                   # Pytest test suite
│   ├── requirements.txt         # Python dependencies (incl. pgvector)
│   └── Dockerfile
│
├── ai_engine/                   # AI/ML microservice (Port 8001)
│   ├── app/                     # Recommendation engine (LightGBM, embeddings)
│   ├── requirements.txt
│   └── Dockerfile
│
├── Data_Pipeline/               # ETL & data ingestion
│   ├── scrapers/                # Google Maps data scrapers
│   ├── AI_processing/           # Sentiment analysis (Hugging Face)
│   ├── notebooks/               # Jupyter notebooks for ML experiments
│   ├── raw_data/                # Temporary CSV/JSON storage
│   └── seed.py                  # Database seeding script
│
├── docs/                        # Project documentation
│   ├── ERD/                     # Entity Relationship Diagrams
│   ├── Sequence/                # Sequence diagrams
│   ├── Kiến trúc/               # Architecture diagrams
│   └── UI_System_Design.md      # Full UI design system specification
│
├── docker-compose.yml           # Orchestrates core_backend + ai_engine
├── AGENTS.md                    # This file — AI agent context
├── README.md                    # Project overview & setup guide
└── CONTRIBUTING.md              # Git workflow rules
```

<!-- END:folder-description -->
