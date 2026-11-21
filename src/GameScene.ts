import type { Scene } from "@waldrumpus/orb";

export class GameScene implements Scene {
  private elapsed = 0;

  constructor(
    private readonly width: number,
    private readonly height: number,
  ) {}

  update(dt: number): void {
    this.elapsed += dt;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const size = 16;
    const x = (this.width - size) / 2 + Math.sin(this.elapsed * 2) * 40;
    const y = (this.height - size) / 2;

    ctx.fillStyle = "#7dd3fc";
    ctx.fillRect(Math.round(x), y, size, size);
  }
}
