# OfferGen – B2B Autonomous Offer Generation Platform

A fully automated B2B offer generation and management system that leverages AI to research prospects, generate personalized offers, and manage client communications.

## 🎯 Features

- **Autonomous Research Pipeline**: Web research via Perplexity API
- **AI-Powered Offer Generation**: Claude API for content creation
- **Dynamic Module System**: Customizable offer modules (fixed or variable)
- **Client-Ready Exports**:
  - Beautiful PowerPoint presentations (PPT) with AI-generated images
  - Comprehensive research reports as separate PPT decks
  - PDF documents
- **Email Integration**: Gmail draft creation via OAuth
- **Real-time Monitoring**: Live status tracking for campaign runs
- **Multi-language Support**: Hungarian, with extensibility for other languages

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** (App Router, Turbopack)
- **React 18** + TypeScript
- **Tailwind CSS** + shadcn/ui components

### Backend & Database
- **Node.js** runtime
- **PostgreSQL** (via Supabase or self-hosted)
- **Prisma 5** (ORM)

### AI & APIs
- **Anthropic Claude API** (claude-opus-4-6, claude-sonnet-4-5)
  - Core offer generation
  - Module content condensing
- **Google Gemini API** (image generation)
  - AI-generated infographics for presentations
- **Perplexity API** (web research)
  - Market research & competitor analysis

### Export & Communication
- **pptxgenjs** (PowerPoint generation)
- **Sharp** (image cropping & optimization)
- **googleapis** (Gmail OAuth & draft management)
- **@react-pdf/renderer** (PDF export)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- API keys for:
  - [Anthropic Claude](https://console.anthropic.com/account/keys)
  - [Google Gemini](https://aistudio.google.com/apikey)
  - [Perplexity](https://www.perplexity.ai/settings/api)
  - [Gmail OAuth](https://console.cloud.google.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sabolo100/offergenpython.git
   cd offergenpython
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your API keys and database URL:
   ```env
   DATABASE_URL="postgresql://..."
   ANTHROPIC_API_KEY="sk-ant-..."
   PERPLEXITY_API_KEY="pplx-..."
   GEMINI_API_KEY="AIzaSy..."
   GMAIL_CLIENT_ID="..."
   GMAIL_CLIENT_SECRET="..."
   ```

4. **Setup database**
   ```bash
   npx prisma migrate dev
   npx prisma db seed  # optional: load sample data
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## 📚 Project Structure

```
/app
  /api                 # Backend API routes
  /(dashboard)         # Authenticated UI pages
/lib
  /ai                  # Claude, Gemini, Perplexity wrappers
  /pipeline            # Automation orchestration
  /exporters           # PDF, PPT, Gmail generators
/components
  /ui                  # shadcn/ui components
  /layout              # Sidebar, header
/prisma
  /schema.prisma       # Database schema
```

## 📖 Core Pipeline

```
Campaign Setup
    ↓
Contact Selection
    ↓
Run Initiation
    ↓
Research Phase (Perplexity)
    ↓
Core Offer Generation (Claude)
    ↓
Module Instance Generation (Claude)
    ↓
Export Generation (PPT, PDF)
    ↓
Email Draft Creation (Claude)
    ↓
Gmail Draft Preparation
    ↓
Completion
```

## 🎨 Presentation Exports

### Offer Presentation (PPT)
- Cover slide with hero image
- One slide per module with AI-generated infographics
- Closing slide with CTA
- Auto-condensed content (Claude Sonnet)

### Research Report (PPT)
- Executive cover slide
- One slide per completed research topic
- Key findings + bullets
- Infographic-style AI illustrations
- Professional research summary

## 🔐 Security

- Environment secrets (`.env.local`) are **never** committed
- API keys stored locally only
- `.gitignore` prevents accidental exposure
- Use `.env.example` as a template for setup

## 📝 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/campaigns` | GET/POST | Manage campaigns |
| `/api/clients` | GET/POST | Manage client companies |
| `/api/runs/[id]/start` | POST | Initiate automation pipeline |
| `/api/runs/[id]/status` | GET | Poll run status (real-time) |
| `/api/exports` | POST | Generate PDF/PPT exports |
| `/api/gmail/draft` | POST | Create Gmail draft |

## 🧪 Testing

```bash
# Run TypeScript checks
npm run type-check

# Build for production
npm run build

# Start production server
npm start
```

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open issues and PRs.

## 📧 Support

For questions or issues, please open an issue on GitHub.

---

**Built with** ❤️ using **Claude API**, **Gemini**, and **Next.js 16**
