# Floor Interior Service - AI-Powered Prescreening System

An automated prescreening system for flooring installers powered by OpenAI. Conduct voice interviews, extract structured data, and make instant qualification decisions.

![Floor Interior Service](https://img.shields.io/badge/AI-Powered-black?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-black?style=for-the-badge)

## Features

### 🎤 Voice-Powered AI Interviews
- Natural conversation flow with OpenAI GPT-4
- Speech-to-text with Whisper API
- Text-to-speech for AI responses
- Optional text input mode

### 📋 Structured Data Collection
- Work experience
- Flooring specialties (hardwood, laminate, vinyl, tile, carpet)
- Crew size and availability
- Tools and equipment
- Service areas
- Insurance and licensing

### ✅ Automatic Pass/Fail Decisions
- Configurable qualification criteria
- Instant scoring (0-100)
- Automatic status assignment
- Override capability for manual review

### 📊 Admin Dashboard
- View all installer records
- Search and filter by status, experience, specialty, location
- Detailed installer profiles
- Contact actions (email, phone)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. **Clone and install dependencies:**

```bash
cd "Recriuting Ai"
npm install
```

2. **Set up environment variables:**

Create a `.env.local` file in the root directory (copy from `env.local.example`):

```env
# OpenAI API Key - Get yours at https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key-here

# Database URL (PostgreSQL)
# Vercel Postgres: set DATABASE_URL to the pooled connection string, and DATABASE_URL_UNPOOLED to the non-pooled/direct connection string (for Prisma migrations)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"

# Base URL for the application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here-generate-with-openssl
```

3. **Initialize the database:**

```bash
npx prisma generate
npx prisma migrate dev
```

4. **Start the development server:**

```bash
npm run dev
```

5. **Open your browser:**

Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── app/
│   │   ├── api/            # API routes
│   │   │   ├── installers/ # Installer CRUD
│   │   │   └── interview/  # Interview flow
│   │   ├── dashboard/      # Admin dashboard
│   │   ├── interview/      # Interview pages
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Home page
│   ├── components/         # Reusable components
│   │   ├── AudioPlayer.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── SpeakingAnimation.tsx
│   │   └── VoiceRecorder.tsx
│   └── lib/
│       ├── db.ts           # Prisma client
│       ├── openai.ts       # OpenAI integration
│       ├── store.ts        # Zustand stores
│       └── utils.ts        # Utility functions
├── .env.local              # Environment variables
├── package.json
└── README.md
```

## How It Works

### 1. Start Prescreening
Applicants receive a link to `/interview` and enter their email to begin.

### 2. AI Interview
The AI asks structured questions about:
- Personal information
- Work experience
- Flooring expertise
- Crew and tools
- Service areas
- Availability
- Insurance and licensing

### 3. Voice or Text Responses
Applicants can:
- Speak their answers (recorded and transcribed via Whisper)
- Type responses as an alternative

### 4. Data Extraction
The AI extracts structured data from responses:
- Years of experience
- Flooring specialties
- Crew size
- Service areas
- Insurance status

### 5. Automatic Qualification
Based on configurable criteria:
- **Pass**: Meets minimum requirements (1+ year experience, has insurance)
- **Fail**: Does not meet requirements

### 6. Dashboard Management
Admins can:
- View all applicants
- Filter by status, experience, specialty
- See detailed profiles
- Contact qualified installers

## API Endpoints

### Interview
- `POST /api/interview/start` - Start a new interview
- `POST /api/interview/respond` - Process interview response
- `POST /api/interview/complete` - Complete and score interview

### Installers
- `GET /api/installers` - List all installers (with filters)
- `POST /api/installers` - Create installer
- `GET /api/installers/[id]` - Get installer details
- `PATCH /api/installers/[id]` - Update installer
- `DELETE /api/installers/[id]` - Delete installer

## Qualification Criteria

Default scoring weights:
- Experience: 30 points max
- Own crew: 15 points
- Own tools: 15 points
- Insurance: 20 points
- License: 10 points
- Specialties: 10 points max

**Minimum requirements:**
- At least 1 year of experience
- Must have liability insurance
- Score of 50+ to pass

## Customization

### Modify Interview Questions
Edit `src/lib/openai.ts` → `INTERVIEW_QUESTIONS` array

### Adjust Scoring
Edit `src/lib/utils.ts` → `calculateScore()` and `determinePassFail()`

### Change Pass/Fail Criteria
Modify the logic in `src/lib/utils.ts`

## Deployment

### Deploy to Vercel with Vercel Postgres

This application is configured for deployment on Vercel with Vercel Postgres database.

**Quick Start:**

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

3. **Add Vercel Postgres:**
   - In Vercel Dashboard → **Storage** tab
   - Click **Create Database** → Select **Postgres**
   - This automatically creates `POSTGRES_URL` environment variable

4. **Configure Environment Variables:**
   - Go to **Settings** → **Environment Variables**
   - Add `DATABASE_URL` (copy value from `POSTGRES_URL`)
   - Add `OPENAI_API_KEY`
   - Add `NEXTAUTH_URL` (your Vercel app URL)
   - Add `NEXTAUTH_SECRET` (generate with: `openssl rand -base64 32`)
   - Add `NEXT_PUBLIC_APP_URL` (your Vercel app URL)

5. **Deploy:**
   - Click **Deploy**
   - Database migrations run automatically during build

**📖 For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)**

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (local) / PostgreSQL (production) with Prisma ORM
- **AI**: OpenAI GPT-4, Whisper, TTS
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **State**: Zustand
- **Icons**: Lucide React
- **Deployment**: Vercel + Vercel Postgres

## License

MIT License - feel free to use this for your own projects.

---

Built with ❤️ by Floor Interior Service

