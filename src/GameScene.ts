import {
  type Scene,
  World,
  Sprite as OrbSprite,
  Entity,
} from "@waldrumpus/orb";
import {
  Sprite,
  Position,
  Animated,
  Enemy,
  FireballHurler,
  Destination,
  Health,
  Projectile,
  Movement,
  Attack,
  Jitter,
  SineFlight,
  RangedAttack,
} from "./components";
import {
  spawnProjectile,
  spawnGargoyle,
  spawnOrk,
  spawnTower,
  spawnWizard,
} from "./entities";
import { clamp, randomInRange } from "./math";

export class GameScene implements Scene {
  private readonly world = new World();

  private readonly tower: Entity;

  private deferredActions: Array<() => void> = [];

  private readonly grassSprite = new OrbSprite("assets/Ground-1.png");
  private readonly groundSprite = new OrbSprite("assets/Ground-2.png");

  private fireballTimer = 0;
  private enemyTimer = 0;

  constructor(
    private readonly width: number,
    private readonly height: number,
  ) {
    spawnWizard(this.world);
    this.tower = spawnTower(this.world);

    spawnOrk(this.world);
  }

  update(dt: number): void {
    this.executeDeferredActions();

    this.removeDeadEnemies();
    this.spawnEnemies(dt);
    this.spawnFireballs(dt);
    this.updateAnimations(dt);
    this.resolveEnemyAttacks(dt);
    this.moveEnemies(dt);
    this.updateProjectiles(dt);
  }

  private removeDeadEnemies(): void {
    const deadEnemies: Entity[] = [];

    this.world.each([Enemy, Health], (e, _, h) => {
      if (h.hp <= 0) {
        deadEnemies.push(e);
      }
    });

    for (const e of deadEnemies) {
      this.world.destroy(e);
    }
  }

  private spawnEnemies(dt: number): void {
    this.enemyTimer += dt;
    if (this.enemyTimer >= 3) {
      //spawnOrk(this.world);
      spawnGargoyle(this.world);
      this.enemyTimer = 0;
    }
  }

  private spawnFireballs(dt: number): void {
    this.fireballTimer += dt;
    if (this.fireballTimer >= 2) {
      let sourcePosition: Position | undefined;

      this.world.each([Position, FireballHurler], (_, p, _f) => {
        sourcePosition = p;
      });

      let targetPosition: Position | undefined;
      this.world.each([Enemy, Position], (_, _e, p) => {
        targetPosition ??= p;
        // TODO: Exit after target has been found
      });

      if (sourcePosition && targetPosition) {
        const { x, y } = sourcePosition;
        const { x: tx, y: ty } = targetPosition;
        this.defer(() => spawnProjectile(this.world, x, y, tx + 32, ty));
      }

      this.fireballTimer = 0;
    }
  }

  private updateAnimations(dt: number): void {
    this.world.each([Sprite, Animated], (_, s, a) => {
      s.update(dt);
    });

    this.world.each([Jitter], (_, j) => {
      j.x = clamp(j.x + randomInRange(-1, 1), -3, 3);
      j.y = clamp(j.y + randomInRange(-1, 1), -3, 3);
    });
  }

  private moveEnemies(dt: number): void {
    this.world.each(
      [Position, Destination, Movement, Enemy],
      (e, position, destination, movement, enemy) => {
        position.x = Math.min(position.x + movement.speed * dt, destination.x);

        const flight = this.world.get(e, SineFlight);
        if (flight) {
          const traveled = position.x - flight.startX;
          const phase = (traveled / flight.wavelength) * 2 * Math.PI;
          const remaining = destination.x - position.x;
          const fade = Math.min(1, remaining / (flight.wavelength / 2));

          position.y =
            destination.y + Math.sin(phase) * flight.amplitude * fade;
        }

        if (position.x >= destination.x) {
          position.x = destination.x;
          this.defer(() => {
            this.world.remove(e, destination);
            this.world.add(
              e,
              new Attack(enemy.attackStrength, enemy.attackInterval),
            );
            this.world.add(e, new Jitter());
          });
        }
      },
    );
  }

  private resolveEnemyAttacks(dt: number): void {
    const readyAttacks: Array<{
      attack: Attack;
      position: Position;
      isRanged: boolean;
    }> = [];

    this.world.each([Enemy, Attack, Position], (e, _, attack, position) => {
      attack.cooldown(dt);
      if (attack.isReady) {
        readyAttacks.push({
          attack,
          position,
          isRanged: this.world.get(e, RangedAttack) !== undefined,
        });
      }
    });

    if (readyAttacks.length === 0) return;

    const towerHealth = this.world.get(this.tower, Health)!;
    const towerPosition = this.world.get(this.tower, Position)!;

    for (const a of readyAttacks) {
      if (a.isRanged) {
        spawnProjectile(
          this.world,
          a.position.x,
          a.position.y,
          towerPosition.x,
          towerPosition.y,
          this.tower,
          a.attack.damage,
          "assets/Trident.png",
          1,
        );
      } else {
        towerHealth.reduce(a.attack.damage);
      }
      a.attack.reset();
    }
  }

  private updateProjectiles(dt: number): void {
    const enemies: Array<{ position: Position; health: Health }> = [];
    this.world.each([Enemy, Position, Health], (_, _enemy, position, health) => {
      enemies.push({ position, health });
    });

    this.world.each(
      [Position, Destination, Movement, Projectile],
      (entity, position, destination, movement, projectile) => {
        const dx = destination.x - position.x;
        const dy = destination.y - position.y;
        const distance = Math.hypot(dx, dy);
        const step = movement.speed * dt;
        const arrived = step >= distance;
        if (arrived) {
          position.x = destination.x;
          position.y = destination.y;
        } else {
          const fraction = step / distance;
          position.x += dx * fraction;
          position.y += dy * fraction;
        }

        let hit: Health | undefined;
        if (projectile.target === undefined) {
          hit = enemies.find(
            (enemy) =>
              enemy.health.hp > 0 &&
              Math.hypot(
                enemy.position.x - position.x,
                enemy.position.y - position.y,
              ) < 4,
          )?.health;
        } else if (arrived) {
          hit = this.world.get(projectile.target, Health);
        }

        hit?.reduce(projectile.damage);
        if (hit || arrived) {
          this.defer(() => this.world.destroy(entity));
        }
      },
    );
  }

  private defer(action: () => void): void {
    this.deferredActions.push(action);
  }

  private executeDeferredActions(): void {
    for (const a of this.deferredActions) {
      a();
    }
    this.deferredActions.length = 0;
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.world.each(
      [Sprite, Position],
      (_, s, p) => {
        s.render(ctx, p.x, p.y);
      },
      { without: [Jitter] },
    );
    this.world.each([Sprite, Position, Jitter], (_, s, p, j) => {
      s.render(ctx, p.x + j.x, p.y + j.y);
    });
    this.renderGround(ctx);
    this.world.each([Position, Health], (_, p, h) => {
      ctx.strokeStyle = "red";
      ctx.fillStyle = "red";
      ctx.strokeRect(p.x, p.y + 16, 16, 4);
      ctx.fillRect(p.x, p.y + 16, 16 * h.percentage, 4);
    });
  }

  private renderGround(ctx: CanvasRenderingContext2D): void {
    let sprite = this.grassSprite;

    for (let y = 140; y < this.height; y += 16) {
      sprite.y = y;
      for (let x = 0; x < this.width; x += 16) {
        sprite.x = x;
        sprite.render(ctx);
      }
      sprite = this.groundSprite;
    }
  }
}
