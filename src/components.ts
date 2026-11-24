import { Entity, Sprite as OrbSprite } from "@waldrumpus/orb";

export class Sprite {
  private readonly sprite: OrbSprite;

  constructor(spritesheet: string, frameCount = 1) {
    this.sprite = new OrbSprite(spritesheet, frameCount);
  }

  get height(): number {
    return this.sprite.h;
  }

  render(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.render(ctx);
  }

  update(dt: number): void {
    this.sprite.update(dt);
  }
}

export class Position {
  constructor(
    public x = 0,
    public y = 0,
  ) {}
}

export class Destination {
  constructor(
    public x = 0,
    public y = 0,
  ) {}
}

export class Health {
  constructor(
    public hp: number,
    public maxHp = hp,
  ) {}
  get percentage(): number {
    return this.hp / this.maxHp;
  }
  reduce(amount: number): void {
    if (amount <= this.hp) {
      this.hp -= amount;
    } else {
      this.hp = 0;
    }
  }
  increase(amount: number): void {
    if (amount < 0) throw new Error("invalid amount");
    this.maxHp += amount;
    this.hp += amount;
  }
}

export class Animated {}

export class Enemy {
  constructor(
    public attackStrength: number,
    public attackInterval: number,
  ) {}
}

export class Minion {}

export class Projectile {
  constructor(
    public damage: number,
    public target: Entity | undefined = undefined,
  ) {}
}

export class FireballHurler {}

export class Attack {
  public cooldownTimer = 0;
  constructor(
    public damage: number,
    public interval: number,
  ) {}
  cooldown(dt: number): void {
    this.cooldownTimer += dt;
  }
  get isReady(): boolean {
    return this.cooldownTimer >= this.interval;
  }
  reset(): void {
    this.cooldownTimer = 0;
  }
}

export class RangedAttack {}

export class Movement {
  constructor(public speed: number) {}
}

export class Jitter {
  constructor(
    public x = 0,
    public y = 0,
  ) {}
}

export class SineFlight {
  constructor(
    public amplitude: number,
    public wavelength: number,
    public startX: number,
  ) {}
}

export class Scaled {
  constructor(public scale: number) {}
}

export class XpDonor {
  constructor(public xp: number) {}
}
