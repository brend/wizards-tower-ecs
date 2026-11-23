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
  Scaled,
  XpDonor,
} from "./components";
import {
  projectileSpeed,
  spawnProjectile,
  spawnOrk,
  spawnTower,
  spawnWizard,
  chooseEnemySpawningFunction,
  getEnemySpawnChances,
} from "./entities";
import { clamp, randomInRange, predictEnemyPosition } from "./math";
import { Upgrade } from "./levelup";

type RenderingContext = CanvasRenderingContext2D;
type GameState = "playing" | "levelup";

export class GameScene implements Scene {
  private readonly world = new World();

  private readonly tower: Entity;

  private deferredActions: Array<() => void> = [];

  private readonly grassSprite = new OrbSprite("assets/Ground-1.png");
  private readonly groundSprite = new OrbSprite("assets/Ground-2.png");

  private state: GameState = "playing";
  private fireballTimer = 0;
  private fireballInterval = 1.5;
  private fireballPierce = 0;
  private enemyTimer = 0;
  private enemyInterval = 3;
  private xp = 0;
  private nextLevelXp = 5;
  private upgradeChoices: Upgrade[] | null = null;
  private readonly upgradeLevels = new Map<Upgrade["name"], number>();

  private readonly enemySpawnChances = getEnemySpawnChances();

  constructor(
    private readonly width: number,
    private readonly height: number,
  ) {
    spawnWizard(this.world);
    this.tower = spawnTower(this.world);

    spawnOrk(this.world);
  }

  update(dt: number): void {
    switch (this.state) {
      case "levelup":
        this.updateLevelupScreen(dt);
        break;
      case "playing":
        this.updateGameplay(dt);
        break;
    }
  }

  private updateLevelupScreen(dt: number): void {}

  onPointerDown(x: number, y: number): void {
    const choices = this.upgradeChoices;
    if (this.state !== "levelup" || choices === null) return;

    const choice = choices.find((_, index) => {
      const bounds = this.getUpgradeBounds(index, choices.length);
      return (
        x >= bounds.x &&
        x < bounds.x + bounds.width &&
        y >= bounds.y &&
        y < bounds.y + bounds.height
      );
    });
    if (!choice) return;

    this.applyUpgrade(choice.name);
    this.upgradeLevels.set(choice.name, this.getUpgradeLevel(choice.name) + 1);
    this.nextLevelXp = this.nextLevelXp * 1.5; // TODO: Find better algorithm
    this.upgradeChoices = null;
    this.state = "playing";
  }

  private applyUpgrade(name: string): void {
    switch (name) {
      case "Life":
        this.world.get(this.tower, Health)!.increase(1);
        break;
      case "Speed":
        this.fireballInterval *= 0.9;
        break;
      case "Piercing":
        break;
      default:
        throw new Error(`unknown upgrade name: "${name}"`);
    }
  }

  getUpgradeLevel(name: Upgrade["name"]): number {
    return this.upgradeLevels.get(name) ?? 0;
  }

  private getUpgradeBounds(index: number, count: number) {
    const columnWidth = this.width / count;
    const width = Math.min(64, columnWidth - 8);
    const height = 44;
    return {
      x: (index + 0.5) * columnWidth - width / 2,
      y: (this.height - height) / 2,
      width,
      height,
    };
  }

  private updateGameplay(dt: number): void {
    this.executeDeferredActions();
    this.removeDeadEnemies();

    if (this.xp >= this.nextLevelXp) {
      this.upgradeChoices = this.rollUpgrades();
      this.state = "levelup";
      return;
    }

    this.spawnEnemies(dt);
    this.spawnFireballs(dt);
    this.updateAnimations(dt);
    this.resolveEnemyAttacks(dt);
    this.moveEnemies(dt);
    this.updateProjectiles(dt);
  }

  private rollUpgrades(): Upgrade[] {
    return [
      { name: "Life", sprite: new OrbSprite("assets/Upgrade-Tower.png") },
      { name: "Speed", sprite: new OrbSprite("assets/Upgrade-Fireball.png") },
      {
        name: "Piercing",
        sprite: new OrbSprite("assets/Upgrade-Fireball.png"),
      },
    ];
  }

  private removeDeadEnemies(): void {
    const deadEnemies: Entity[] = [];

    this.world.each([Enemy, Health], (e, _, h) => {
      if (h.hp <= 0) {
        deadEnemies.push(e);
      }
    });

    for (const e of deadEnemies) {
      this.killEnemy(e);
    }
  }

  private killEnemy(e: Entity): void {
    const xpDonation = this.world.get(e, XpDonor);
    if (xpDonation) {
      this.xp += xpDonation.xp;
    }
    this.world.destroy(e);
  }

  private spawnEnemies(dt: number): void {
    this.enemyTimer += dt;
    if (this.enemyTimer >= this.enemyInterval) {
      const chance = Math.random();
      const spawn = chooseEnemySpawningFunction(chance, this.enemySpawnChances);
      spawn(this.world);
      this.enemyTimer = 0;
    }
  }

