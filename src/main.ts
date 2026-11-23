import { Engine } from "@waldrumpus/orb";
import { GameScene } from "./GameScene";

const width = 320;
const height = 180;
const zoom = 3;
const scene = new GameScene(width, height);
const engine = new Engine(width, height, scene, false, document.title, zoom);

const soundButton = document.querySelector<HTMLButtonElement>("#enableSound")!;
soundButton.addEventListener("click", async () => {
  soundButton.disabled = true;
  try {
    soundButton.hidden = await scene.enableSound();
  } catch (error) {
    console.error("Could not enable game sound", error);
  } finally {
    soundButton.disabled = false;
  }
});

engine.start();
