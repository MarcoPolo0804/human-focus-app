# Human Focus

Human Focus is a small focus-timer app with a twist: instead of a bare countdown, you're keeping a little character alive. Every focus session you complete lets them grow up a little — from newborn to infant, kid, teenager, adult, and finally elder. Every session you abandon ages them faster and eventually makes them sick. There are no complicated settings or accounts to configure — you pick a duration, hit start, and either the timer wins or you do.

## Why a "silly" life-and-death mechanic helps you focus

Plain timers are easy to ignore. A blinking `24:59` doesn't feel like it's asking anything of you, so it's easy to alt-tab away, check a notification, or just give up early with no real consequence.

Human Focus works because it borrows a trick from games and habit apps: it turns "stay focused" into "don't let something you're responsible for get hurt."

- **Loss aversion beats a blank countdown.** Abandoning a session doesn't just reset a number — it visibly ages your character and can make them sick. That small, personal stake is often enough to make you stick out the last five minutes instead of quitting.
- **Progress you can see.** Life stages and the life bar give you a visual record of consistency over time, not just today's single session. Finishing sessions is literally how your character grows up.
- **Low friction, no guilt spiral.** There's no streak-shaming, no punishing UI. If you abandon a session, the character just gets a little older and a "feeling under the weather" nudge — not a wall of red numbers. It's honest feedback without being discouraging.
- **Optional accountability.** Focus Together lets you start a synced session with someone else in real time, so you're not just accountable to a cartoon — you're accountable to a person who can see whether you actually stayed.
- **A nudge, not a lecture.** The Motivation Spark button pops up a short, randomly-picked line of encouragement in a small card you can drag anywhere on screen and dismiss whenever you want — there when you want a boost, invisible when you don't.

None of this replaces real focus techniques — it's not therapy, and it won't do the work for you. What it does is make the *decision to keep going* feel like it matters in the moment, which is often the only push a simple Pomodoro-style timer is missing.

## Features

- ⏱️ **Focus sessions** — pick a duration (1–180 minutes) and start a countdown.
- 🧑‍🍼 **A character that ages with you** — 6 life stages (Newborn → Infant → Kid → Teenager → Adult → Elder), each with its own art and idle animation.
- ❤️ **A life bar** — tracks progress across stages; too many abandoned sessions and the character's life ends (Game Over, with an option to restart).
- 🏆 **Leaderboard** — see how your completed sessions and focus minutes stack up against others (requires Supabase, see below).
- 👥 **Focus Together** — host or join a room code to run a synced focus session with someone else in real time.
- ✨ **Motivation Spark** — a floating button that spawns small draggable cards with a random encouraging quote; pin up to 3 anywhere on screen, or clear them all at once.
- 💾 **Local persistence** — your character's state is saved to `localStorage`, so progress survives a page reload.

## Tech stack

- [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Supabase](https://supabase.com/) (Postgres + Realtime) for the leaderboard and Focus Together

## Getting started

```bash
npm install
npm run dev
```

The app runs without any setup — the Leaderboard and Focus Together features will simply show a "not set up yet" message until Supabase is configured.

### Optional: enabling the Leaderboard and Focus Together

1. Create a free project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env` and fill in your project's URL and anon key:
   ```bash
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
3. Restart the dev server.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run oxlint |