  private spawnFireballs(dt: number): void {
    this.fireballTimer += dt;
    if (this.fireballTimer >= this.fireballInterval) {
      let sourcePosition: Position | undefined;

      this.world.each([Position, FireballHurler], (_, p, _f) => {
        sourcePosition = p;
      });

      let target: { entity: Entity; position: Position } | undefined;
      this.world.each([Enemy, Position], (entity, _, position) => {
        if (!target || position.x > target.position.x) {
          target = { entity, position };
        }
      });

      if (sourcePosition && target) {
        const aim = this.getFireballAim(
          sourcePosition,
          target.entity,
          target.position,
        );
        spawnProjectile(
          this.world,
          sourcePosition.x,
          sourcePosition.y,
          aim.x,
          aim.y,
        );
      }

      this.fireballTimer = 0;
    }
  }

  private getFireballAim(
    source: Position,
    target: Entity,
    position: Position,
  ): Position {
    const destination = this.world.get(target, Destination);
    const movement = this.world.get(target, Movement);
    if (
      !destination ||
      !movement ||
      movement.speed <= 0 ||
      position.x >= destination.x
    ) {
      return position;
    }

    const { speed } = movement;
    const flight = this.world.get(target, SineFlight);
    const timeToStop = (destination.x - position.x) / speed;
    const stop = { x: destination.x, y: flight ? destination.y : position.y };
    if (
      Math.hypot(stop.x - source.x, stop.y - source.y) >=
      projectileSpeed * timeToStop
    ) {
      return stop;
    }

    // Find when the fireball's travel distance matches the distance to the enemy.
    let tooSoon = 0;
    let reachable = timeToStop;
    let aim = stop;
    while ((reachable - tooSoon) * projectileSpeed > 0.1) {
      const time = (tooSoon + reachable) / 2;
      const predicted = predictEnemyPosition(
        position,
        destination,
        speed,
        flight,
        time,
      );
      if (
        Math.hypot(predicted.x - source.x, predicted.y - source.y) >
        projectileSpeed * time
      ) {
        tooSoon = time;
      } else {
        reachable = time;
        aim = predicted;
      }
    }
    return aim;
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
        const flight = this.world.get(e, SineFlight);
        const next = predictEnemyPosition(
          position,
          destination,
          movement.speed,
          flight,
          dt,
        );
        position.x = next.x;
        position.y = next.y;

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
    this.world.each(
      [Enemy, Position, Health],
      (_, _enemy, position, health) => {
        enemies.push({ position, health });
      },
    );

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

  render(ctx: RenderingContext): void {
    this.world.each([Sprite, Position], (e, s, p) => {
      this.renderCreature(ctx, e, s, p);
    });
    this.renderGround(ctx);
    this.world.each([Position, Health], (_, p, h) => {
      ctx.strokeStyle = "red";
      ctx.fillStyle = "red";
      ctx.strokeRect(p.x, p.y + 16, 16, 4);
      ctx.fillRect(p.x, p.y + 16, 16 * h.percentage, 4);
    });
    this.renderHud(ctx);
  }

  private renderCreature(
    ctx: RenderingContext,
    e: Entity,
    sprite: Sprite,
    position: Readonly<Position>,
  ): void {
    const jitter = this.world.get(e, Jitter);
    const x = position.x + (jitter?.x ?? 0);
    const y = position.y + (jitter?.y ?? 0);
    const scale = this.world.get(e, Scaled)?.scale;
    if (scale) {
      ctx.save();
      ctx.translate(x, y - 8);
      ctx.scale(scale, scale);
      sprite.render(ctx, 0, 0);
      ctx.restore();
    } else {
      sprite.render(ctx, x, y);
    }
  }

  private renderGround(ctx: RenderingContext): void {
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

  private renderHud(ctx: RenderingContext): void {
    ctx.fillStyle = "white";
    ctx.font = "6px monospace";
    ctx.fillText(`XP: ${this.xp}`, 290, 20);

    const upgrades = this.upgradeChoices;
    if (this.state === "levelup" && upgrades !== null) {
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.textAlign = "center";
      ctx.strokeStyle = "white";
      upgrades.forEach((upgrade, index) => {
        const { x, y, width, height } = this.getUpgradeBounds(
          index,
          upgrades.length,
        );
        const centerX = x + width / 2;
        ctx.fillStyle = "#172036";
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = "white";
        ctx.fillText(upgrade.name, centerX, y + height - 6);
        upgrade.sprite.x = centerX - upgrade.sprite.width / 2;
        upgrade.sprite.y = y + 4;
        upgrade.sprite.render(ctx);
      });
      ctx.restore();
    }

    ctx.fillStyle = "white";
    ctx.fillText(`fireballInterval: ${this.fireballInterval}`, 0, 160);
  }
}
