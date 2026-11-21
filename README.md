# Wizard's Tower

Welcome to the Wizard's Tower! 

Defend it or succumb to the Orks!

```sh
cp -R templates/game ../my-game
cd ../my-game
npm ci
npm run dev
```

Change the package name in `package.json` and run `npm install --package-lock-only` to update the lockfile. Set the game title in `index.html`, set the canvas size and zoom in `src/main.ts`, and put your game logic in `src/GameScene.ts`. Orb calls `update(dt)` with elapsed seconds and `render(ctx)` with a 2D canvas context.

Run `npm run typecheck` to check the TypeScript. `npm run build` checks the types and builds the site into `dist/`. Use `npm run preview` to serve that build locally. Vite uses relative URLs so you can host `dist/` at the site root or under a subdirectory.
