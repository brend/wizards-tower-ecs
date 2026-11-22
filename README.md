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

## Debug in Firefox from Zed

With Firefox installed and `npm ci` complete, open Zed's command palette and run `task: spawn`, then select **Debug game in Firefox**. This starts Vite and opens the game in Firefox with Developer Tools. In Firefox's **Debugger** tab, open `src/GameScene.ts` to set a breakpoint in the original TypeScript. Stop the Vite server with Ctrl+C in the Zed task terminal when you're done.

Firefox breakpoints are managed in Firefox Developer Tools. [Firefox Debugger documentation](https://firefox-source-docs.mozilla.org/devtools-user/debugger/)

## Debug in Edge from Zed

1. Run `task: spawn` in Zed and select **Start Vite for Edge debugging**. Wait for Vite to show `http://127.0.0.1:5173/`.
2. Set a breakpoint in the Zed editor gutter, for example in `src/GameScene.ts`.
3. Run `debugger: start` (F4) and select **Debug game in Edge**.

Stop the Vite task with Ctrl+C in its terminal when you're done.
