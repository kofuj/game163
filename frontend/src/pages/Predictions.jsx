import { useState, useEffect } from 'react';
import Nav from '../components/Nav.jsx';
import { PredictionCardSkeleton } from '../components/Skeleton.jsx';
import { fetchPredictions } from '../api.js';
import { t, gradeColor } from '../theme.js';

function GradeChip({ grade }) {
  const c = gradeColor[grade] || t.muted;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 4, fontSize: 12, fontWeight: 700, fontFamily: t.mono,
      background: c + '22', color: c, border: `1px solid ${c}44`,
    }}>{grade}</span>
  );
}

function OutcomeBadge({ outcome }) {
  if (!outcome || outcome === 'PENDING') return (
    <span style={{
      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, fontFamily: t.mono,
      background: 'rgba(255,255,255,.06)', color: 'rgba(245,240,232,.4)',
      border: '1px solid rgba(255,255,255,.1)',
    }}>PENDING</span>
  );
  const hit = outcome === 'HIT';
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, fontFamily: t.mono,
      background: hit ? 'rgba(127,176,105,.15)' : 'rgba(196,18,48,.12)',
      color: hit ? '#7fb069' : '#e05570',
      border: `1px solid ${hit ? 'rgba(127,176,105,.3)' : 'rgba(196,18,48,.25)'}`,
    }}>{outcome}</span>
  );
}

