# The Drama — Film Club

Next.js + Supabase app for the live activities from the meetup: Film Rating
(live rating), Character Match (quiz), and Confessions & Red Flags
(live voting), plus a live Event Results page.

## Quick start for collaborators

Supabase is already fully set up — nothing to configure there. The only thing missing after cloning is the keys: `.env.local` is not pushed to git, so you must create it yourself (step 3).

1. Clone the repo and open it:
   ```
   git clone https://github.com/bungedrews/the-drama.git
   cd the-drama
   ```
2. Install dependencies (needs Node 18+):
   ```
   npm install
   ```
3. Create an env file: `.env.local`, a copy of .env.local.example, then paste in the
   Supabase **Project URL** and **anon key**.

4. Start the app:
   ```
   npm run dev
   ```
