import { Position, Destination, SineFlight } from "./components";

export function clamp(x: number, min: number, max: number): number {
  if (x < min) return min;
  if (x > max) return max;
  return x;
}

export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function predictEnemyPosition(
  position: Position,
  destination: Destination,
  speed: number,
  flight: SineFlight | undefined,
  time: number,
): Position {
  const x = Math.min(position.x + speed * time, destination.x);
  if (!flight) return { x, y: position.y };

  const traveled = x - flight.startX;
  const phase = (traveled / flight.wavelength) * 2 * Math.PI;
  const remaining = destination.x - x;
  const fade = Math.min(1, remaining / (flight.wavelength / 2));
  return { x, y: destination.y + Math.sin(phase) * flight.amplitude * fade };
}
