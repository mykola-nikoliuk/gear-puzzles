/** Seconds on a clock that can be paused: time stands still while paused and resumes where it stopped. */
export class Clock {
  private offset = 0;
  private pausedAt: number | null = null;

  constructor(private readonly source: () => number = () => performance.now() / 1000) {}

  now(): number {
    return (this.pausedAt ?? this.source()) - this.offset;
  }

  get paused(): boolean {
    return this.pausedAt !== null;
  }

  set paused(paused: boolean) {
    if (paused === this.paused) return;
    if (paused) {
      this.pausedAt = this.source();
    } else {
      this.offset += this.source() - (this.pausedAt ?? 0);
      this.pausedAt = null;
    }
  }
}
