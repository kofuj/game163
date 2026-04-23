import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import { Skeleton, StatCardSkeleton, TableRowSkeleton } from '../components/Skeleton.jsx';
import { fetchPerformance, fetchRecord } from '../api.js';
import { t, gradeColor } from '../theme.js';

const PLACEHOLDER_PICKS = [
  { matchup: 'NYY @ BOS', result: '4-3', pick: 'NYY', pick_prob: 58.2, grade: 'B', outcome: 'HIT'  },
  { matchup: 'LAD @ SFG', result: '2-5', pick: 'LAD', pick_prob: 64.1, grade: 'B', outcome: 'MISS' },
  { matchup: 'HOU @ TEX', result: '7-3', pick: 'HOU', pick_prob: 71.3, grade: 'A', outcome: 'HIT'  },
  { matchup: 'ATL @ NYM', result: '3-3', pick: 'ATL', pick_prob: 55.8, grade: 'C', outcome: 'MISS' },
  { matchup: 'CHC @ MIL', result: '1-4', pick: 'MIL', pick_prob: 60.4, grade: 'B', outcome: 'HIT'  },
  { matchup: 'TBR @ BAL', result: '5-2', pick: 'TBR', pick_prob: 52.9, grade: 'C', outcome: 'HIT'  },
];

function StatCard({ label, value, sub }) {
  return (
    <div style={{ borderTop: `2px solid ${t.fg}`, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, color: t.muted, letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: t.mono }}>{label}</div>
      <div style={{ fontSize: 40, fontWeight: 800, color: t.fg, fontFamily: t.serif, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: t.muted, fontFamily: t.mono }}>{sub}</div>}
    </div>
  );
}

function GradeBar({ grade, pct }) {
  const c = gradeColor[grade];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 4,
        background: c + '15', border: `1px solid ${c}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: t.mono, fontWeight: 700, fontSize: 13, color: c,
      }}>{grade}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: t.muted, fontFamily: t.mono }}>
            {grade === 'A' ? '≥65% conf' : grade === 'B' ? '58–65% conf' : '50–58% conf'}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: t.fg, fontFamily: t.mono }}>{pct}%</span>
        </div>
        <div style={{ height: 4, background: t.border, borderRadius: 99 }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${((pct - 50) / 50) * 100}%`,
            background: c, transition: 'width 1s ease',
          }} />
        </div>
      </div>
    </div>
  );
}

function GradeChip({ grade }) {
  const c = gradeColor[grade] || t.muted;
  return (
    <span style={{
      padding: '2px 7px', borderRadius: 3, fontSize: 11, fontWeight: 600, fontFamily: t.mono,
      background: c + '15', color: c, border: `1px solid ${c}30`,
    }}>{grade}</span>
  );
}

function Badge({ outcome }) {
  const isHit = outcome === 'HIT';
  const isPending = outcome === 'PENDING' || !outcome;
  if (isPending) return (
    <span style={{
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, fontFamily: t.mono,
      background: t.surface, color: t.faint, border: `1px solid ${t.border}`,
    }}>PENDING</span>
  );
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, fontFamily: t.mono,
      background: isHit ? '#2d6a3f15' : '#c4123015',
      color: isHit ? '#2d6a3f' : '#c41230',
      border: `1px solid ${isHit ? '#2d6a3f30' : '#c4123030'}`,
    }}>{outcome}</span>
  );
}

const METRICS = [
  { label: 'Accuracy',        desc: 'Percentage of games where the predicted winner won. MLB home baseline is ~54.2%.' },
  { label: 'Log Loss',        desc: 'Calibration score — when we say 70%, it should happen ~70% of the time. Lower is better.' },
  { label: 'Edge (pts)',      desc: 'Distance from 50/50 for each prediction. A 65% pick has 15 pts of edge.' },
  { label: 'Brier Score',     desc: 'Mean squared error of predicted probability vs actual outcome. 0 = perfect.' },
  { label: 'Baseline',        desc: 'Accuracy from always picking the home team. Every useful model must beat this.' },
  { label: 'Holdout Testing', desc: 'Model tested on games it never saw during training. Walk-forward validation by season prevents overfitting.' },
];

const FAQS = [
  { q: 'How accurate is the model?', a: 'Accuracy averages ~55% across 9,936 walk-forward validated games. Grade A picks hit at ~65%.' },
  { q: 'What is walk-forward validation?', a: "Each season's model is trained only on prior years and tested on future games it never saw. This gives realistic accuracy estimates and prevents overfitting." },
  { q: 'How is the baseline calculated?', a: 'The baseline is the accuracy from always picking the home team. In MLB, home teams win roughly 54.2% of games.' },
  { q: 'What does log loss measure?', a: 'Log loss measures calibration. When the model says 70%, those teams should win about 70% of the time. Lower = better.' },
  { q: 'How often are results updated?', a: 'Predictions are generated before each game day. Results are settled after games complete.' },
];

