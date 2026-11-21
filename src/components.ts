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

export class Animated { }