function PredRow({ p }) {
  const c = gradeColor[p.grade] || t.muted;
  const edge = (p.pick_prob - 50).toFixed(1);
  return (
    <tr className="row-hover" style={{ borderBottom: `1px solid rgba(255,255,255,.04)`, transition: 'background .15s' }}>
      <td style={{ padding: '14px 0', fontFamily: t.mono, fontSize: 13 }}>
        <div style={{ color: 'rgba(245,240,232,.5)', fontSize: 11, marginBottom: 3 }}>
          {p.away_name} @ {p.home_name}
        </div>
        <div style={{ fontWeight: 700, color: t.cream }}>{p.pick}</div>
      </td>
      <td style={{ padding: '14px 16px 14px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 80, height: 5, background: 'rgba(255,255,255,.06)', borderRadius: 99 }}>
            <div style={{ height: '100%', borderRadius: 99, width: `${((p.pick_prob - 50) / 50) * 100}%`, background: c }} />
          </div>
          <span style={{ fontFamily: t.mono, fontWeight: 700, fontSize: 14, color: c }}>{p.pick_prob}%</span>
        </div>
        <div style={{ fontFamily: t.mono, fontSize: 11, color: 'rgba(245,240,232,.3)', marginTop: 3 }}>+{edge} edge</div>
      </td>
      <td style={{ padding: '14px 0' }}><GradeChip grade={p.grade} /></td>
      <td style={{ padding: '14px 0', fontFamily: t.mono, fontSize: 12, color: 'rgba(245,240,232,.4)' }}>
        {p.elo_diff > 0 ? '+' : ''}{p.elo_diff}
      </td>
      <td style={{ padding: '14px 0', textAlign: 'right' }}>
        <OutcomeBadge outcome={p.outcome} />
        {p.result && <div style={{ fontFamily: t.mono, fontSize: 11, color: 'rgba(245,240,232,.4)', marginTop: 3 }}>{p.result}</div>}
      </td>
    </tr>
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
    <div style={{ minHeight: '100vh', background: t.dark, color: t.cream, fontFamily: 'Georgia, serif' }}>
      <Nav />
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `radial-gradient(ellipse 80% 40% at 50% 0%, rgba(26,92,42,.2) 0%, transparent 70%)`,
      }} />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px 80px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div className="fade-up" style={{ paddingTop: 56, paddingBottom: 36, borderBottom: `1px solid rgba(255,255,255,.06)`, marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#7fb069', animation: 'pulse 2s infinite' }} />
            <span style={{ fontFamily: t.mono, fontSize: 12, color: '#7fb069', letterSpacing: '.12em', textTransform: 'uppercase' }}>
              {loading ? 'Loading…' : dateLabel}
            </span>
          </div>
          <h1 style={{ fontFamily: t.serif, fontWeight: 800, fontSize: 'clamp(28px,5vw,52px)', lineHeight: 1.1, letterSpacing: '-.03em', marginBottom: 12 }}>
            Today's Predictions
          </h1>
          <p style={{ fontSize: 15, color: t.muted, lineHeight: 1.6 }}>
            Walk-forward model output for every game on today's schedule. Grade A = highest confidence.
          </p>
        </div>

        {/* Grade summary + filter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          {/* Grade pills */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {['all', 'A', 'B', 'C'].map(g => {
              const c = g === 'all' ? t.cream : gradeColor[g];
              const active = filter === g;
              const n = g === 'all' ? preds.length : counts[g];
              return (
                <button key={g} onClick={() => setFilter(g)} style={{
                  padding: '7px 16px', borderRadius: 8,
                  border: `1px solid ${active ? (g === 'all' ? 'rgba(255,255,255,.3)' : c + '66') : 'rgba(255,255,255,.1)'}`,
                  background: active ? (g === 'all' ? 'rgba(255,255,255,.07)' : c + '18') : 'transparent',
                  color: active ? (g === 'all' ? t.cream : c) : 'rgba(245,240,232,.45)',
                  cursor: 'pointer', fontFamily: t.mono, fontSize: 13, fontWeight: active ? 700 : 400,
                  display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  {g === 'all' ? 'All Games' : `Grade ${g}`}
                  {!loading && <span style={{
                    fontSize: 11, padding: '1px 6px', borderRadius: 99,
                    background: active ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.05)',
                  }}>{n}</span>}
                </button>
              );
            })}
          </div>
          {!loading && data && (
            <div style={{ fontFamily: t.mono, fontSize: 12, color: t.muted }}>
              {data.games} game{data.games !== 1 ? 's' : ''} · {data.date}
            </div>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div style={{ background: 'rgba(196,18,48,.08)', border: '1px solid rgba(196,18,48,.2)', borderRadius: 10, padding: '16px 20px', color: '#e05570', fontFamily: t.mono, fontSize: 13, marginBottom: 24 }}>
            Could not reach the prediction API. Make sure the backend is running at the configured URL.
          </div>
        )}

        {/* Table */}
        {!error && (
          <div style={{ background: 'rgba(255,255,255,.03)', border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid rgba(255,255,255,.07)` }}>
                  {['Game / Pick', 'Win Probability', 'Grade', 'Elo Edge', 'Result'].map(h => (
                    <th key={h} style={{
                      textAlign: h === 'Result' ? 'right' : 'left',
                      padding: '16px 0', paddingRight: h !== 'Result' ? 16 : 0,
                      paddingLeft: 28, fontFamily: t.mono, fontSize: 11,
                      fontWeight: 400, letterSpacing: '.08em', textTransform: 'uppercase',
                      color: 'rgba(245,240,232,.35)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ paddingLeft: 28 }}>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} style={{ padding: '14px 28px' }}>
                        <div style={{ height: 14, background: 'rgba(255,255,255,.05)', borderRadius: 4, width: `${60 + (i * 7) % 35}%` }} />
                      </td>
                    </tr>
                  ))
                  : visible.map(p => (
                    <tr key={p.gamePk} className="row-hover" style={{ borderBottom: `1px solid rgba(255,255,255,.04)`, transition: 'background .15s' }}>
                      <td style={{ padding: '14px 0 14px 28px', fontFamily: t.mono, fontSize: 13 }}>
                        <div style={{ color: 'rgba(245,240,232,.5)', fontSize: 11, marginBottom: 3 }}>
                          {p.away_name} @ {p.home_name}
                        </div>
                        <div style={{ fontWeight: 700, color: t.cream }}>{p.pick}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 80, height: 5, background: 'rgba(255,255,255,.06)', borderRadius: 99 }}>
                            <div style={{
                              height: '100%', borderRadius: 99,
                              width: `${((p.pick_prob - 50) / 50) * 100}%`,
                              background: gradeColor[p.grade] || t.muted,
                            }} />
                          </div>
                          <span style={{ fontFamily: t.mono, fontWeight: 700, fontSize: 14, color: gradeColor[p.grade] || t.muted }}>
                            {p.pick_prob}%
                          </span>
                        </div>
                        <div style={{ fontFamily: t.mono, fontSize: 11, color: 'rgba(245,240,232,.3)', marginTop: 3 }}>
                          +{(p.pick_prob - 50).toFixed(1)} edge
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}><GradeChip grade={p.grade} /></td>
                      <td style={{ padding: '14px 16px', fontFamily: t.mono, fontSize: 13, color: 'rgba(245,240,232,.45)' }}>
                        {p.elo_diff > 0 ? '+' : ''}{p.elo_diff}
                      </td>
                      <td style={{ padding: '14px 28px 14px 0', textAlign: 'right' }}>
                        <OutcomeBadge outcome={p.outcome} />
                        {p.result && <div style={{ fontFamily: t.mono, fontSize: 11, color: 'rgba(245,240,232,.4)', marginTop: 3 }}>{p.result}</div>}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>

            {!loading && visible.length === 0 && (
              <div style={{ padding: '32px 28px', textAlign: 'center', color: t.muted, fontFamily: t.mono, fontSize: 13 }}>
                No Grade {filter} picks today.
              </div>
            )}
          </div>
        )}

        {/* Grade legend */}
        {!loading && (
          <div style={{ marginTop: 24, display: 'flex', gap: 24, fontFamily: t.mono, fontSize: 12, color: 'rgba(245,240,232,.4)', flexWrap: 'wrap' }}>
            {[
              { g: 'A', label: '≥65% confidence — model\u2019s highest edge' },
              { g: 'B', label: '58–65% confidence — solid edge' },
              { g: 'C', label: '50–58% confidence — marginal edge' },
            ].map(({ g, label }) => (
              <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 3, fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: gradeColor[g] + '22', color: gradeColor[g], border: `1px solid ${gradeColor[g]}44`,
                }}>{g}</span>
                {label}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 64, paddingTop: 28, borderTop: `1px solid rgba(255,255,255,.06)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚾</span>
            <span style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 16 }}>Game 163</span>
          </div>
          <div style={{ fontSize: 12, fontFamily: t.mono, color: 'rgba(245,240,232,.25)' }}>
            Not affiliated with MLB. Data from public MLB Stats API. Analytics only, not betting advice. © 2026 Game 163
          </div>
        </div>
      </div>
    </div>
  );
}
