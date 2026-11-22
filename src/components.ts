import { Sprite as OrbSprite } from "@waldrumpus/orb";

export class Sprite {
  private readonly sprite: OrbSprite;

  constructor(spritesheet: string, frameCount = 1) {
    this.sprite = new OrbSprite(spritesheet, frameCount);
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
}

export class Animated {}

export class Enemy {
  constructor(
    public attackStrength: number,
    public attackInterval: number,
  ) {}
}

export class Projectile {
  constructor(public damage: number) {}
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

export class Movement {
  constructor(public speed: number) {}
}

export class Jitter {
  constructor(
    public x = 0,
    public y = 0,
  ) {}
}
