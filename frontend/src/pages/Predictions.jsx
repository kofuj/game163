import { useState, useEffect } from 'react';
import Nav from '../components/Nav.jsx';
import { fetchPredictions } from '../api.js';
import { t, gradeColor } from '../theme.js';

function GradeChip({ grade }) {
  const c = gradeColor[grade] || t.muted;
  return (
    <span style={{
      padding: '2px 7px', borderRadius: 3, fontSize: 11, fontWeight: 600, fontFamily: t.mono,
      background: c + '15', color: c, border: `1px solid ${c}30`, letterSpacing: '.04em',
    }}>{grade}</span>
  );
}

function OutcomeBadge({ outcome }) {
  if (!outcome || outcome === 'PENDING') return (
    <span style={{
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, fontFamily: t.mono,
      background: t.surface, color: t.faint, border: `1px solid ${t.border}`,
    }}>PENDING</span>
  );
  const hit = outcome === 'HIT';
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, fontFamily: t.mono,
      background: hit ? '#2d6a3f15' : '#c4123015',
      color: hit ? '#2d6a3f' : '#c41230',
      border: `1px solid ${hit ? '#2d6a3f30' : '#c4123030'}`,
    }}>{outcome}</span>
  );
}

export default function Predictions() {
  const [data,    setData]    = useState(null);
  const [error,   setError]   = useState(false);
  const [filter,  setFilter]  = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPredictions()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const preds = data?.predictions ?? [];
  const visible = filter === 'all' ? preds : preds.filter(p => p.grade === filter);
  const counts = { A: 0, B: 0, C: 0 };
  preds.forEach(p => { if (counts[p.grade] !== undefined) counts[p.grade]++; });

  const dateLabel = data?.date
    ? new Date(data.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Today';

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.fg, fontFamily: t.sans }}>
      <Nav />
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 40px 100px' }}>

        {/* Header */}
        <div className="fade-up" style={{ paddingTop: 72, paddingBottom: 40, borderBottom: `1px solid ${t.border}`, marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2d6a3f', animation: 'pulse 2s infinite' }} />
            <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '.12em', textTransform: 'uppercase' }}>
              {loading ? 'Loading\u2026' : dateLabel}
            </span>
          </div>
          <h1 style={{ fontFamily: t.serif, fontWeight: 800, fontSize: 'clamp(32px,5vw,56px)', lineHeight: 1.05, letterSpacing: '-.03em', marginBottom: 12 }}>
            Today\u2019s Predictions
          </h1>
          <p style={{ fontSize: 15, color: t.muted, lineHeight: 1.65, maxWidth: 520 }}>
            Walk-forward model output for every game on today\u2019s schedule. Grade A = highest confidence.
          </p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'A', 'B', 'C'].map(g => {
              const active = filter === g;
              const n = g === 'all' ? preds.length : counts[g];
              return (
                <button key={g} onClick={() => setFilter(g)} style={{
                  padding: '6px 14px', borderRadius: 3,
                  border: `1px solid ${active ? t.fg : t.border}`,
                  background: active ? t.fg : 'transparent',
                  color: active ? t.bg : t.muted,
                  cursor: 'pointer', fontFamily: t.mono, fontSize: 12,
                  display: 'flex', gap: 6, alignItems: 'center',
                }}>
                  {g === 'all' ? 'All' : `Grade ${g}`}
                  {!loading && <span style={{
                    fontSize: 10, padding: '1px 5px', borderRadius: 99,
                    background: active ? 'rgba(255,255,255,.15)' : t.surface,
                    color: active ? t.bg : t.muted,
                  }}>{n}</span>}
                </button>
              );
            })}
          </div>
          {!loading && data && (
            <div style={{ fontFamily: t.mono, fontSize: 12, color: t.muted }}>
              {data.games} game{data.games !== 1 ? 's' : ''} \u00b7 {data.date}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ border: `1px solid #e8c0c0`, borderRadius: 6, padding: '14px 18px', color: '#c41230', fontFamily: t.mono, fontSize: 13, marginBottom: 24, background: '#fff5f5' }}>
            Could not reach the prediction API. Make sure the backend is running.
          </div>
        )}

        {/* Table */}
        {!error && (
          <div style={{ border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.border}`, background: t.surface }}>
                  {['Game / Pick', 'Win Probability', 'Grade', 'Elo Edge', 'Result'].map(h => (
                    <th key={h} style={{
                      textAlign: h === 'Result' ? 'right' : 'left',
                      padding: '13px 16px',
                      fontFamily: t.mono, fontSize: 11, fontWeight: 500,
                      letterSpacing: '.07em', textTransform: 'uppercase',
                      color: t.muted,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
                      <td colSpan={5} style={{ padding: '16px' }}>
                        <div style={{ height: 13, background: t.surface, borderRadius: 4, width: `${60 + (i * 7) % 35}%` }} />
                      </td>
                    </tr>
                  ))
                  : visible.map(p => {
                    const c = gradeColor[p.grade] || t.muted;
                    return (
                      <tr key={p.gamePk} className="row-hover" style={{ borderBottom: `1px solid ${t.border}`, transition: 'background .12s' }}>
                        <td style={{ padding: '15px 16px', fontFamily: t.mono, fontSize: 13 }}>
                          <div style={{ color: t.faint, fontSize: 11, marginBottom: 3 }}>
                            {p.away_name} @ {p.home_name}
                          </div>
                          <div style={{ fontWeight: 600, color: t.fg }}>{p.pick}</div>
                        </td>
                        <td style={{ padding: '15px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 72, height: 4, background: t.border, borderRadius: 99 }}>
                              <div style={{ height: '100%', borderRadius: 99, width: `${((p.pick_prob - 50) / 50) * 100}%`, background: c }} />
                            </div>
                            <span style={{ fontFamily: t.mono, fontWeight: 600, fontSize: 13, color: c }}>{p.pick_prob}%</span>
                          </div>
                          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, marginTop: 3 }}>
                            +{(p.pick_prob - 50).toFixed(1)} edge
                          </div>
                        </td>
                        <td style={{ padding: '15px 16px' }}><GradeChip grade={p.grade} /></td>
                        <td style={{ padding: '15px 16px', fontFamily: t.mono, fontSize: 13, color: t.muted }}>
                          {p.elo_diff > 0 ? '+' : ''}{p.elo_diff}
                        </td>
                        <td style={{ padding: '15px 16px', textAlign: 'right' }}>
                          <OutcomeBadge outcome={p.outcome} />
                          {p.result && <div style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, marginTop: 3 }}>{p.result}</div>}
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>

            {!loading && visible.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: t.muted, fontFamily: t.mono, fontSize: 13 }}>
                No Grade {filter} picks today.
              </div>
            )}
          </div>
        )}

        {/* Grade legend */}
        {!loading && (
          <div style={{ marginTop: 20, display: 'flex', gap: 24, fontFamily: t.mono, fontSize: 12, color: t.muted, flexWrap: 'wrap' }}>
            {[
              { g: 'A', label: '\u226565% confidence \u2014 model\u2019s highest edge' },
              { g: 'B', label: '58\u201365% confidence \u2014 solid edge' },
              { g: 'C', label: '50\u201358% confidence \u2014 marginal edge' },
            ].map(({ g, label }) => (
              <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 3, fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: gradeColor[g] + '15', color: gradeColor[g], border: `1px solid ${gradeColor[g]}30`,
                }}>{g}</span>
                {label}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 80, paddingTop: 24, borderTop: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 15 }}>Game 163</span>
          <div style={{ fontSize: 12, fontFamily: t.mono, color: t.faint }}>
            Not affiliated with MLB. Analytics only, not betting advice. \u00a9 2026 Game 163
          </div>
        </div>
      </div>
    </div>
  );
}
