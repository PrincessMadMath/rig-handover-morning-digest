import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('reads 2026-10-28: 5 jobs, 1 bad line', () => {
    const n = readNight('runs', '2026-10-28')!;
    expect(n.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(n.badLines).toBe(1);
  });

  it('counts retries and keeps the last error, offsets untouched', () => {
    const fx = readNight('runs', '2026-10-28')!.rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(fx).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok', lastError: 'upstream 503' });
    expect(fx.firstAt).toBe('2026-10-29T01:30:00+01:00');
  });

  it('keeps a row with a null owner', () => {
    const d = readNight('runs', '2026-10-28')!.rows.find((r) => r.job === 'digest/render')!;
    expect(d.owner).toBeNull();
  });

  it('returns null for a night with no file', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
  });
});
