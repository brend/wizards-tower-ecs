import { type Scene, World, Sprite as OrbSprite, Entity } from "@waldrumpus/orb";
import { Sprite, Position, Animated, Enemy, FireballHurler, Target, Health, Projectile } from "./components";
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
    this.moveEnemies(dt);
    this.moveProjectiles();
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
    const projectiles: Array<{ entity: Entity, position: Position, remainingHits: number }> = [];

    this.world.each([Enemy, Position, Health], (e, _, p, h) => {
      enemies.push({ entity: e, position: p, health: h });
    });

    this.world.each([Projectile, Position], (e, _, p) => {
      projectiles.push({ entity: e, position: p, remainingHits: 1 });
    });

    for (const p of projectiles) {
      for (const e of enemies) {
        const dx = e.position.x - p.position.x;
        const dy = e.position.y - p.position.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 4) {
          e.health.reduce(1);
          p.remainingHits -= 1;
          if (p.remainingHits <= 0) {
            this.defer(() => this.world.destroy(p.entity));
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
        targetPosition = p;
// TODO: Exit after target has been found
      });

      if (sourcePosition && targetPosition) {
        const { x, y } = sourcePosition;
        const { x: tx, y: ty } = targetPosition;
        this.defer(() => spawnFireball(this.world, x, y, tx, ty));
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
    this.world.each([Position, Enemy], (_, p, _e) => {
      p.x += 10 * dt;
    });
  }

  private moveProjectiles(): void {
    this.world.each([Position, Target], (_, p, t) => {
      const dx = t.x - p.x;
      const dy = t.y - p.y;
      const angle = Math.atan2(dy, dx);
      const speed = 10;
      p.x += speed * Math.cos(angle);
      p.y += speed * Math.sin(angle);
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
