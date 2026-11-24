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
  SineFlight,
  RangedAttack,
  Scaled,
  XpDonor,
  Minion,
} from "./components";

const width = 320;
export const projectileSpeed = 120;

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
    new XpDonor(1),
  );
}

export function spawnHulk(world: World): Entity {
  return world.create(
    new Sprite("assets/Ork.png", 2),
    new Position(0, 126),
    new Health(5),
    new Animated(),
    new Scaled(1.5),
    new SineFlight(1, 8, 0),
    new Enemy(1, 3),
    new Movement(12),
    new Destination(width - 64, 126),
    new XpDonor(3),
  );
}

export function spawnRunner(world: World): Entity {
  return world.create(
    new Sprite("assets/Runner.png", 2),
    new Position(0, 126),
    new Health(3),
    new Animated(),
    new SineFlight(1, 8, 0),
    new Enemy(1, 3),
    new Movement(28),
    new Destination(width - 64, 126),
    new XpDonor(3),
  );
}

export function spawnGargoyle(world: World): Entity {
  return world.create(
    new Sprite("assets/Gargoyle.png", 2),
    new Position(0, 60),
    new Health(2),
    new Animated(),
    new Enemy(1, 3),
    new Movement(16),
    new Destination(width - 96, 60),
    new SineFlight(4, 32, 0),
    new RangedAttack(),
    new XpDonor(2),
  );
}

export function spawnSkeleton(world: World): Entity {
  return world.create(
    new Sprite("assets/Skeleton.png", 2),
    new Position(260, 126),
    new Health(2),
    new Animated(),
    new Minion(),
    new Movement(-16),
  );
}

export function spawnProjectile(
  world: World,
  x: number,
  y: number,
  tx: number,
  ty: number,
  target: Entity | undefined = undefined,
  damage = 1,
  spritesheet = "assets/Fireball.png",
  frameCount = 2,
): Entity {
  return world.create(
    new Sprite(spritesheet, frameCount),
    new Position(x, y),
    new Destination(tx, ty),
    new Animated(),
    new Projectile(damage, target),
    new Movement(projectileSpeed),
  );
}

export type EnemySpawner = (world: World) => Entity;

export function chooseEnemySpawningFunction(
  randomNumber: number,
  chances: Map<EnemySpawner, number>,
): (world: World) => Entity {
  if (randomNumber < 0 || randomNumber >= 1)
    throw new Error("random number must range within [0;1)");

  let cumulativeChance = 0;

  for (const [spawn, chance] of chances) {
    cumulativeChance += chance;
    if (randomNumber < cumulativeChance) return spawn;
  }

  return spawnOrk;
}

export function getEnemySpawnChances(): Map<EnemySpawner, number> {
  return new Map<EnemySpawner, number>([
    [spawnGargoyle, 0.15],
    [spawnRunner, 0.15],
    [spawnHulk, 0.05],
  ]);
}
