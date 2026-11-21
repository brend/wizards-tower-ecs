import { Engine } from "@waldrumpus/orb";
import { GameScene } from "./GameScene";

const width = 320;
const height = 180;
const zoom = 3;
const scene = new GameScene(width, height);
const engine = new Engine(width, height, scene, false, document.title, zoom);

engine.start();
