# HostelSpace

A modern, premium static website for a student hostel — built with **HTML5, CSS3, and vanilla JavaScript only**. No frameworks, no build tools, no backend. Deploys as-is to GitHub Pages.

## Phase 1 — Project Foundation ✅ (current)

This phase establishes the reusable foundation every later phase builds on:

- Shared page shell (navbar + footer) across `index.html`, `rooms.html`, `room-view.html`, `about.html`
- Global design system in `css/style.css` (colors, type scale, spacing, shadows — all as CSS variables)
- Reusable components: buttons (`.btn--primary`, `.btn--secondary`, `.btn--accent`), cards (`.card`)
- Sticky, responsive navbar with a mobile hamburger menu
- `js/script.js` — mobile nav toggle + active-link highlighting only
- Accessible markup: semantic landmarks, skip link, visible focus states, proper heading order

Page-specific content (Home, Rooms, About, Interactive Room View) is intentionally **not** built yet — each page currently shows a placeholder so the shared layout can be reviewed on its own.

## Project Structure

```text
HostelSpace/
│
├── index.html          # Home (placeholder)
├── rooms.html           # Rooms (placeholder)
├── room-view.html        # Interactive Room View (placeholder)
├── about.html            # About (placeholder)
│
├── css/
│   └── style.css          # Full design system + component styles
│
├── js/
│   └── script.js           # Mobile nav toggle + active nav highlighting
│
├── images/                  # Reserved for future image assets
├── icons/                    # Reserved for future icon assets
└── README.md
```

## Design System

| Token | Value |
|---|---|
| Background | `#F8FAFC` |
| Primary Blue | `#2563EB` |
| Accent Green | `#22C55E` |
| Cards | `#FFFFFF` |
| Text | `#1F2937` |
| Border | `#E5E7EB` |
| Font | [Poppins](https://fonts.google.com/specimen/Poppins) (Google Fonts) |

All tokens are defined as CSS custom properties at the top of `css/style.css` under the **Variables** section.

## Running Locally

No build step required. Either:

1. Open `index.html` directly in a browser, or
2. Serve the folder locally, e.g. `python3 -m http.server`, then visit `http://localhost:8000`

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`.
4. Select the `main` branch and `/ (root)` folder, then save.
5. GitHub will publish the site at `https://<username>.github.io/<repository-name>/`.

## Roadmap

- **Phase 2** — Home page content and hero
- **Phase 3** — Rooms listing page
- **Phase 4** — Interactive Room View
- **Phase 5** — About page content

## Tech Stack

- HTML5
- CSS3 (custom properties, Flexbox, Grid)
- Vanilla JavaScript (no dependencies)
