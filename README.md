# Hang Daro Portfolio

A pixel-art, game-style portfolio for Hang Daro, Android Development Engineer (Flutter & native).

Built with **Next.js 15**, **React 19** and **TypeScript**. The animated meadow in the hero is drawn on a `<canvas>`; everything else is React components and plain CSS.

## Edit your content

All text lives in [`data/profile.ts`](data/profile.ts): name, roles, summary, stats, jobs (quest log), projects (trophies), skills (inventory), education and contact links. Change it there and the whole site updates.

## Project structure

```
app/
  layout.tsx       Fonts (Silkscreen + Pixelify Sans) and page metadata
  page.tsx         Puts the sections together
  globals.css      All styles
components/
  Nav.tsx          Sticky menu with the scroll XP bar
  Hero.tsx         Title, typing roles and buttons
  HeroScene.tsx    Animated Phnom Penh riverside (drawing code in lib/scene.ts)
  Mascot.tsx       Dororo, the clickable pixel phone
  About.tsx        Summary and counters
  QuestLog.tsx     Work experience timeline
  Trophies.tsx     Project cards (TrophyCard.tsx adds the 3D tilt)
  Inventory.tsx    Skills with level bars
  SavePoints.tsx   Education
  Contact.tsx      Dialogue box with email, LinkedIn and location
  Reveal.tsx       Scroll-in animations and count-up numbers
  ClickSparks.tsx  Pixel sparks on click
data/profile.ts    All the content
lib/sprites.ts     Pixel-art sprites (coin, star, phone)
```

## Run locally

Requires Node.js 18.18 or newer.

```sh
npm install
npm run dev
```

Then open http://localhost:3000.

## Messages to Telegram

The chat button (bottom-left) sends visitors' messages to `/api/message`. A small Cloudflare Worker (`worker/index.ts`) forwards them to your Telegram through a bot. Visitors leave an email or a Telegram @username, and you reply to them there.

One-time setup:

1. In Telegram, open **@BotFather**, send `/newbot` and follow the steps. Copy the **bot token** it gives you.
2. Open your new bot and press **Start** (send it any message).
3. Find your **chat id**: open **@userinfobot** in Telegram and press Start. It replies with your id (a number).
4. In the Cloudflare dashboard, open **portfolio-0206 → Settings → Variables and Secrets** and add two **Secrets**:
   - `TELEGRAM_BOT_TOKEN`: the bot token
   - `TELEGRAM_CHAT_ID`: your chat id
5. Redeploy (or push any commit). Send yourself a test message from the site.

Until the secrets are set, the chat shows a friendly "please email instead" message.

## Deploy on Cloudflare

The site is exported as static files into `out/` (see `next.config.mjs`), and `wrangler.jsonc` tells Cloudflare to serve that folder.

1. In the [Cloudflare dashboard](https://dash.cloudflare.com), go to **Workers & Pages → Create → Import a repository**.
2. Connect GitHub and pick `portfolio_0206`.
3. Use these settings:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
4. Click **Deploy**. You get a free `*.workers.dev` link, and every push to `main` redeploys.

To deploy from your own computer instead: `npm run build`, then `npx wrangler login` and `npx wrangler deploy`.
