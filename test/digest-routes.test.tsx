import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const base = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60 };

function appWith(files: Record<string, string>) {
  const runsDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(runsDir, `${name}.jsonl`), body);
  return createApp({ ...base, runsDir });
}

const line = (job: string, status: string, owner: string | null = 'rook') =>
  JSON.stringify({ at: '2026-10-29T01:00:00+01:00', job, status, owner });

describe('digest routes', () => {
  it('200 on the page and the JSON, same jobs in the same order', async () => {
    const app = createApp({ ...base, runsDir: 'runs' });
    const page = await app.request('/digest/2026-10-28');
    const json = (await (await app.request('/api/digest/2026-10-28')).json()) as { rows: { job: string }[] };
    expect(page.status).toBe(200);
    const html = await page.text();
    const positions = json.rows.map((r) => html.indexOf(r.job));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('404 for a night with no file, page and JSON', async () => {
    const app = appWith({});
    expect((await app.request('/digest/2026-01-01')).status).toBe(404);
    expect((await app.request('/api/digest/2026-01-01')).status).toBe(404);
  });

  it('404 for a night that is not a date', async () => {
    expect((await appWith({}).request('/digest/..%2Frig')).status).toBe(404);
  });

  it('empty night renders "nothing ran"', async () => {
    const res = await appWith({ '2026-02-02': '' }).request('/digest/2026-02-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('bad line is counted, null owner shows a dash', async () => {
    const app = appWith({ '2026-03-03': `${line('a/job', 'ok', null)}\n{broken\n` });
    const html = await (await app.request('/digest/2026-03-03')).text();
    expect(html).toContain('1 unreadable line');
    expect(html).toContain('—');
    const json = (await (await app.request('/api/digest/2026-03-03')).json()) as { badLines: number };
    expect(json.badLines).toBe(1);
  });

  it('marks retries of 3 or more and fails', async () => {
    const body = [line('r/job', 'retry'), line('r/job', 'retry'), line('r/job', 'retry'), line('f/job', 'fail')].join('\n');
    const html = await (await appWith({ '2026-04-04': body }).request('/digest/2026-04-04')).text();
    expect(html).toContain('3 !');
    expect(html).toContain('fail !');
  });
});

describe('board links', () => {
  it('links each night to its digest with counts', async () => {
    const html = await (await createApp({ ...base, runsDir: 'runs' }).request('/')).text();
    expect(html).toContain('href="/digest/2026-10-28"');
    expect(html).toContain('href="/digest/2026-10-27"');
    expect(html).toContain('fail 1');
  });
});
