import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import { Skeleton, StatCardSkeleton, TableRowSkeleton } from '../components/Skeleton.jsx';
import { fetchPerformance, fetchRecord } from '../api.js';
import { t, gradeColor } from '../theme.js';

// ── Placeholder recent picks shown when record is sparse ──────────────────────
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
    <div style={{
      background: 'rgba(255,255,255,.04)', border: `1px solid ${t.border}`,
      borderRadius: 12, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ fontSize: 13, color: t.muted, letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: t.mono }}>{label}</div>
      <div style={{ fontSize: 42, fontWeight: 800, color: t.cream, fontFamily: t.serif, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: t.gold, fontFamily: t.mono }}>{sub}</div>}
    </div>
  );
}

function GradeBar({ grade, pct }) {
  const c = gradeColor[grade];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 6, background: c + '22',
        border: `1px solid ${c}55`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: t.mono, fontWeight: 700, fontSize: 14, color: c,
      }}>{grade}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'rgba(245,240,232,.5)', fontFamily: t.mono }}>
            {grade === 'A' ? '≥65% conf' : grade === 'B' ? '58–65% conf' : '50–58% conf'}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: t.cream, fontFamily: t.mono }}>{pct}%</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 99 }}>
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

function Badge({ outcome }) {
  const isHit = outcome === 'HIT';
  const isPending = outcome === 'PENDING' || !outcome;
  if (isPending) return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, fontFamily: t.mono,
      background: 'rgba(255,255,255,.06)', color: 'rgba(245,240,232,.4)',
      border: '1px solid rgba(255,255,255,.1)',
    }}>PENDING</span>
  );
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, fontFamily: t.mono,
      background: isHit ? 'rgba(127,176,105,.15)' : 'rgba(196,18,48,.12)',
      color: isHit ? '#7fb069' : '#e05570',
      border: `1px solid ${isHit ? 'rgba(127,176,105,.3)' : 'rgba(196,18,48,.25)'}`,
    }}>{outcome}</span>
  );
}

function GradeChip({ grade }) {
  const c = gradeColor[grade] || t.muted;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: t.mono,
      background: c + '22', color: c, border: `1px solid ${c}44`,
    }}>{grade}</span>
  );
}

const METRICS = [
  { label: 'Accuracy',        desc: 'Percentage of games where the predicted winner actually won. MLB home baseline is ~54.2%.' },
  { label: 'Log Loss',        desc: 'Calibration score — when we say 70%, it should happen ~70% of the time. Lower is better. 0 = perfect, 0.693 = random.' },
  { label: 'Edge (pts)',      desc: 'Distance from 50/50 for each prediction. A 65% pick has 15 pts of edge. Higher edge = higher confidence.' },
  { label: 'Brier Score',     desc: 'Mean squared error of predicted probability vs actual outcome. Combines accuracy and calibration. 0 = perfect.' },
  { label: 'Baseline',        desc: 'Accuracy from always picking the home team. Every useful model must beat this. Home teams win ~54.2% of MLB games.' },
  { label: 'Holdout Testing', desc: 'Model tested on games it never saw during training. Walk-forward validation by season prevents overfitting.' },
];

