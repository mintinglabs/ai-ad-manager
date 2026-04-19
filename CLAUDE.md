# AI Ad Manager — Project Context

## Tech Stack
- **Client:** React 18 + Vite + Tailwind CSS (`client/`)
- **Server:** Express.js + Meta Marketing API v25.0 (`server/`)
- **Database:** Supabase (PostgreSQL)
- **AI:** Google Gemini (via `@google/genai`) for chat, crawling, skill generation
- **Deploy:** Vercel serverless — `vercel --prod` then `vercel alias <url> client-gamma-neon-66.vercel.app`

## File Structure
```
client/src/
  components/    — All UI modules (ChatInterface, AdLibrary, CreativeLibrary, AudienceManager, CampaignManager, BrandLibrary, Optimizations, ReportDashboard, CanvasPanel, Sidebar, Dashboard, etc.)
  hooks/         — useSkills, useBrandLibrary, useChat, etc.
  services/      — api.js (axios instance)
  index.css      — Global styles + CSS custom properties

server/
  src/api/       — Express routers (chat, campaigns, adsets, ads, creatives, assets, audiences, brandLibrary, skills, reports)
  src/lib/       — instructions.js (AI system prompt), supabase.js, tools.js (Meta API tool definitions), pdfExtract.js (PDF text extraction via pdfjs-dist)
  skills/system/ — Always-on AI context (campaigns, analytics-engine, audiences, brand-memory)
  skills/official/ — Toggleable skills (skill-creator). Frontmatter supports: name, description, preview, starter_prompt
  skills/custom/ — User-created skills (stored in Supabase, cached on disk)
  sql/           — Database schema files

api/index.mjs   — Vercel serverless entry point (re-exports Express app)
```

## Design System
- **Font:** DM Sans (Google Fonts)
- **Brand colors:** Orange theme — CSS vars `--brand-orange`, `--brand-amber`
- **Headers:** Dark gradient backgrounds (slate-900 → slate-800)
- **Cards:** White with subtle borders, hover shadows, `rounded-2xl backdrop-blur-sm`
- **Buttons:** Orange gradient (`from-orange-500 to-amber-500`)
- **Optimizations module:** Full dark theme (`bg-slate-950`) with bento grid layout
- **"Upgrade the design"** = apply modern futuristic orange theme with premium feel

## Key Patterns
- `AccountSelector` — ad account dropdown, used in most module headers
- `AskAIButton` / `AskAIPopup` — AI integration button for modules
- `onPrefillChat(message, pillName)` — navigate to chat with prefilled prompt + action pill
- `onSendToChat(message)` — send message from module to active chat
- System skills = always-on background context injected into every AI message
- Official skills = toggleable by user in Skills Library. Support `starter_prompt` frontmatter field — auto-fills chat input when skill is selected via `/` or `+` menu
- Custom skills = user-created via Skill Creator, AI generation, or file upload (PDF/DOC/XLS → server extracts text → Gemini generates skill)
- Skill file upload: `POST /api/skills/upload-doc` (multer + pdfjs-dist). Chat doc upload: `POST /api/chat/parse-doc`
- PDF parsing: always use `pdfExtract.js` (pdfjs-dist). Do NOT use pdf-parse v2 — it changed API and is broken in ESM
- Slash `/` picker shows ALL skills (not just enabled). Selecting skill adds it as a one-off chip (same as `+` menu)
- **Audiences module:** Two-panel layout — left card list + right 8 create cards (no modal). Creation goes to AI chat, not forms.
- **Brand Memory:** 4-folder layout (Website Crawl, Page Crawl, Documents, Saved from Chat) with AI Summary banner on top. Items grouped by source metadata. Header has Refresh + "Ask AI Agent" button. Brand-memory system skill guides setup flow.
- **Reports → Optimizations:** Reports has insights-only AI Summary (no action buttons). Subtle "See recommendations →" link to Optimizations.

## Module Names
Ads Gallery | Creative Hub | Brand Memory | Audiences | Campaigns | Reports | Optimizations | Skills

## Sidebar Navigation (planned)
```
Ads — Campaigns, Audiences, Ad Gallery, Creative Hub
Insights — Brand Memory, Reports, Optimizations
▸ More Tools (collapsed) — Automations, Lead Forms, Events Manager
── Settings
```

## Server Notes
- ESM codebase (`"type": "module"` in package.json)
- CJS packages in ESM: use `createRequire(import.meta.url)` pattern
- Lazy-load optional deps (multer) with try/catch for Vercel compatibility
- PDF extraction: use `import { extractPdfText } from '../lib/pdfExtract.js'` — wraps pdfjs-dist legacy build
- Excel extraction: lazy `createRequire(import.meta.url)('xlsx')` inside route handler
- Meta API calls use user's FB access token from `Authorization: Bearer <token>` header
- Local dev: run server from `server/` directory (`cd server && node src/index.js`) so `.env` loads correctly
