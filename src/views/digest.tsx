import type { Night } from '../digest/types.js';

export function DigestPage({ data }: { data: Night }) {
  return (
    <>
      <h1>digest · {data.night}</h1>
      {data.badLines > 0 && <p class="mute">{data.badLines} unreadable line(s) skipped</p>}
      {data.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th><th>owner</th><th>runs</th><th>retries</th><th>last</th><th>last error</th><th>first</th><th>last at</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => {
              const flagged = r.retries >= 3 || r.lastStatus === 'fail';
              return (
                <tr class={flagged ? 'warn' : undefined}>
                  <td>{r.job}</td>
                  <td>{r.owner ?? '—'}</td>
                  <td>{r.runs}</td>
                  <td>{r.retries >= 3 ? `${r.retries} !` : r.retries}</td>
                  <td>{r.lastStatus === 'fail' ? 'fail !' : r.lastStatus}</td>
                  <td>{r.lastError ?? '—'}</td>
                  <td>{r.firstAt}</td>
                  <td>{r.lastAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p><a href="/">back to status</a></p>
    </>
  );
}
