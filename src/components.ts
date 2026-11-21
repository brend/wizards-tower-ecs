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
  constructor(public x = 0, public y = 0) { }
}

export class Target {
  constructor(public x = 0, public y = 0) { }
}

export class Health {
  constructor(public hp: number, public maxHp = hp) { }
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

export class Animated { }

export class Enemy { }

export class Projectile { }

export class FireballHurler { }