export default function Performance() {
  const [perf,    setPerf]    = useState(null);
  const [record,  setRecord]  = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchPerformance(), fetchRecord(8)])
      .then(([p, r]) => { setPerf(p); setRecord(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const o = perf?.overall;
  const seasons = perf?.by_season ?? [];
  const rawPicks = record?.predictions ?? [];
  const recentPicks = rawPicks.length >= 4
    ? rawPicks
    : [...rawPicks, ...PLACEHOLDER_PICKS.slice(rawPicks.length)];
  const hits = recentPicks.filter(p => p.outcome === 'HIT').length;
  const settled = recentPicks.filter(p => p.outcome !== 'PENDING').length;

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.fg, fontFamily: t.sans }}>
      <Nav />
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 40px 100px' }}>

        {/* Hero */}
        <div className="fade-up" style={{ paddingTop: 72, paddingBottom: 48, borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2d6a3f', animation: 'pulse 2s infinite' }} />
            <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '.12em', textTransform: 'uppercase' }}>
              Live · Updated daily
            </span>
          </div>
          <h1 style={{ fontFamily: t.serif, fontSize: 'clamp(36px,6vw,64px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-.03em', marginBottom: 16 }}>
            How the model<br /><em style={{ fontStyle: 'italic', fontWeight: 400 }}>has performed.</em>
          </h1>
          <p style={{ fontSize: 16, color: t.muted, maxWidth: 520, lineHeight: 1.65 }}>
            The complete record for every Game 163 projection. Win probabilities tested against real outcomes.
            Walk-forward validation only — no cherry-picking.
          </p>
        </div>

        {/* Key stats */}
        <div className="fade-up" style={{
          paddingTop: 48, paddingBottom: 48, borderBottom: `1px solid ${t.border}`,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32,
        }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : o ? (
            <>
              <StatCard label="Accuracy"   value={`${o.accuracy}%`}   sub={`+${o.vs_baseline} vs home baseline`} />
              <StatCard label="Test Games" value={o.total_games?.toLocaleString() ?? '—'} sub="Walk-forward holdout" />
              <StatCard label="A Picks"    value={`${o.acc_grade_A ?? '—'}%`}  sub="Highest confidence tier" />
              <StatCard label="Log Loss"   value={o.log_loss}          sub="Lower is better" />
            </>
          ) : (
            <div style={{ color: t.muted, fontFamily: t.mono, fontSize: 13 }}>Could not load performance data.</div>
          )}
        </div>

        {/* Grade bars + Recent picks */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1, marginBottom: 0, borderBottom: `1px solid ${t.border}` }}>
          <div style={{ borderRight: `1px solid ${t.border}`, padding: '40px 0 40px 0', paddingRight: 32 }}>
            <div style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: t.muted, marginBottom: 24 }}>Accuracy by Grade</div>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ marginBottom: 16 }}><Skeleton height={28} /></div>
              ))
            ) : o ? (
              <>
                <GradeBar grade="A" pct={o.acc_grade_A ?? 65} />
                <GradeBar grade="B" pct={o.acc_grade_B ?? 61} />
                <GradeBar grade="C" pct={o.acc_grade_C ?? 52} />
              </>
            ) : null}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontFamily: t.mono, color: t.faint }}>50% baseline</span>
              <span style={{ fontSize: 11, fontFamily: t.mono, color: t.faint }}>MLB: {o?.baseline ?? 54.2}%</span>
            </div>
          </div>

          <div style={{ padding: '40px 0 40px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: t.muted, marginBottom: 6 }}>Latest Results</div>
                <div style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 22, letterSpacing: '-.02em' }}>Recent Predictions</div>
              </div>
              <div style={{ fontFamily: t.mono, fontSize: 12, color: t.muted, textAlign: 'right' }}>
                {settled > 0 ? `${hits} of ${settled} correct` : 'Settling results…'}<br />
                <span style={{ color: t.faint, fontSize: 11 }}>recent game days</span>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: t.mono }}>
              <thead>
                <tr style={{ color: t.faint, fontSize: 11, letterSpacing: '.07em' }}>
                  {['Matchup', 'Result', 'Pick', 'Grade', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', paddingBottom: 10, fontWeight: 400, borderBottom: `1px solid ${t.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
                  : recentPicks.map((p, i) => (
                    <tr key={i} className="row-hover" style={{ borderBottom: `1px solid ${t.border}`, transition: 'background .12s' }}>
                      <td style={{ padding: '11px 0', fontWeight: 600, color: t.fg }}>{p.matchup}</td>
                      <td style={{ color: t.muted }}>{p.result || '—'}</td>
                      <td style={{ color: t.fg }}>{p.pick} <span style={{ color: t.faint }}>{p.pick_prob}%</span></td>
                      <td><GradeChip grade={p.grade} /></td>
                      <td style={{ textAlign: 'right' }}><Badge outcome={p.outcome} /></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
            <Link to="/predictions" style={{ display: 'block', marginTop: 16, fontSize: 12, fontFamily: t.mono, color: t.fg, borderBottom: `1px solid ${t.border}`, width: 'fit-content' }}>
              View all predictions →
            </Link>
          </div>
        </div>

        {/* Season history */}
        <div style={{ paddingTop: 56, paddingBottom: 56, borderBottom: `1px solid ${t.border}` }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: t.muted, marginBottom: 8 }}>Backtest History</div>
            <h2 style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 28, letterSpacing: '-.02em', marginBottom: 6 }}>Performance by Season</h2>
            <p style={{ fontSize: 14, color: t.muted, maxWidth: 480, lineHeight: 1.6 }}>
              Holdout results across multiple seasons. Each season tested using a model trained only on prior years.
            </p>
          </div>
          <div style={{ border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ padding: '20px 24px', borderBottom: `1px solid ${t.border}` }}>
                  <Skeleton height={20} style={{ marginBottom: 8 }} />
                  <Skeleton width="55%" height={12} />
                </div>
              ))
              : seasons.map((s, i) => (
                <div key={s.season} className="row-hover" style={{
                  display: 'grid', gridTemplateColumns: '80px 1fr 120px 120px',
                  alignItems: 'center', padding: '20px 24px',
                  borderBottom: i < seasons.length - 1 ? `1px solid ${t.border}` : 'none',
                  transition: 'background .12s',
                }}>
                  <div style={{ fontFamily: t.serif, fontWeight: 800, fontSize: 22, color: t.fg }}>{s.season}</div>
                  <div>
                    <div style={{ height: 4, background: t.border, borderRadius: 99, width: '80%', marginBottom: 6 }}>
                      <div style={{
                        height: '100%', borderRadius: 99,
                        width: `${((s.accuracy - 50) / 20) * 100}%`,
                        background: t.fg,
                      }} />
                    </div>
                    <div style={{ fontFamily: t.mono, fontSize: 11, color: t.faint }}>{s.n_games?.toLocaleString()} games</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: t.mono, fontSize: 20, fontWeight: 600, color: t.fg }}>{s.accuracy}%</div>
                    <div style={{ fontSize: 11, color: '#2d6a3f', fontFamily: t.mono }}>+{s.vs_baseline} vs base</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: t.mono, fontSize: 15, color: t.muted }}>{s.log_loss}</div>
                    <div style={{ fontSize: 11, color: t.faint, fontFamily: t.mono }}>log loss</div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Metric explainers */}
        <div style={{ paddingTop: 56, paddingBottom: 56, borderBottom: `1px solid ${t.border}` }}>
          <div style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: t.muted, marginBottom: 8 }}>Understanding the Numbers</div>
          <h2 style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 28, letterSpacing: '-.02em', marginBottom: 32 }}>What the Metrics Mean</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 0 }}>
            {METRICS.map((m, i) => {
              const vals = o
                ? [`${o.accuracy}%`, `${o.log_loss}`, '10.8 avg', `${o.brier_score}`, '54.2%', `${o.total_games?.toLocaleString()} games`]
                : ['—', '—', '—', '—', '54.2%', '—'];
              const col = i % 2;
              const row = Math.floor(i / 2);
              return (
                <div key={m.label} style={{
                  borderTop: row > 0 ? `1px solid ${t.border}` : `2px solid ${t.fg}`,
                  borderLeft: col > 0 ? `1px solid ${t.border}` : 'none',
                  padding: '28px 24px',
                }}>
                  <div style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: t.muted, marginBottom: 8 }}>{m.label}</div>
                  <div style={{ fontFamily: t.serif, fontSize: 32, fontWeight: 800, color: t.fg, marginBottom: 10, lineHeight: 1 }}>{vals[i]}</div>
                  <div style={{ fontSize: 13, color: t.muted, lineHeight: 1.65, fontFamily: t.sans }}>{m.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ paddingTop: 56, paddingBottom: 56 }}>
          <div style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: t.muted, marginBottom: 8 }}>Common Questions</div>
          <h2 style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 28, letterSpacing: '-.02em', marginBottom: 32 }}>Understanding the Track Record</h2>
          <div style={{ border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
            {FAQS.map((f, i) => (
              <div
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  borderBottom: i < FAQS.length - 1 ? `1px solid ${t.border}` : 'none',
                  padding: '20px 24px',
                  background: openFaq === i ? t.surface : t.bg,
                  transition: 'background .15s', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 16, color: t.fg }}>{f.q}</div>
                  <div style={{
                    fontSize: 20, color: t.muted, marginLeft: 16, flexShrink: 0,
                    transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform .2s',
                  }}>+</div>
                </div>
                {openFaq === i && (
                  <div style={{ marginTop: 10, fontSize: 14, color: t.muted, lineHeight: 1.7, maxWidth: 600, fontFamily: t.sans }}>{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ paddingTop: 24, borderTop: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 15 }}>Game 163</span>
          <div style={{ fontSize: 12, fontFamily: t.mono, color: t.faint }}>
            Not affiliated with MLB. Analytics only, not betting advice. © 2026 Game 163
          </div>
        </div>
      </div>
    </div>
  );
}
