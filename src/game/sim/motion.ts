/** Ping-pong motion along a line of `length` px with a pause at each end. */
export class PingPong {
  pos = 0;
  dir = 1;
  waitTimer = 0;

  constructor(
    public length: number,
    public speed: number,
    public wait: number,
    public phase = 0,
  ) {
    this.resetPhase();
  }

  resetPhase(): void {
    const L = Math.max(0, this.length);
    const p = ((this.phase % 1) + 1) % 1;
    const cycle = p * 2 * L;
    if (cycle <= L) {
      this.pos = cycle;
      this.dir = 1;
    } else {
      this.pos = 2 * L - cycle;
      this.dir = -1;
    }
    this.waitTimer = 0;
  }

  step(dt: number): void {
    if (this.length <= 0) return;
    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
      return;
    }
    this.pos += this.dir * this.speed * dt;
    if (this.pos >= this.length) {
      this.pos = this.length;
      this.dir = -1;
      this.waitTimer = this.wait;
    } else if (this.pos <= 0) {
      this.pos = 0;
      this.dir = 1;
      this.waitTimer = this.wait;
    }
  }
}

export function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

export function bool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
