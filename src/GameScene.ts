import { type Entity, type Scene, World, Sprite as OrbSprite } from "@waldrumpus/orb";
import { Sprite, Position, Animated } from "./components";

export class GameScene implements Scene {
  private readonly world = new World();
  private readonly wizard: Entity;
  private readonly tower: Entity;
  private readonly grassSprite = new OrbSprite("assets/Ground-1.png");
  private readonly groundSprite = new OrbSprite("assets/Ground-2.png");

  constructor(
    private readonly width: number,
    private readonly height: number,
  ) {
    this.wizard = this.world.create(
      new Sprite("assets/Wizard.png", 4),
      new Position(this.width - 58, 38),
      new Animated(),
    );
    this.tower = this.world.create(
      new Sprite("assets/Tower.png"),
      new Position(this.width - 64, 32),
    );
  }

  update(dt: number): void {
    this.world.each([Sprite, Animated], (_, s, a) => {
      s.update(dt);
    });
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.world.each([Sprite, Position], (_, s, p) => {
      s.render(ctx, p.x, p.y);
    });
    this.renderGround(ctx);
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
