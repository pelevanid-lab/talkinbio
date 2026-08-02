# Talkinbio

**Stop linking. Start talking.**

Talkinbio is an agentic conversational web platform that transforms static digital pages into intelligent, interactive experiences.

It enables businesses, brands, organizations, teams, and independent professionals to create digital destinations that can understand visitor intent, present relevant information, answer questions, guide navigation, collect leads, and initiate real business actions.

At the center of the platform is **Saule**, Talkinbio's shared intelligence and orchestration layer.

## What is Talkinbio?

Traditional websites and bio-link pages expect visitors to understand their structure, navigate menus, open multiple pages, and search for the information they need.

Talkinbio reverses this relationship.

Instead of forcing visitors to navigate the organization's information architecture, Talkinbio allows them to express what they need through natural conversation. Saule interprets that intent, provides the appropriate response, opens the relevant content, and guides the visitor toward the next action.

Depending on the organization, this action may be:

- Exploring or comparing products
- Discovering the right service
- Learning about a campaign or launch
- Finding a store, dealer, or sales channel
- Requesting an appointment or demonstration
- Submitting contact information
- Reaching the correct support channel
- Reviewing prices, specifications, policies, or frequently asked questions
- Navigating directly to the relevant section of a page

Talkinbio is not limited to a specific business size or industry. It can operate as:

- A conversational profile for an independent professional
- A digital front desk for a service business
- A product discovery assistant for a consumer brand
- A campaign and launch destination for a marketing team
- A lead-generation interface for a sales organization
- A guided support and information layer for a larger company
- An interactive alternative to static landing pages and conventional websites

Talkinbio combines page creation, structured content, conversational assistance, navigation, lead capture, multilingual delivery, and AI orchestration within one platform.

## Who is Talkinbio for?

Talkinbio is designed for any person or organization whose digital visitors arrive with questions, choices, or an action they want to complete.

Potential users include:

- Independent professionals and creators
- Local and small businesses
- Growing service companies
- E-commerce and retail brands
- Consumer electronics and technology companies
- Hospitality, travel, and event businesses
- Education and training organizations
- Marketing, sales, and customer-experience teams
- Enterprises managing products, campaigns, dealers, or customer journeys

The initial go-to-market strategy may focus on selected customer segments where onboarding is faster and the value can be demonstrated clearly. This commercial focus does not define the architectural or strategic limits of the platform.

## Saule

Saule is the shared intelligence and orchestrator operating across Talkinbio.

Saule is not a separate product or a single-purpose chatbot. It connects the organization's content, page structure, knowledge, visitor conversations, business rules, and available actions.

Its role changes according to the context.

### Content and experience orchestration

Saule can:

- Learn about a business, brand, product, or campaign
- Build and update structured digital pages
- Organize products, services, specifications, prices, and media
- Write, translate, and maintain content
- Design context-appropriate page structures
- Guide teams through page creation and updates
- Preserve consistency across content, languages, and visitor experiences

### Visitor interaction

When interacting with a visitor, Saule can:

- Understand the visitor's question or intent
- Answer using approved page content and organizational knowledge
- Recommend relevant products, services, or next steps
- Compare available options
- Open the appropriate section or item on the page
- Collect lead, appointment, demonstration, or contact requests
- Direct visitors toward sales, support, stores, dealers, or external channels
- Continue interactions through written or voice-based interfaces

### Organizational orchestration

Saule coordinates:

- Public page content
- Internal knowledge
- Products and services
- Visitor conversations
- Lead capture
- Page navigation
- Multilingual content
- Deterministic business actions
- AI tools and model usage
- Credits, permissions, and operational limits

The goal is not to add isolated AI features to a website. The goal is to provide one intelligence layer capable of operating the entire conversational digital experience.

## Product Positioning

Talkinbio should not be defined by the size of the business using it.

A solo consultant may use it as a conversational professional profile. A local clinic may use it as a digital front desk. A consumer electronics company may use it to introduce products, compare devices, answer campaign questions, direct visitors to retailers, and capture purchase intent.

The underlying problem is the same:

**Digital visitors arrive with intent, but conventional pages make them navigate structure instead of expressing what they need.**

Talkinbio turns that intent into conversation, navigation, and action.

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

---

*Built with ❤️ by the Talkinbio Team.*