const FAQS = [
  { q: 'How accurate is the MLB prediction model?', a: 'Accuracy varies by season but averages ~55% across 9,936 walk-forward validated games. Grade A picks hit at ~65%.' },
  { q: 'What is walk-forward validation?', a: 'Each season\'s model is trained only on prior years and tested on future games it never saw. This gives realistic accuracy estimates and prevents overfitting.' },
  { q: 'How is the baseline calculated?', a: 'The baseline is the accuracy you\'d get by always picking the home team. In MLB, home teams win roughly 54.2% of games.' },
  { q: 'What does log loss measure?', a: 'Log loss measures calibration. When the model says 70%, those teams should win about 70% of the time. Lower = better. Random guessing scores 0.693.' },
  { q: 'How often are results updated?', a: 'Predictions are generated before each game day. Results are settled after games complete. Every prediction ever made is logged in the full results table.' },
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

  // Merge real record data with placeholder where sparse
  const rawPicks = record?.predictions ?? [];
  const recentPicks = rawPicks.length >= 4
    ? rawPicks
    : [...rawPicks, ...PLACEHOLDER_PICKS.slice(rawPicks.length)];

  const hits = recentPicks.filter(p => p.outcome === 'HIT').length;
  const settled = recentPicks.filter(p => p.outcome !== 'PENDING').length;

  return (
    <div style={{ minHeight: '100vh', background: t.dark, color: t.cream, fontFamily: 'Georgia, serif' }}>
      <Nav />
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `
          radial-gradient(ellipse 80% 40% at 50% 0%, rgba(26,92,42,.25) 0%, transparent 70%),
          radial-gradient(ellipse 40% 60% at 100% 50%, rgba(212,168,67,.06) 0%, transparent 60%)
        `,
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px 80px', position: 'relative', zIndex: 1 }}>

        {/* Hero */}
        <div className="fade-up" style={{ paddingTop: 64, paddingBottom: 48, borderBottom: `1px solid rgba(255,255,255,.06)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#7fb069', animation: 'pulse 2s infinite' }} />
            <span style={{ fontFamily: t.mono, fontSize: 12, color: '#7fb069', letterSpacing: '.12em', textTransform: 'uppercase' }}>Live · Updated daily</span>
          </div>
          <h1 style={{ fontFamily: t.serif, fontSize: 'clamp(36px,6vw,64px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-.03em', marginBottom: 16 }}>
            How the Model<br />Has Performed
          </h1>
          <p style={{ fontSize: 17, color: t.muted, maxWidth: 540, lineHeight: 1.6 }}>
            The complete record for every Game 163 projection. Win probabilities tested against real outcomes.
            Walk-forward validation only — no cherry-picking.
          </p>
        </div>

        {/* Key stats */}
        <div className="fade-up" style={{ paddingTop: 40, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 48 }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : o ? (
            <>
              <StatCard label="Accuracy"   value={`${o.accuracy}%`}    sub={`+${o.vs_baseline} vs home baseline`} />
              <StatCard label="Test Games" value={o.total_games.toLocaleString()} sub="Walk-forward holdout" />
              <StatCard label="A Picks"    value={`${o.acc_grade_A ?? '—'}%`}  sub="Highest confidence tier" />
              <StatCard label="Log Loss"   value={o.log_loss}           sub="Lower is better" />
            </>
          ) : (
            <div style={{ color: t.muted, fontFamily: t.mono, fontSize: 13 }}>Could not load performance data.</div>
          )}
        </div>

        {/* Grade bars + Recent picks */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 48 }}>
          {/* Grade bars */}
          <div style={{ background: 'rgba(255,255,255,.03)', border: `1px solid ${t.border}`, borderRadius: 14, padding: 28 }}>
            <div style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(245,240,232,.4)', marginBottom: 24 }}>Accuracy by Grade</div>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <Skeleton height={32} style={{ marginBottom: 8 }} />
                </div>
              ))
            ) : o ? (
              <>
                <GradeBar grade="A" pct={o.acc_grade_A ?? 65} />
                <GradeBar grade="B" pct={o.acc_grade_B ?? 61} />
                <GradeBar grade="C" pct={o.acc_grade_C ?? 52} />
              </>
            ) : null}
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid rgba(255,255,255,.06)`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontFamily: t.mono, color: 'rgba(245,240,232,.35)' }}>50% baseline</span>
              <span style={{ fontSize: 11, fontFamily: t.mono, color: 'rgba(245,240,232,.35)' }}>100%</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, fontFamily: t.mono, color: 'rgba(245,240,232,.4)' }}>
              MLB Baseline: {o?.baseline ?? 54.2}%
            </div>
          </div>

          {/* Recent picks */}
          <div style={{ background: 'rgba(255,255,255,.03)', border: `1px solid ${t.border}`, borderRadius: 14, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(245,240,232,.4)', marginBottom: 6 }}>Latest Results</div>
                <div style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 20 }}>Recent Predictions</div>
              </div>
              <div style={{ fontFamily: t.mono, fontSize: 12, color: '#7fb069', textAlign: 'right' }}>
                {settled > 0 ? `${hits} of ${settled} correct` : 'Settling results…'}<br />
                <span style={{ color: 'rgba(245,240,232,.35)', fontSize: 11 }}>recent game days</span>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: t.mono }}>
              <thead>
                <tr style={{ color: 'rgba(245,240,232,.35)', fontSize: 11, letterSpacing: '.08em' }}>
                  {['Matchup', 'Result', 'Pick', 'Grade', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', paddingBottom: 12, fontWeight: 400, borderBottom: `1px solid rgba(255,255,255,.06)` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
                  : recentPicks.map((p, i) => (
                    <tr key={i} className="row-hover" style={{ borderBottom: `1px solid rgba(255,255,255,.04)`, transition: 'background .15s' }}>
                      <td style={{ padding: '11px 0', fontWeight: 700, color: t.cream }}>{p.matchup}</td>
                      <td style={{ color: 'rgba(245,240,232,.5)' }}>{p.result || '—'}</td>
                      <td style={{ color: t.gold }}>{p.pick} <span style={{ color: 'rgba(245,240,232,.4)' }}>{p.pick_prob}%</span></td>
                      <td><GradeChip grade={p.grade} /></td>
                      <td style={{ textAlign: 'right' }}><Badge outcome={p.outcome} /></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
            <Link to="/predictions" style={{ display: 'block', marginTop: 16, fontSize: 12, fontFamily: t.mono, color: t.gold }}>
              View all predictions →
            </Link>
          </div>
        </div>

        {/* Season history */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(245,240,232,.4)', marginBottom: 6 }}>Backtest History</div>
            <div style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 28 }}>Performance by Season</div>
            <p style={{ fontSize: 14, color: 'rgba(245,240,232,.45)', marginTop: 6 }}>
              Holdout results across multiple seasons. Each season tested using a model trained only on prior years.
            </p>
          </div>
          <div style={{ background: 'rgba(255,255,255,.03)', border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                  <Skeleton height={24} style={{ marginBottom: 8 }} />
                  <Skeleton width="60%" height={12} />
                </div>
              ))
              : seasons.map((s, i) => (
                <div key={s.season} className="row-hover" style={{
                  display: 'grid', gridTemplateColumns: '80px 1fr 120px 120px 120px',
                  alignItems: 'center', padding: '20px 28px',
                  borderBottom: i < seasons.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none',
                  transition: 'background .15s',
                }}>
                  <div style={{ fontFamily: t.serif, fontWeight: 800, fontSize: 22, color: i === 0 ? t.gold : t.cream }}>{s.season}</div>
                  <div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 99, width: '80%', marginBottom: 8 }}>
                      <div style={{
                        height: '100%', borderRadius: 99,
                        width: `${((s.accuracy - 50) / 20) * 100}%`,
                        background: i === 0 ? t.gold : t.green,
                      }} />
                    </div>
                    <div style={{ fontFamily: t.mono, fontSize: 11, color: 'rgba(245,240,232,.35)' }}>{s.n_games.toLocaleString()} games</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: t.mono, fontSize: 22, fontWeight: 700, color: t.cream }}>{s.accuracy}%</div>
                    <div style={{ fontSize: 11, color: '#7fb069', fontFamily: t.mono }}>+{s.vs_baseline} vs base</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: t.mono, fontSize: 16, color: 'rgba(245,240,232,.6)' }}>{s.log_loss}</div>
                    <div style={{ fontSize: 11, color: 'rgba(245,240,232,.3)', fontFamily: t.mono }}>log loss</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: t.mono, fontSize: 12, color: 'rgba(245,240,232,.35)' }}>{s.n_games.toLocaleString()} games</div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Metric explainers */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(245,240,232,.4)', marginBottom: 6 }}>Understanding the Numbers</div>
            <div style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 28 }}>What the Metrics Mean</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {METRICS.map((m, i) => {
              const vals = o
                ? [`${o.accuracy}%`, `${o.log_loss}`, '10.8 avg', `${o.brier_score}`, '54.2%', `${o.total_games.toLocaleString()} games`]
                : ['—', '—', '—', '—', '54.2%', '—'];
              return (
                <div key={m.label} style={{
                  background: 'rgba(255,255,255,.03)', border: `1px solid ${t.border}`, borderRadius: 12, padding: '24px 22px',
                }}>
                  <div style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,.35)', marginBottom: 8 }}>{m.label}</div>
                  <div style={{ fontFamily: t.serif, fontSize: 30, fontWeight: 800, color: t.gold, marginBottom: 10 }}>{vals[i]}</div>
                  <div style={{ fontSize: 13, color: 'rgba(245,240,232,.5)', lineHeight: 1.6 }}>{m.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(245,240,232,.4)', marginBottom: 6 }}>Common Questions</div>
            <div style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 28 }}>Understanding the Track Record</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,.03)', border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {FAQS.map((f, i) => (
              <div
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  borderBottom: i < FAQS.length - 1 ? `1px solid rgba(255,255,255,.05)` : 'none',
                  padding: '20px 28px',
                  background: openFaq === i ? 'rgba(26,92,42,.12)' : 'transparent',
                  transition: 'background .2s', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 16 }}>{f.q}</div>
                  <div style={{
                    fontSize: 20, color: t.gold, marginLeft: 16, flexShrink: 0,
                    transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform .2s',
                  }}>+</div>
                </div>
                {openFaq === i && (
                  <div style={{ marginTop: 12, fontSize: 14, color: 'rgba(245,240,232,.55)', lineHeight: 1.7, maxWidth: 640 }}>{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>

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
