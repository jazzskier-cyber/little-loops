# Little Loops

An original, tactile ring-untangling puzzle for phones and desktop browsers. Drag glossy pastel rings to point their openings toward their neighbors. Clear the outside rings first, then work inward until the whole tangle is free.

## Play

- 24 original, deterministic levels in four chapters.
- Daily puzzle based on the UTC date; identical puzzle for every player that day.
- Touch and mouse rotation, plus button and keyboard alternatives.
- With the canvas focused: ↑/↓ select a ring, ←/→ turn it, Enter/Space releases it.
- Hints show a loose ring and the target opening with a gold dotted guide.
- Undo, restart, local progress, best stars and move records, optional synthesized chimes.
- Three stars: no hints and at most two extra moves; two stars: at most one hint and no more than twice the ring count plus three moves. Other completions earn one star. Undo costs a move. Button rotations are a preview until Let go is pressed.
- No timer, lives, ads, purchases, external image assets, account requirement, or cloud saves.
- One leaderboard, **Loops let go**: every loop you have freed. Each journey level counts once with all its loops, and each day's fresh tangle adds its loops the first time it is solved; replays never add. Higher is better. The total shows on the home screen, after every puzzle, and in the ♕ Rankings dialog.

## AIWANNA leaderboard

Live at https://www.aiwanna.games/games/81326f2133bcf4097677e223ad0034b0-2686d9c4. `src/leaderboard-config.js` holds the game id, slug and board id of `loops-let-go-v1` (desc, count, 1–1,000,000, no minimum play time). Played outside AIWANNA, the game never contacts the platform and keeps the total on the device. When embedded, the game asks every official AIWANNA origin for a player session (the browser only delivers to the real parent), registers a run when each puzzle starts, and submits the cumulative total when it is finished, so a failed submission catches up on the next puzzle. Saves from before the leaderboard are credited with their recorded daily tangles.

The puzzle is a discrete ring-link model with 3D rendering, not a rigid-body physics simulation. Orthogonally adjacent rings form a tree. A ring can be removed when its opening clears every remaining neighbor. This guarantees a loose end always exists. Intersections are rendered with complementary heights to make the rings weave over and under one another.

## Languages

English (original), 简体中文, 日本語, 한국어 and Español. Every player-visible string lives in `src/i18n/<lang>.json` with identical keys; `src/i18n.js` picks `?lang=` first (the AIWANNA player always passes it), then the browser language, then English. HTML elements use `data-i18n`, `data-i18n-html`, `data-i18n-aria` and `data-i18n-title`. The same files are uploaded to AIWANNA with `upload_game_text`; after changing text, run the tests (they check keys, placeholders and line breaks) and upload again.

## Run

Node.js 22.12+ (24 recommended).

```sh
npm ci
npm run dev
npm test
npm run build
```

Preview: http://127.0.0.1:5183/. Production directory: `dist/`. Vite builds relative asset URLs for embedded/static hosting. Requires WebGL2. Progress is stored only in localStorage under `little-loops-v1`; unavailable storage does not block play. Supports reduced-motion preferences.

All visual assets are procedural Three.js geometry and CSS. Original name, layout, levels, code and art. Inspired by the general rotating-ring puzzle mechanic; no reference-app assets or level data were used.

## Publishing

Title: Little Loops

Description: A little twist, a clear mind. Rotate colorful rings, find the loose ends, and let a lovely little tangle go. Enjoy 24 handcrafted-seed puzzles, a fresh daily tangle, gentle hints, undo, and satisfying 3D rings. No rush, no lives—just a little progress.

Category: Puzzle. Tags: 3D, Relaxing, Rings, Daily, Touch. Five languages. Media: `media/cover.png` (main cover), `media/base.png` (text-free base for localized covers), `media/shots/`. Phone-first responsive layout. Typical level: 1–3 minutes.
