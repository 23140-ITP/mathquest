# MathQuest: Four Realms

A dependency-free browser game for Class 9–10 mathematics. Players restore four sequential realms by completing 20 handcrafted challenges covering algebra, geometry, coordinates, and probability.

## Play locally

No install or build is required. Serve the repository with any static server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`. Run the engine checks with Node 20 or newer:

```bash
npm test
```

## Controls

- Mouse, touch, and keyboard work throughout.
- Coordinate levels support the arrow keys or on-screen direction pad.
- Sound and animation can be disabled from the header.
- Progress and stars are saved in the browser with `localStorage`.
- The reset action clears all saved progress after confirmation.

## Curriculum coverage

- **Algebra Escape Room:** linear equations, variables on both sides, quadratic roots, and word problems.
- **Geometry Defense:** angle properties, triangles, Pythagoras, and similarity.
- **Coordinate Treasure Hunt:** quadrants, plotting, reflection, translation, and midpoint.
- **Probability Dungeon:** simple events, compound outcomes, and theoretical versus experimental probability.

## Architecture

`levels.js` contains all game content. `games.js` contains pure validation, scoring, progression, and persistence logic. `app.js` renders the single-page state machine and the three shared interaction types. All illustrations are inline SVG/CSS; there are no APIs, external assets, runtime dependencies, or network requests after the initial static files load.

## Publish with GitHub Pages

Push the repository to GitHub, then open **Settings → Pages** and choose **Deploy from a branch**, branch `main`, folder `/ (root)`. The app uses only relative paths, so it works under a repository Pages URL.

Live demo: add your GitHub Pages URL here before submission.

## Build Week notes

Codex and GPT-5.6 were used to define the reusable game engine, create and verify the 20 curriculum-neutral challenges, test sequential progression and corrupted-storage recovery, and implement responsive and accessible interaction states.
