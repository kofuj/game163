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

// ---------------------------------------------------------------------------
// Blurb generator — returns an array of sentence strings (max 2)
// ---------------------------------------------------------------------------
function buildSentences(p) {
  const e = p.edge;
  if (!e) return [];

  const pick     = p.pick;
  const opp      = pick === p.home_name ? p.away_name : p.home_name;
  const pickSP   = pick === p.home_name ? p.home_pitcher_name : p.away_pitcher_name;
  const oppSP    = pick === p.home_name ? p.away_pitcher_name : p.home_pitcher_name;
  const pickHome = pick === p.home_name;

  const sentences = [];

  // --- Pitcher ---
  const LEAGUE_AVG_ERA = 4.30;
  const hasPitcherData = e.pick_era != null && e.opp_era != null
    && e.pick_era !== LEAGUE_AVG_ERA && e.opp_era !== LEAGUE_AVG_ERA;
  if (hasPitcherData) {
    const eraDiff = e.opp_era - e.pick_era;
    if (pickSP && oppSP) {
      if (eraDiff >= 1.0) {
        sentences.push(`${pickSP} (${e.pick_era.toFixed(2)} ERA) has a significant mound advantage over ${oppSP} (${e.opp_era.toFixed(2)} ERA).`);
      } else if (eraDiff >= 0.4) {
        sentences.push(`${pickSP} holds a pitching edge with a ${e.pick_era.toFixed(2)} ERA vs ${oppSP}'s ${e.opp_era.toFixed(2)}.`);
      } else if (eraDiff <= -1.0) {
        sentences.push(`${oppSP} (${e.opp_era.toFixed(2)} ERA) outpitches ${pickSP} (${e.pick_era.toFixed(2)} ERA), but team strength overrides the mound matchup.`);
      } else {
        sentences.push(`Pitching is roughly even: ${pickSP} (${e.pick_era.toFixed(2)} ERA) vs ${oppSP} (${e.opp_era.toFixed(2)} ERA).`);
      }
    } else if (eraDiff >= 0.5) {
      sentences.push(`${pick}'s starter holds a ${eraDiff.toFixed(2)}-ERA advantage over the opposing pitcher.`);
    }
  }

  // --- Form ---
  if (e.pick_win_l10 != null && e.opp_win_l10 != null) {
    const pickW = Math.round(e.pick_win_l10 * 10);
    const oppW  = Math.round(e.opp_win_l10  * 10);
    const pickRd = e.pick_run_diff_l10;

    if (pickW >= 7 && pickW > oppW + 1) {
      const rdClause = pickRd != null && pickRd > 1.0
        ? `, outscoring opponents by +${pickRd.toFixed(1)} runs/game`
        : '';
      sentences.push(`${pick} are ${pickW}–${10 - pickW} over their last 10${rdClause}, while ${opp} have gone ${oppW}–${10 - oppW}.`);
    } else if (oppW >= 7 && oppW > pickW + 1) {
      sentences.push(`${opp} have been the hotter team (${oppW}–${10 - oppW} L10 vs ${pick}'s ${pickW}–${10 - pickW}), but the model's overall edge still favors ${pick}.`);
    } else if (pickW > oppW && pickRd != null && pickRd > 1.5) {
      sentences.push(`${pick} have outscored opponents by +${pickRd.toFixed(1)} runs/game over the last 10, showing stronger form than the W–L line suggests.`);
    }
  }

  // --- Bayesian / Elo ---
  const eloDiff = Math.abs(p.elo_diff);
  if (sentences.length < 2 && e.pick_bayes != null && e.opp_bayes != null) {
    const bayesDiff = e.pick_bayes - e.opp_bayes;
    if (bayesDiff >= 5) {
      sentences.push(`${pick}'s Bayesian win rate (${e.pick_bayes.toFixed(1)}%) sits ${bayesDiff.toFixed(1)} points above ${opp}'s (${e.opp_bayes.toFixed(1)}%) — one of the larger gaps on today's slate.`);
    } else if (eloDiff >= 60) {
      sentences.push(`${pick} hold a +${eloDiff.toFixed(0)}-point Elo advantage, a meaningful strength gap built over the course of the season.`);
    }
  }

  // --- Rest ---
  if (sentences.length < 2 && e.pick_rest != null && e.opp_rest != null) {
    const restDiff = e.pick_rest - e.opp_rest;
    if (restDiff >= 2) {
      sentences.push(`${pick} enter on ${Math.round(e.pick_rest)} days' rest vs ${opp}'s ${Math.round(e.opp_rest)}.`);
    }
  }

  // --- Park factor ---
  if (sentences.length < 2 && pickHome && e.park_factor != null) {
    if (e.park_factor >= 1.10) {
      sentences.push(`${pick} play in one of the most hitter-friendly parks in baseball (${e.park_factor.toFixed(2)}× factor), favouring the stronger lineup in a high-scoring game.`);
    } else if (e.park_factor <= 0.95) {
      sentences.push(`${pick}'s home park suppresses scoring (${e.park_factor.toFixed(2)}× factor), tending to benefit a team with a pitching edge.`);
    }
  }

  return sentences.slice(0, 2);
}

