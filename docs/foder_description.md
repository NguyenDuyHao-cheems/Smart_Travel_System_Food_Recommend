## Root
smart-travel-system/
├── frontend/           # Next.js & Tailwind CSS application
├── backend/            # FastAPI application
├── data_pipeline/      # ETL, Web Scraping & AI pre-processing
├── docs/               # ERD, Sequence Diagrams, API Contracts
├── .gitignore          # Ignore node_modules, venv, .env
├── README.md           # Project overview & setup instructions
└── CONTRIBUTING.md     # Git workflow rules for the 8-person team
## Frontend
frontend/
├── src/
│   ├── app/            # Next.js App Router (Pages & Layouts)
│   │   ├── (auth)/     # Login/Register pages
│   │   ├── search/     # Search results page
│   │   ├── detail/     # Restaurant detail page
│   │   └── page.tsx    # Home page
│   │
│   ├── components/     # Reusable UI elements
│   │   ├── ui/         # Buttons, Inputs, Modals (Tailwind styled)
│   │   └── shared/     # Header, Footer, RestaurantCard
│   │
│   ├── services/       # API call functions (fetch JSON from Backend)
│   ├── store/          # Global state management
│   └── types/          # Data interfaces 
│
├── public/             # Static assets (images, icons)
├── tailwind.config.ts  # Tailwind CSS configuration
└── package.json        # Frontend dependencies
## Backend
backend/
├── app/
│   ├── core/                   # Security, configs, DB connection
│   │   ├── config.py           # Environment variables loader
│   │   ├── database.py         # PostgreSQL connection setup
│   │   └── security.py         # JWT Token & Hashing
│   │
│   ├── domains/                # Business logic separated by features
│   │   ├── users/              # User management domain
│   │   │   ├── router.py       # API Endpoints (e.g., POST /users)
│   │   │   ├── schemas.py      # Pydantic models (Data validation)
│   │   │   ├── models.py       # SQLAlchemy models (PostgreSQL tables)
│   │   │   ├── repository.py   # DB operations (CRUD)
│   │   │   └── service.py      # Core business logic
│   │   │
│   │   ├── restaurants/        # Restaurant domain
│   │   │   └── ...             # Same 5-file structure as users/
│   │   │
│   │   └── recommendations/    # AI ranking & LambdaMART domain
│   │       ├── router.py
│   │       ├── service.py      # Logic to call LightGBM
│   │       └── schemas.py
│   │
│   └── main.py                 # FastAPI application instance & Router registration
│
├── requirements.txt            # Python dependencies list
└── .env.example                # Example environment variables (No real passwords)

## Data Pipeline
data_pipeline/
├── scrapers/           # Python scripts to fetch Google Maps data
├── ai_processing/      # Scripts for Sentiment Analysis via Hugging Face
├── notebooks/          # Jupyter notebooks for testing ML models (LightGBM)
├── raw_data/           # CSV/JSON files temporarily stored before DB insertion
└── seed.py             # Main script to push clean data to PostgreSQL

## Docs
docs/
├── ERD.png             # Entity Relationship Diagram (PostgreSQL schema)
├── sequence_diagrams/  # Sequence diagrams for user flows
└── api_contract.md     # API documentation (OpenAPI/Swagger spec)
