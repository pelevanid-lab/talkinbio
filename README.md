# Talkinbio 🚀

Talkinbio is an AI-powered, intelligent "Link in Bio" and micro-website builder. Instead of forcing users to fill out complex forms, Talkinbio uses a conversational AI assistant to interview business owners and automatically designs and deploys a stunning, mobile-first profile page in real-time.

## ✨ Features

- **AI Setup Assistant:** A conversational agent that asks targeted questions about your business, extracts structured data, and builds your page block by block.
- **Sector-Specific Architecture:** The AI understands your industry. If you're a photographer, it asks for photos and creates a `Gallery` block. If you're a consultant, it asks for reviews and creates a `Testimonials` block.
- **Dynamic Archetypes:** Automatic selection of 10+ design templates (e.g., `luxury-spa`, `cyber-tech`, `dark-elegant`) based on the business's vibe, including intelligent color palettes, typography, and border radiuses.
- **Layout Modes:** Business owners can choose how their end-users view the page:
  - **Website Mode:** A continuous, flowing micro-website experience.
  - **Linktree (Block) Mode:** A traditional menu where clicking a section opens only that specific block.
- **Real-time Manual Editor:** If users don't want to chat, they can seamlessly switch to the "Manual" mode to edit text, upload media, or reorder blocks on the fly with optimistic UI updates for zero latency.
- **Multi-language Support:** The interface and the AI assistant dynamically support Turkish, English, and Russian.
- **Custom Public Links:** Claim and manage unique profile URLs (e.g., `talkinbio.com/username`).

## 🛠 Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Backend / Database:** [Supabase](https://supabase.com/) (PostgreSQL, Storage, Auth)
- **AI Integration:** [Vercel AI SDK](https://sdk.vercel.ai/)
- **Localization:** `next-intl`
- **Icons:** `lucide-react`

## 🏗 Project Structure

```text
src/
├── app/
│   ├── [locale]/           # Multi-language routes (tr, en, ru)
│   │   ├── [username]/     # Public profile pages
│   │   ├── dashboard/      # Business owner dashboard & analytics
│   │   ├── editor/         # The core AI & Manual Editor interface
│   │   └── onboarding/     # Initial signup & AI handshake
│   └── api/
│       └── setup-agent/    # AI Agent logic, System Prompts, and Tools
├── components/             # Reusable UI components
│   ├── EditorClient.tsx    # Main Editor state & AI Chat UI
│   ├── ArchetypeRenderer.tsx # Renders blocks based on selected theme
│   └── BlockEditorModal.tsx  # Manual block editing forms
├── config/
│   └── archetypes.ts       # Design system configurations (colors, fonts, radius)
└── utils/
    └── supabase/           # Supabase client configurations
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Supabase Project (URL and Anon/Service Role Keys)
- OpenAI API Key (or preferred LLM provider configured in Vercel AI SDK)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/pelevanid-lab/talkinbio.git
   cd talkinbio
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎨 Block Types

The AI (and manual editor) supports dynamically rendering the following blocks:
- **`about`**: Biography, profile picture, and flexible media positioning.
- **`services`**: List of offerings with prices and images.
- **`gallery`**: Masonry/Grid image gallery for visual portfolios.
- **`testimonials`**: Horizontal scrollable carousel for customer reviews.
- **`faq`**: Frequently asked questions.
- **`hours`**: Business working hours.
- **`links`**: Social media and external links.
- **`contact`**: Contact information and direct messaging logic.

---
*Built with ❤️ by the Talkinbio Team.*
