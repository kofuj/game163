import { useState, useEffect } from 'react';
import Nav from '../components/Nav.jsx';
import { fetchPredictions } from '../api.js';
import { t, gradeColor } from '../theme.js';
import TeamLogo from '../components/TeamLogo.jsx';

function GradeChip({ grade }) {
  const c = gradeColor[grade] || t.muted;
  return (
    <span style={{
      padding: '2px 7px', borderRadius: 3, fontSize: 11, fontWeight: 600, fontFamily: t.mono,
      background: c + '15', color: c, border: `1px solid ${c}30`, letterSpacing: '.04em',
    }}>{grade}</span>
  );
}

function OutcomeBadge({ outcome, result }) {
  if (!outcome || outcome === 'PENDING') return (
    <span style={{
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, fontFamily: t.mono,
      background: t.surface, color: t.faint, border: `1px solid ${t.border}`,
    }}>PENDING</span>
  );
  const hit = outcome === 'HIT';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
      <span style={{
        padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, fontFamily: t.mono,
        background: hit ? '#2d6a3f15' : '#c4123015',
        color: hit ? '#2d6a3f' : '#c41230',
        border: `1px solid ${hit ? '#2d6a3f30' : '#c4123030'}`,
      }}>{outcome}</span>
      {result && <span style={{ fontFamily: t.mono, fontSize: 11, color: t.faint }}>{result}</span>}
    </div>
  );
}

// Builds a list of edge factors to show for a pick
function buildEdgeFactors(p) {
  const e = p.edge;
  if (!e) return [];
  const factors = [];

  // Form: L10 win rate
  if (e.pick_win_l10 != null && e.opp_win_l10 != null) {
    const pickW  = Math.round(e.pick_win_l10 * 10);
    const oppW   = Math.round(e.opp_win_l10  * 10);
    const diff   = pickW - oppW;
    const good   = diff >= 0;
    factors.push({
      key: 'form',
      label: 'Form',
      value: `${pickW}–${10 - pickW} L10`,
      sub: diff !== 0 ? `opp ${oppW}–${10 - oppW}` : 'even',
      positive: good,
    });
  }

  // Pitching matchup
  if (e.pick_era != null && e.opp_era != null) {
    const diff = e.opp_era - e.pick_era;          // positive = pick SP is better
    const pickName = p.pick === p.home_name
      ? p.home_pitcher_name : p.away_pitcher_name;
    const oppName  = p.pick === p.home_name
      ? p.away_pitcher_name : p.home_pitcher_name;
    factors.push({
      key: 'pitching',
      label: 'SP ERA',
      value: e.pick_era.toFixed(2),
      sub: `opp ${e.opp_era.toFixed(2)}`,
      positive: diff > 0.3,
      neutral: Math.abs(diff) <= 0.3,
      pickName,
      oppName,
    });
  }

  // Bayesian team strength
  if (e.pick_bayes != null && e.opp_bayes != null) {
    const diff = e.pick_bayes - e.opp_bayes;
    if (Math.abs(diff) >= 2) {
      factors.push({
        key: 'bayes',
        label: 'Win rate',
        value: `${e.pick_bayes.toFixed(1)}%`,
        sub: `opp ${e.opp_bayes.toFixed(1)}%`,
        positive: diff > 0,
      });
    }
  }

  // Rest advantage
  if (e.pick_rest != null && e.opp_rest != null) {
    const diff = e.pick_rest - e.opp_rest;
    if (diff >= 1) {
      factors.push({
        key: 'rest',
        label: 'Rest',
        value: `${Math.round(e.pick_rest)}d`,
        sub: `opp ${Math.round(e.opp_rest)}d`,
        positive: true,
      });
    }
  }

  // Park factor (only show if notable)
  if (e.park_factor != null) {
    const pf = e.park_factor;
    if (pf >= 1.05) {
      factors.push({ key: 'park', label: 'Park', value: `${pf.toFixed(2)}×`, sub: "hitter-friendly", positive: null });
    } else if (pf <= 0.96) {
      factors.push({ key: 'park', label: 'Park', value: `${pf.toFixed(2)}×`, sub: "pitcher-friendly", positive: null });
    }
  }

  return factors;
}

