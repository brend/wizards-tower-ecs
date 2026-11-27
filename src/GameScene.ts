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
  Minion,
  Halted,
  Flying,
} from "./components";
import {
  projectileSpeed,
  spawnProjectile,
  spawnOrk,
  spawnTower,
  spawnWizard,
  chooseEnemySpawningFunction,
  spawnSkeleton,
  spawnGargoyle,
  spawnHulk,
  spawnRunner,
  EnemySpawner,
} from "./entities";
import { clamp, randomInRange, predictEnemyPosition, shuffle } from "./math";
import { Upgrade } from "./levelup";
import { loadVoices } from "./sound";

type RenderingContext = CanvasRenderingContext2D;
type GameState = "playing" | "levelup";

const upgradeLabelSize = 8;
export const upgradeLabelFont = `${upgradeLabelSize}px "Dogica Pixel", monospace`;

export class GameScene implements Scene {
  private readonly world = new World();

  private readonly tower: Entity;

  private deferredActions: Array<() => void> = [];

  private readonly grassSprite = new OrbSprite("assets/Ground-1.png");
  private readonly groundSprite = new OrbSprite("assets/Ground-2.png");
  private readonly orbSprite = new OrbSprite("assets/Orb-Empty.png");

  private readonly voicePlayer = loadVoices();

  private state: GameState = "playing";
  private elapsed = 0;
  private difficultyLevel = 0;
  private fireballTimer = 0;
  private fireballInterval = 1.5;
  private fireballPierce = 0;
  private enemyTimer = 0;
  private enemyInterval = 3;
  private minionTimer = 0;
  private minionInterval = 5;
  private xp = 0;
  private nextLevelXp = 5;
  private upgradeChoices: Upgrade[] | null = null;
  private readonly upgradeLevels = new Map<Upgrade["name"], number>();

  private enemySpawnChances = new Map<EnemySpawner, number>();

  constructor(
    private readonly width: number,
    private readonly height: number,
  ) {
    spawnWizard(this.world);
    this.tower = spawnTower(this.world);
    spawnOrk(this.world);
  }

  async enableSound(): Promise<boolean> {
    const enabled = await this.voicePlayer.enable();
    if (enabled) this.playVoice("welcome");
    return enabled;
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

  private updateLevelupScreen(_dt: number): void {}

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
    this.xp = 0;
    this.upgradeChoices = null;
    this.state = "playing";
  }