// ---------------------------------------------------------------------------
// "Why this pick" blurb section
// ---------------------------------------------------------------------------
function GameBlurb({ p }) {
  const sentences = buildSentences(p);
  if (!sentences.length) return null;

  return (
    <div style={{
      marginTop: 16,
      padding: '13px 16px',
      background: t.surface,
      borderRadius: 6,
      borderLeft: `3px solid ${t.border}`,
    }}>
      <div style={{
        fontFamily: t.mono,
        fontSize: 10,
        color: t.faint,
        letterSpacing: '.10em',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        Why this pick
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {sentences.map((s, i) => (
          <p key={i} style={{
            margin: 0,
            fontFamily: t.sans,
            fontSize: 14,
            color: '#555555',
            lineHeight: 1.65,
          }}>
            {s}
          </p>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dual-team probability bar
// ---------------------------------------------------------------------------
function ProbBar({ pickProb, grade }) {
  const c = gradeColor[grade] || t.muted;
  const oppProb = 100 - pickProb;
  return (
    <div style={{ height: 5, display: 'flex', borderRadius: 99, overflow: 'hidden', gap: 1 }}>
      <div style={{ width: `${pickProb}%`, background: c, borderRadius: '99px 0 0 99px', transition: 'width .4s ease' }} />
      <div style={{ width: `${oppProb}%`, background: t.border, borderRadius: '0 99px 99px 0' }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
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
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 32px 100px' }}>

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
            Walk-forward model output for every game on today's schedule. Each pick includes a breakdown of the key edge factors.
          </p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 14 }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ border: `1px solid ${t.border}`, borderRadius: 10, padding: '24px 24px', background: t.bg }}>
                  <div style={{ height: 11, background: t.surface, borderRadius: 4, width: `${40 + (i * 9) % 35}%`, marginBottom: 14 }} />
                  <div style={{ height: 20, background: t.surface, borderRadius: 4, width: `${28 + (i * 7) % 28}%`, marginBottom: 18 }} />
                  <div style={{ height: 5, background: t.surface, borderRadius: 99, marginBottom: 16 }} />
                  <div style={{ height: 56, background: t.surface, borderRadius: 6 }} />
                </div>
              ))
              : visible.map(p => {
                const c    = gradeColor[p.grade] || t.muted;
                const opp  = p.pick === p.home_name ? p.away_name : p.home_name;
                const hasPitchers = p.away_pitcher_name || p.home_pitcher_name;
                return (
                  <div key={p.gamePk} style={{
                    border: `1px solid ${t.border}`,
                    borderRadius: 10,
                    background: t.bg,
                    overflow: 'hidden',
                  }}>
                    {/* ── Top meta row ── */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '11px 20px',
                      borderBottom: `1px solid ${t.border}`,
                      background: t.surface,
                      flexWrap: 'wrap', gap: 8,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: t.mono, fontSize: 12, color: t.muted }}>
                        <TeamLogo name={p.away_name} size={13} />
                        {p.away_name}
                        <span style={{ color: t.faint, margin: '0 2px' }}>@</span>
                        <TeamLogo name={p.home_name} size={13} />
                        {p.home_name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <GradeChip grade={p.grade} />
                        <OutcomeBadge outcome={p.outcome} result={p.result} />
                      </div>
                    </div>

                    {/* ── Body ── */}
                    <div style={{ padding: '20px 22px' }}>

                      {/* Pick name + probability */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <TeamLogo name={p.pick} size={30} />
                          <div>
                            <div style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 19, color: t.fg, lineHeight: 1.15 }}>
                              {p.pick}
                            </div>
                            <div style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, marginTop: 3 }}>
                              to win
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: t.mono, fontWeight: 700, fontSize: 26, color: c, lineHeight: 1, letterSpacing: '-.02em' }}>
                            {p.pick_prob}%
                          </div>
                          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, marginTop: 3 }}>
                            +{(p.pick_prob - 50).toFixed(1)} over even
                          </div>
                        </div>
                      </div>

                      {/* Dual probability bar */}
                      <ProbBar pickProb={p.pick_prob} grade={p.grade} />

                      {/* Bar labels */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, marginBottom: 14 }}>
                        <span style={{ fontFamily: t.mono, fontSize: 10, color: c, fontWeight: 600 }}>
                          {p.pick} {p.pick_prob}%
                        </span>
                        <span style={{ fontFamily: t.mono, fontSize: 10, color: t.faint }}>
                          {opp} {(100 - p.pick_prob).toFixed(1)}%
                        </span>
                      </div>

                      {/* Pitcher matchup */}
                      {hasPitchers && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          marginBottom: 4,
                          fontFamily: t.mono, fontSize: 11, color: t.muted,
                        }}>
                          <span style={{ color: t.faint }}>⚾</span>
                          <span>{p.away_pitcher_name || '—'}</span>
                          <span style={{ color: t.faint }}>vs</span>
                          <span>{p.home_pitcher_name || '—'}</span>
                        </div>
                      )}

                      {/* Why this pick */}
                      <GameBlurb p={p} />
                    </div>
                  </div>
                );
              })
            }

            {!loading && visible.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: t.muted, fontFamily: t.mono, fontSize: 13, border: `1px solid ${t.border}`, borderRadius: 10 }}>
                No Grade {filter} picks today.
              </div>
            )}
          </div>
        )}

        {/* Grade legend */}
        {!loading && (
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 8, fontFamily: t.mono, fontSize: 12, color: t.muted }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                { g: 'A', label: '≥65% — strong edge' },
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
            <div style={{ fontSize: 11, color: t.faint, marginTop: 2 }}>
              Edge descriptions generated from rolling pitcher ERA, L10 form, Bayesian team ratings, rest days, and park factors.
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