function EdgeFactors({ p }) {
  const factors = buildEdgeFactors(p);
  if (!factors.length) return null;

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10,
      paddingTop: 10, borderTop: `1px solid ${t.border}`,
    }}>
      {factors.map(f => {
        const color = f.positive === true ? '#2d6a3f'
          : f.positive === false ? '#c41230'
          : t.muted;
        return (
          <div key={f.key} style={{
            display: 'flex', flexDirection: 'column', gap: 1,
            padding: '5px 9px', borderRadius: 5,
            background: t.surface, border: `1px solid ${t.border}`,
            minWidth: 64,
          }}>
            <span style={{ fontFamily: t.mono, fontSize: 10, color: t.faint, letterSpacing: '.06em', textTransform: 'uppercase' }}>
              {f.label}
            </span>
            <span style={{ fontFamily: t.mono, fontSize: 12, fontWeight: 700, color }}>
              {f.value}
            </span>
            <span style={{ fontFamily: t.mono, fontSize: 10, color: t.faint }}>
              {f.sub}
            </span>
          </div>
        );
      })}
    </div>
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
              {loading ? 'Loading…' : dateLabel}
            </span>
          </div>
          <h1 style={{ fontFamily: t.serif, fontWeight: 800, fontSize: 'clamp(32px,5vw,56px)', lineHeight: 1.05, letterSpacing: '-.03em', marginBottom: 12 }}>
            Today's Predictions
          </h1>
          <p style={{ fontSize: 15, color: t.muted, lineHeight: 1.65, maxWidth: 520 }}>
            Walk-forward model output for every game on today's schedule. Each pick shows the key factors driving the edge.
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
              {data.games} game{data.games !== 1 ? 's' : ''} · {data.date}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ border: `1px solid #e8c0c0`, borderRadius: 6, padding: '14px 18px', color: '#c41230', fontFamily: t.mono, fontSize: 13, marginBottom: 24, background: '#fff5f5' }}>
            Could not reach the prediction API. Make sure the backend is running.
          </div>
        )}

        {/* Cards */}
        {!error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ border: `1px solid ${t.border}`, borderRadius: 8, padding: '20px 22px', background: t.bg }}>
                  <div style={{ height: 12, background: t.surface, borderRadius: 4, width: `${45 + (i * 9) % 40}%`, marginBottom: 10 }} />
                  <div style={{ height: 16, background: t.surface, borderRadius: 4, width: `${30 + (i * 7) % 30}%`, marginBottom: 14 }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[60, 80, 70].map((w, j) => (
                      <div key={j} style={{ height: 46, background: t.surface, borderRadius: 5, width: w }} />
                    ))}
                  </div>
                </div>
              ))
              : visible.map(p => {
                const c = gradeColor[p.grade] || t.muted;
                const hasPitchers = p.away_pitcher_name || p.home_pitcher_name;
                return (
                  <div key={p.gamePk} style={{
                    border: `1px solid ${t.border}`, borderRadius: 8,
                    background: t.bg, overflow: 'hidden',
                  }}>
                    {/* Top bar: matchup + grade + outcome */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 20px', borderBottom: `1px solid ${t.border}`,
                      background: t.surface, flexWrap: 'wrap', gap: 10,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: t.mono, fontSize: 12, color: t.muted }}>
                        <TeamLogo name={p.away_name} size={15} />
                        <span>{p.away_name}</span>
                        <span style={{ color: t.faint }}>@</span>
                        <TeamLogo name={p.home_name} size={15} />
                        <span>{p.home_name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <GradeChip grade={p.grade} />
                        <OutcomeBadge outcome={p.outcome} result={p.result} />
                      </div>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '16px 20px' }}>

                      {/* Pick + probability */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <TeamLogo name={p.pick} size={26} />
                          <div>
                            <div style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 17, color: t.fg }}>
                              {p.pick}
                            </div>
                            {hasPitchers && (
                              <div style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, marginTop: 2 }}>
                                ⚾ {p.away_pitcher_name || '—'} vs {p.home_pitcher_name || '—'}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: t.mono, fontWeight: 700, fontSize: 22, color: c, lineHeight: 1 }}>
                            {p.pick_prob}%
                          </div>
                          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, marginTop: 3 }}>
                            +{(p.pick_prob - 50).toFixed(1)} edge
                          </div>
                        </div>
                      </div>

                      {/* Probability bar */}
                      <div style={{ height: 3, background: t.border, borderRadius: 99, marginBottom: 4 }}>
                        <div style={{
                          height: '100%', borderRadius: 99,
                          width: `${((p.pick_prob - 50) / 50) * 100}%`,
                          background: c,
                        }} />
                      </div>

                      {/* Edge factors */}
                      <EdgeFactors p={p} />
                    </div>
                  </div>
                );
              })
            }

            {!loading && visible.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: t.muted, fontFamily: t.mono, fontSize: 13, border: `1px solid ${t.border}`, borderRadius: 8 }}>
                No Grade {filter} picks today.
              </div>
            )}
          </div>
        )}

        {/* Grade legend */}
        {!loading && (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10, fontFamily: t.mono, fontSize: 12, color: t.muted }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                { g: 'A', label: '≥65% — strong Bayesian edge' },
                { g: 'B', label: '58–65% — real edge' },
                { g: 'C', label: '50–58% — marginal edge' },
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, color: t.faint, fontSize: 11, marginTop: 4 }}>
              <span><strong style={{ color: t.muted }}>Form</strong> — L10 win rate for the picked team vs opponent</span>
              <span><strong style={{ color: t.muted }}>SP ERA</strong> — starting pitcher ERA, current-season rolling</span>
              <span><strong style={{ color: t.muted }}>Win rate</strong> — Bayesian posterior win-rate estimate</span>
              <span><strong style={{ color: t.muted }}>Rest</strong> — days since last game</span>
              <span><strong style={{ color: t.muted }}>Park</strong> — ballpark run-scoring factor (1.0 = neutral)</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 80, paddingTop: 24, borderTop: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 15 }}>Game 163</span>
          <div style={{ fontSize: 12, fontFamily: t.mono, color: t.faint }}>
            Not affiliated with MLB. Analytics only, not betting advice. © 2026 Game 163
          </div>
        </div>
      </div>
    </div>
  );
}
