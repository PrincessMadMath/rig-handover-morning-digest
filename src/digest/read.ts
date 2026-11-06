import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, Night, ReadNight, RunStatus } from './types.js';

type Entry = { at: string; job: string; status: RunStatus; owner: string | null; error: string | null };

const statuses = new Set<string>(['ok', 'retry', 'fail']);

function parseLine(line: string): Entry | null {
  try {
    const v: unknown = JSON.parse(line);
    if (typeof v !== 'object' || v === null) return null;
    const o = v as Record<string, unknown>;
    if (typeof o.at !== 'string' || typeof o.job !== 'string') return null;
    if (typeof o.status !== 'string' || !statuses.has(o.status)) return null;
    return {
      at: o.at,
      job: o.job,
      status: o.status as RunStatus,
      owner: typeof o.owner === 'string' ? o.owner : null,
      error: typeof o.error === 'string' ? o.error : null,
    };
  } catch {
    return null;
  }
}

export const readNight: ReadNight = (runsDir, night) => {
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) return null;

  const entries: Entry[] = [];
  let badLines = 0;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    const e = parseLine(line);
    if (e) entries.push(e);
    else badLines++;
  }

  const byJob = new Map<string, Entry[]>();
  for (const e of entries) byJob.set(e.job, [...(byJob.get(e.job) ?? []), e]);

  // Offsets differ across the night, so order by instant but keep the log's own string.
  const time = (e: Entry) => Date.parse(e.at);
  const rows: DigestRow[] = [...byJob.entries()]
    .map(([job, es]) => {
      const sorted = [...es].sort((a, b) => time(a) - time(b));
      const last = sorted[sorted.length - 1]!;
      const withOwner = [...sorted].reverse().find((e) => e.owner !== null);
      const withError = [...sorted].reverse().find((e) => e.error !== null);
      return {
        job,
        owner: withOwner?.owner ?? null,
        runs: sorted.length,
        retries: sorted.filter((e) => e.status === 'retry').length,
        lastStatus: last.status,
        lastError: withError?.error ?? null,
        firstAt: sorted[0]!.at,
        lastAt: last.at,
      };
    })
    .sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));

  const result: Night = { night, rows, badLines };
  return result;
};
