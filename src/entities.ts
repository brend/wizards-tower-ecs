import { Entity, World } from "@waldrumpus/orb";
import {
  Animated,
  Enemy,
  FireballHurler,
  Health,
  Position,
  Projectile,
  Sprite,
  Destination,
  Movement,
} from "./components";

const width = 320;

export function spawnWizard(world: World): Entity {
  return world.create(
    new Sprite("assets/Wizard.png", 4),
    new Position(width - 58, 38),
    new Animated(),
    new FireballHurler(),
  );
}

export function spawnTower(world: World): Entity {
  return world.create(
    new Sprite("assets/Tower.png"),
    new Position(width - 64, 32),
    new Health(10),
  );
}

export function spawnOrk(world: World): Entity {
  return world.create(
    new Sprite("assets/Ork.png", 2),
    new Position(0, 126),
    new Health(2),
    new Animated(),
    new Enemy(1, 3),
    new Movement(16),
    new Destination(width - 64, 126),
  );
}

export function spawnFireball(
  world: World,
  x: number,
  y: number,
  tx: number,
  ty: number,
): Entity {
  return world.create(
    new Sprite("assets/Fireball.png", 2),
    new Position(x, y),
    new Destination(tx, ty),
    new Animated(),
    new Projectile(1),
    new Movement(120),
  );
}