  private applyUpgrade(name: string): void {
    switch (name) {
      case "Hurl Speed":
        this.fireballInterval *= 0.9;
        break;
      case "Piercing":
        break;
      case "Skeleton Frequency":
        break;
      case "Skeleton Quality":
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
    const width = Math.min(72, columnWidth - 8);
    const height = 48;
    return {
      x: Math.round((index + 0.5) * columnWidth - width / 2),
      y: (this.height - height) / 2,
      width,
      height,
    };
  }

  private updateGameplay(dt: number): void {
    this.executeDeferredActions();
    this.removeDeadEnemies();
    this.removeDeadMinions();

    if (this.xp >= this.nextLevelXp) {
      this.upgradeChoices = this.rollUpgrades();
      this.state = "levelup";
      return;
    }

    this.increaseDifficulty(dt);
    this.spawnMinions(dt);
    this.spawnEnemies(dt);
    this.spawnFireballs(dt);
    this.updateAnimations(dt);
    this.resolveMinionAttacks(dt);
    this.resolveEnemyAttacks(dt);
    this.moveEnemies(dt);
    this.moveMinions(dt);
    this.updateProjectiles(dt);
  }

  private increaseDifficulty(dt: number) {
    this.elapsed += dt;

    const b4 = this.difficultyLevel;

    if (this.difficultyLevel === 0 && this.elapsed >= 30) {
      this.difficultyLevel += 1;
      this.enemyInterval = 2.8;
      this.enemySpawnChances = new Map([
        [spawnOrk, 0.85],
        [spawnRunner, 0.1],
        [spawnGargoyle, 0.05],
      ]);
    }

    if (this.difficultyLevel === 1 && this.elapsed >= 60) {
      this.difficultyLevel += 1;
      this.enemyInterval = 2.4;
      this.enemySpawnChances = new Map([
        [spawnOrk, 0.65],
        [spawnRunner, 0.15],
        [spawnGargoyle, 0.15],
        [spawnHulk, 0.5],
      ]);
    }

    if (this.difficultyLevel === 2 && this.elapsed >= 2 * 60) {
      this.difficultyLevel += 1;
      this.enemyInterval = 1.9;
      this.enemySpawnChances = new Map([
        [spawnOrk, 0.5],
        [spawnRunner, 0.2],
        [spawnGargoyle, 0.2],
        [spawnHulk, 0.1],
      ]);
    }

    if (this.difficultyLevel === 3 && this.elapsed >= 3 * 60) {
      this.difficultyLevel += 1;
      this.enemyInterval = 1.5;
      this.enemySpawnChances = new Map([
        [spawnOrk, 0.35],
        [spawnRunner, 0.2],
        [spawnGargoyle, 0.25],
        [spawnHulk, 0.2],
      ]);
    }

    if (this.difficultyLevel === 4 && this.elapsed >= 4 * 60) {
      this.difficultyLevel += 1;
      this.enemyInterval = 1.4;
      this.enemySpawnChances = new Map([
        [spawnOrk, 0.3],
        [spawnRunner, 0.2],
        [spawnGargoyle, 0.25],
        [spawnHulk, 0.25],
      ]);
    }

    if (this.difficultyLevel !== b4) {
      console.log("difficulty increased to ", this.difficultyLevel);
    }
  }

  private allUpgrades(): Upgrade[] {
    return [
      {
        name: "Hurl Speed",
        sprite: new OrbSprite("assets/Upgrade-Fireball.png"),
      },
      {
        name: "Piercing",
        sprite: new OrbSprite("assets/Upgrade-Fireball.png"),
      },
      {
        name: "Skeleton Frequency",
        sprite: new OrbSprite("assets/Upgrade-Skeleton.png"),
      },
      {
        name: "Skeleton Quality",
        sprite: new OrbSprite("assets/Upgrade-Skeleton.png"),
      },
    ];
  }

  private rollUpgrades(): Upgrade[] {
    const allUpgradesRandomized = shuffle(this.allUpgrades());
    return allUpgradesRandomized.slice(0, 3);
  }

  private removeDeadEnemies(): void {
    const deadEnemies: Entity[] = [];

    this.world.each([Health, Enemy], (e, health) => {
      if (health.hp <= 0) {
        deadEnemies.push(e);
      }
    });

    for (const e of deadEnemies) {
      this.killEnemy(e);
    }
  }

  private removeDeadMinions(): void {
    const deadMinions: Entity[] = [];

    this.world.each([Health, Minion], (m, health) => {
      if (health.hp <= 0) {
        deadMinions.push(m);
      }
    });

    this.world.each([Enemy, Halted, Attack], (e, enemy, halted, attack) => {
      if (enemy.target && deadMinions.includes(enemy.target)) {
        enemy.target = undefined;
        this.defer(() => {
          this.world.remove(e, halted);
          // have the enemy keep attacking (the tower)
          // if it's already reached its destination
          if (this.world.has(e, Destination)) {
            this.world.remove(e, attack);
          }
        });
      }
    });

    for (const m of deadMinions) {
      this.world.destroy(m);
    }
  }

  private killEnemy(e: Entity): void {
    const xpDonation = this.world.get(e, XpDonor);
    if (xpDonation) {
      this.xp += xpDonation.xp;
    }
    this.world.each(
      [Minion, Halted, Attack, Health],
      (m, minion, halted, attack, health) => {
        if (minion.target === e && health.hp > 0) {
          minion.target = undefined;
          this.defer(() => {
            if (this.world.isAlive(m)) {
              this.world.remove(m, halted);
              this.world.remove(m, attack);
            }
          });
        }
      },
    );

    this.world.destroy(e);
  }

  private spawnMinions(dt: number): void {
    this.minionTimer += dt;
    if (this.minionTimer >= this.minionInterval) {
      spawnSkeleton(this.world);
      this.minionTimer = 0;
    }
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
        const aim = this.world.has(target.entity, Halted)
          ? target.position
          : this.getFireballAim(sourcePosition, target.entity, target.position);
        spawnProjectile(
          this.world,
          sourcePosition.x,
          sourcePosition.y,
          aim.x,
          aim.y,
        );
        if (Math.random() >= 0.9) {
          this.playVoice("fireball");
        }
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

  private collectMobileGroundEnemies(): Array<{
    e: Entity;
    position: Position;
    enemy: Enemy;
  }> {
    const groundEnemies: Array<{
      e: Entity;
      position: Position;
      enemy: Enemy;
    }> = [];
    this.world.each(
      [Position, Enemy],
      (e, position, enemy) => {
        groundEnemies.push({ e, position, enemy });
      },
      { without: [Halted, Flying] },
    );
    return groundEnemies;
  }

  private moveMinions(dt: number): void {
    const groundEnemies = this.collectMobileGroundEnemies();

    function collide(a: Position, b: Position): boolean {
      return Math.abs(a.x - b.x) < 6;
    }

    this.world.each(
      [Position, Movement, Minion],
      (m, position, movement, minion) => {
        position.x += movement.speed * dt;
        if (minion.hasTarget || groundEnemies.length === 0) return;
        for (let i = 0; i < groundEnemies.length; ++i) {
          const enemy = groundEnemies[i];
          if (collide(enemy.position, position)) {
            minion.target = enemy.e;
            enemy.enemy.target = m;
            this.defer(() => {
              this.world.add(m, new Halted());
              this.world.add(
                m,
                new Attack(minion.attackStrength, minion.attackInterval),
              );
              this.world.add(enemy.e, new Halted());
              this.world.add(
                enemy.e,
                new Attack(
                  enemy.enemy.attackStrength,
                  enemy.enemy.attackInterval,
                ),
              );
            });
            groundEnemies.splice(i, 1);
            break;
          }
        }
      },
      { without: [Halted] },
    );
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
      { without: [Halted] },
    );
  }

  private resolveMinionAttacks(dt: number): void {
    const readyAttacks: Array<{
      attack: Attack;
      target: Entity;
    }> = [];

    this.world.each([Attack, Minion], (_, attack, minion) => {
      if (!minion.hasTarget) return;
      attack.cooldown(dt);
      if (attack.isReady) {
        readyAttacks.push({ attack, target: minion.target! });
      }
    });

    if (readyAttacks.length === 0) return;

    for (const a of readyAttacks) {
      const health = this.world.get(a.target, Health);
      health?.reduce(a.attack.damage);
      a.attack.reset();
    }
  }

  private resolveEnemyAttacks(dt: number): void {
    const readyAttacks: Array<{
      enemy: Enemy;
      attack: Attack;
      position: Position;
      isRanged: boolean;
    }> = [];

    this.world.each([Enemy, Attack, Position], (e, enemy, attack, position) => {
      attack.cooldown(dt);
      if (attack.isReady) {
        readyAttacks.push({
          enemy,
          attack,
          position,
          isRanged: this.world.get(e, RangedAttack) !== undefined,
        });
      }
    });

    if (readyAttacks.length === 0) return;

    for (const a of readyAttacks) {
      const target = a.enemy.target ?? this.tower;
      const targetHealth = this.world.get(target, Health)!;
      const targetPosition = this.world.get(target, Position)!;

      if (a.isRanged) {
        spawnProjectile(
          this.world,
          a.position.x,
          a.position.y,
          targetPosition.x,
          targetPosition.y,
          this.tower,
          a.attack.damage,
          "assets/Trident.png",
          1,
        );
      } else {
        targetHealth.reduce(a.attack.damage);
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
    //this.renderHealthBars(ctx);
    //this.renderAttackCooldowns(ctx);
    this.renderHud(ctx);
  }

  private renderHealthBars(ctx: RenderingContext): void {
    this.world.each([Position, Health], (_, p, h) => {
      ctx.strokeStyle = "red";
      ctx.fillStyle = "red";
      ctx.strokeRect(p.x, p.y + 16, 16, 4);
      ctx.fillRect(p.x, p.y + 16, 16 * h.percentage, 4);
    });
  }

  private renderAttackCooldowns(ctx: RenderingContext): void {
    this.world.each([Position, Attack], (_, p, a) => {
      ctx.fillStyle = "rgb(90, 90, 232)";
      ctx.strokeStyle = "rgb(90, 90, 232)";
      ctx.strokeRect(p.x, p.y, 16, 4);
      ctx.fillRect(p.x, p.y, (16 * a.cooldownTimer) / a.interval, 4);
    });
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
      for (let x = 0; x < this.width; x += 16) {
        sprite.render(ctx, x, y);
      }
      sprite = this.groundSprite;
    }
  }

  private renderHud(ctx: RenderingContext): void {
    // the mana-filled orb represents the XP
    const xpPercentToNextLevel = this.xp / this.nextLevelXp;
    const manaBars = Math.ceil(6 * xpPercentToNextLevel);
    ctx.fillStyle = "#0dbcfc";
    ctx.fillRect(281, 43 + 6 - manaBars, 8, manaBars);
    this.orbSprite.render(ctx, 281, 42);

    const upgrades = this.upgradeChoices;
    if (this.state === "levelup" && upgrades !== null) {
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.font = upgradeLabelFont;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
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
        const labelLines = upgrade.name.split(" ");
        const firstLineY =
          y + height - 10 - ((labelLines.length - 1) * upgradeLabelSize) / 2;
        labelLines.forEach((line, lineIndex) => {
          ctx.fillText(
            line,
            centerX,
            firstLineY + lineIndex * upgradeLabelSize,
          );
        });
        const spritex = centerX - upgrade.sprite.width / 2;
        const spritey = y + 4;
        upgrade.sprite.render(ctx, spritex, spritey);
      });
      ctx.restore();
    }
  }

  private playVoice(name: string): void {
    void this.voicePlayer.play(name).catch((error) => {
      console.error(`Could not play voice clip ${name}`, error);
    });
  }
}
