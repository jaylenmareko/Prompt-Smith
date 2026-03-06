# PromptForge

AI prompt generator app that creates optimized prompts for various AI tools.

## Architecture
- **Frontend**: React + Vite + TypeScript, Tailwind CSS with shadcn/ui components
- **Backend**: Express.js with session-based auth (passport-local)
- **Database**: PostgreSQL (Replit built-in) with Drizzle ORM
- **AI**: Anthropic Claude via Replit AI Integrations (claude-sonnet-4-6)
- **Auth**: Email/password with express-session + connect-pg-simple

## Database Tables
- `profiles` - User accounts with plan info and usage tracking
- `conversations` - Chat conversation history
- `chat_messages` - Individual messages within conversations
- `saved_prompts` - User's saved prompt outputs

## Key Routes
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/user` - Get current user
- `POST /api/generate` - Generate prompt (SSE streaming)
- `GET /api/conversations` - List conversations
- `GET /api/conversations/:id/messages` - Get conversation messages
- `DELETE /api/conversations/:id` - Delete conversation
- `GET /api/saved-prompts` - List saved prompts
- `POST /api/saved-prompts` - Save a prompt
- `DELETE /api/saved-prompts/:id` - Delete saved prompt

## Pages
- `/login` - Login/signup page
- `/dashboard` or `/` - Main chat interface (protected)
- `/pricing` - Pricing plans

## Design
- Dark theme only (class="dark" on html)
- Colors: Background #0f0f0f, Sidebar #161616, Gold accent #c8a96e, Text #f0ece4
- Font: Inter
- Claude/ChatGPT-inspired chat UI
- Supported tools: ChatGPT, Midjourney, Cursor, Replit, Claude, DALL·E, Sora, Gemini

## Plans
- Free: 5 prompts/day
- Starter ($2/mo): 200 prompts/month
- Pro ($5/mo): 600 prompts/month
- Unlimited ($10/mo): Unlimited
