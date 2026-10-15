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
  MeadowScene.tsx  Animated pixel landscape (canvas)
  Mascot.tsx       Droidy, the clickable pixel phone
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

## Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New → Project** and import `portfolio_0206`.
3. Click **Deploy**. Vercel detects Next.js automatically.

Every push to `main` redeploys the site.
