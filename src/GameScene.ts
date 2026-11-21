import { type Scene, World, Sprite as OrbSprite, Entity } from "@waldrumpus/orb";
import { Sprite, Position, Animated, Enemy, FireballHurler, Destination, Health, Projectile, Movement, Attack } from "./components";
import { spawnFireball, spawnOrk, spawnTower, spawnWizard } from "./entities";

export class GameScene implements Scene {
  private readonly world = new World();

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
    spawnTower(this.world);

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
    this.moveProjectiles(dt);
    this.handleCollisions();
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

  private handleCollisions(): void {
    const enemies: Array<{ entity: Entity, position: Position, health: Health }> = [];
    const projectiles: Array<{ entity: Entity, position: Position, damage: number, remainingHits: number }> = [];

    this.world.each([Enemy, Position, Health], (e, _, p, h) => {
      enemies.push({ entity: e, position: p, health: h });
    });

    this.world.each([Projectile, Position], (e, f, p) => {
      projectiles.push({ entity: e, position: p, damage: f.damage, remainingHits: 1 });
    });

    for (const p of projectiles) {
      for (const e of enemies) {
        if (e.health.hp <= 0) continue;
        const dx = e.position.x - p.position.x;
        const dy = e.position.y - p.position.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 4) {
          e.health.reduce(p.damage);
          p.remainingHits -= 1;
          if (p.remainingHits <= 0) {
            this.defer(() => this.world.destroy(p.entity));
            break;
          }
        }
      }
    }
  }

  private spawnEnemies(dt: number): void {
    this.enemyTimer += dt;
    if (this.enemyTimer >= 3) {
      spawnOrk(this.world);
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
        this.defer(() => spawnFireball(this.world, x, y, tx + 32, ty));
      }

      this.fireballTimer = 0;
    }
  }

  private updateAnimations(dt: number): void {
    this.world.each([Sprite, Animated], (_, s, a) => {
      s.update(dt);
    });
  }

  private moveEnemies(dt: number): void {
    this.world.each([Position, Destination, Movement, Enemy], (enemy, p, t, m) => {
      p.x += m.speed * dt;
      if (p.x >= t.x) {
        p.x = t.x;
        this.defer(() => this.world.remove(enemy, t));
      }
    });
  }

  private resolveEnemyAttacks(dt: number): void {
    const readyAttacks = [];

    this.world.each([Enemy, Attack], (_, _e, a) => {
      a.cooldown(dt);
      if (a.isReady) {
        // TODO: Perform the attack
        a.reset();
      }
    });
  }

  private moveProjectiles(dt: number): void {
    this.world.each([Position, Destination, Movement, Projectile], (e, p, t, m) => {
      const dx = t.x - p.x;
      const dy = t.y - p.y;
      const distance = Math.hypot(dx, dy);
      const step = m.speed * dt;
      if (step >= distance) {
        p.x = t.x;
        p.y = t.y;
        this.defer(() => this.world.destroy(e));
        return;
      }

      const fraction = step / distance;
      p.x += dx * fraction;
      p.y += dy * fraction;
    });
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
    this.world.each([Sprite, Position], (_, s, p) => {
      s.render(ctx, p.x, p.y);
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
