export function clamp(x: number, min: number, max: number): number {
  if (x < min) return min;
  if (x > max) return max;
  return x;
}

export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
