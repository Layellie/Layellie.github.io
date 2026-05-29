# Samet Kaşmer — Portfolio

Single-page, premium personal portfolio for a **Full-Stack Developer & Systems
Engineer** (Layellie). Built with **React + Vite + Tailwind CSS v4 + Framer
Motion + Lucide React**.

🌐 **Live:** https://layellie.github.io/

## Features

- Bold, modern typography with generous whitespace (Webflow-style aesthetic)
- High-contrast, monochrome **dark mode** with a subtle lime accent
- Scroll-triggered **fade-in-up** animations, marquee strip and elegant hovers
- Asymmetric / **bento-box** skills grid
- Large project cards with custom mock UIs
- **Bilingual (TR / EN)** with a language switcher (persisted in `localStorage`)
- **BTK Akademi certificates** mapped to skills (PDFs open in a new tab)
- **Live GitHub stats** (repos, stars, followers) via the GitHub API
- Sticky nav with **scroll-spy**, mobile menu and a scroll progress bar
- Subtle **falling-meteor** background animation
- **SEO:** Open Graph / Twitter meta, JSON-LD Person schema, `sitemap.xml` & `robots.txt`
- All content lives in a single `CONTENT` object — easy to edit

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

Production build:

```bash
npm run build
npm run preview
```

## Deployment (GitHub Pages)

Published at `https://layellie.github.io/` via **GitHub Actions**. Every push to
`main` automatically builds and deploys — no manual step needed:

```bash
git push          # triggers the auto-deploy workflow
```

Manual fallback (push the build to the `gh-pages` branch directly):

```bash
npm run deploy
```

> After connecting a custom domain, update `og:url`, `og:image`,
> `twitter:image` and `canonical` in `index.html`.

## Editing content

All text, skills, projects and certificates live in the **`CONTENT`** object
(with `tr` and `en` trees) at the top of `src/App.jsx`. Language-independent
data (links, email) lives in **`IDENTITY`**. To add a project, append to
`CONTENT.<lang>.projects.items`; for a custom visual, map a component by `id`
in `VISUALS`.

## Tech stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Framework | React 18 + Vite                         |
| Styling   | Tailwind CSS v4                         |
| Animation | Framer Motion                           |
| Icons     | Lucide React                            |
| Fonts     | Clash Display, General Sans (Fontshare) |
| Hosting   | GitHub Pages (auto-deploy via Actions)  |
