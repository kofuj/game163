import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import { PredictionCardSkeleton, StatCardSkeleton } from '../components/Skeleton.jsx';
import { fetchPredictions, fetchPerformance } from '../api.js';
import { t, gradeColor } from '../theme.js';

function GradeChip({ grade }) {
  const c = gradeColor[grade] || t.muted;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
      fontFamily: t.mono, background: c + '22', color: c, border: `1px solid ${c}44`,
    }}>{grade}</span>
  );
}

function PickCard({ p }) {
  const c = gradeColor[p.grade] || t.muted;
  return (
    <div className="card-hover" style={{
      background: t.card, border: `1px solid ${t.border}`,
      borderRadius: 12, padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ fontSize: 12, fontFamily: t.mono, color: t.muted, lineHeight: 1.4 }}>
        {p.away_name} <span style={{ color: 'rgba(245,240,232,.3)' }}>@</span> {p.home_name}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 17, color: t.cream }}>
          {p.pick}
        </div>
        <GradeChip grade={p.grade} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.06)', borderRadius: 99 }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${((p.pick_prob - 50) / 50) * 100}%`,
            background: c,
          }} />
        </div>
        <span style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 700, color: c }}>
          {p.pick_prob}%
        </span>
      </div>
      {p.outcome && p.outcome !== 'PENDING' && (
        <span style={{
          alignSelf: 'flex-start',
          padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, fontFamily: t.mono,
          background: p.outcome === 'HIT' ? 'rgba(127,176,105,.15)' : 'rgba(196,18,48,.12)',
          color: p.outcome === 'HIT' ? '#7fb069' : '#e05570',
          border: `1px solid ${p.outcome === 'HIT' ? 'rgba(127,176,105,.3)' : 'rgba(196,18,48,.25)'}`,
        }}>{p.outcome} {p.result ? `· ${p.result}` : ''}</span>
      )}
    </div>
  );
}

function MiniStat({ label, value, sub, highlight }) {
  return (
    <div style={{
      background: t.card, border: `1px solid ${t.border}`,
      borderRadius: 12, padding: '22px 20px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 12, fontFamily: t.mono, color: t.muted, textTransform: 'uppercase', letterSpacing: '.1em' }}>{label}</div>
      <div style={{ fontFamily: t.serif, fontWeight: 800, fontSize: 34, color: highlight ? t.gold : t.cream, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, fontFamily: t.mono, color: '#7fb069' }}>{sub}</div>}
    </div>
  );
}

export default function Home() {
  const [preds, setPreds]   = useState(null);
  const [perf,  setPerf]    = useState(null);
  const [predErr, setPredErr] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchPredictions().then(setPreds).catch(() => setPredErr(true));
    fetchPerformance().then(setPerf).catch(() => {});
  }, []);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const gradePreds = preds?.predictions ?? [];
  const visible = filter === 'all'
    ? gradePreds
    : gradePreds.filter(p => p.grade === filter);

  const o = perf?.overall;

  return (
    <div style={{ minHeight: '100vh', background: t.dark, color: t.cream, fontFamily: 'Georgia, serif' }}>
      <Nav />

      {/* Background glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `
          radial-gradient(ellipse 80% 40% at 50% 0%, rgba(26,92,42,.22) 0%, transparent 70%),
          radial-gradient(ellipse 40% 60% at 100% 50%, rgba(212,168,67,.05) 0%, transparent 60%)
        `,
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px 80px', position: 'relative', zIndex: 1 }}>

        {/* Hero */}
        <div className="fade-up" style={{ paddingTop: 72, paddingBottom: 56, borderBottom: `1px solid rgba(255,255,255,.06)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#7fb069', animation: 'pulse 2s infinite' }} />
            <span style={{ fontFamily: t.mono, fontSize: 12, color: '#7fb069', letterSpacing: '.12em', textTransform: 'uppercase' }}>Live · {today}</span>
          </div>
          <h1 style={{
            fontFamily: t.serif, fontWeight: 800, lineHeight: 1.05,
            letterSpacing: '-.03em', marginBottom: 18,
            fontSize: 'clamp(38px,6vw,68px)',
          }}>
            MLB Win Probability.<br />
            <span style={{ color: t.gold }}>No guesswork.</span>
          </h1>
          <p style={{ fontSize: 17, color: t.muted, maxWidth: 520, lineHeight: 1.65, marginBottom: 32 }}>
            Walk-forward validated predictions across every MLB game. Trained on prior seasons only.
            Grade A picks hit at <strong style={{ color: t.cream }}>{o?.acc_grade_A ?? '65'}%</strong> accuracy.
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Link to="/predictions">
              <button style={{
                background: t.green, color: t.cream, border: 'none', borderRadius: 8,
                padding: '12px 24px', fontSize: 14, fontFamily: t.mono, fontWeight: 700,
                cursor: 'pointer', letterSpacing: '.04em',
              }}>Today's Picks →</button>
            </Link>
            <Link to="/performance">
              <button style={{
                background: 'transparent', color: t.cream,
                border: `1px solid rgba(255,255,255,.15)`,
                borderRadius: 8, padding: '12px 24px', fontSize: 14, fontFamily: t.mono,
                cursor: 'pointer', letterSpacing: '.04em',
              }}>Full Track Record</button>
            </Link>
          </div>
        </div>

        {/* Quick stats */}
        <div className="fade-up" style={{
          paddingTop: 40, marginBottom: 48,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14,
        }}>
          {!o ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <MiniStat label="Overall accuracy"   value={`${o.accuracy}%`}    sub={`+${o.vs_baseline} vs home baseline`} highlight />
              <MiniStat label="Grade A accuracy"   value={`${o.acc_grade_A ?? '—'}%`} sub="Highest-confidence tier" />
              <MiniStat label="Games validated"    value={o.total_games.toLocaleString()} sub="Walk-forward holdout" />
              <MiniStat label="Seasons backtested" value={perf?.by_season?.length ?? '—'} sub="2021 – 2024" />
            </>
          )}
        </div>

        {/* Today's picks */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: t.muted, marginBottom: 4 }}>
                {preds ? preds.date : 'Loading...'}
              </div>
              <div style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 26 }}>
                Today's Predictions
                {preds && <span style={{ fontFamily: t.mono, fontWeight: 400, fontSize: 14, color: t.muted, marginLeft: 10 }}>
                  {preds.games} games
                </span>}
              </div>
            </div>
            {preds && (
              <div style={{ display: 'flex', gap: 8, fontFamily: t.mono, fontSize: 12 }}>
                {['all', 'A', 'B', 'C'].map(g => (
                  <button key={g} onClick={() => setFilter(g)} style={{
                    padding: '5px 12px', borderRadius: 6, border: `1px solid ${filter === g ? t.gold : 'rgba(255,255,255,.1)'}`,
                    background: filter === g ? 'rgba(212,168,67,.12)' : 'transparent',
                    color: filter === g ? t.gold : t.muted, cursor: 'pointer', fontSize: 12, fontFamily: t.mono,
                  }}>{g === 'all' ? 'All' : `Grade ${g}`}</button>
                ))}
              </div>
            )}
          </div>

          {predErr && (
            <div style={{ background: 'rgba(196,18,48,.08)', border: '1px solid rgba(196,18,48,.2)', borderRadius: 10, padding: '16px 20px', color: '#e05570', fontFamily: t.mono, fontSize: 13 }}>
              Could not reach the prediction API. Is the backend running?
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {!preds && !predErr
              ? Array.from({ length: 6 }).map((_, i) => <PredictionCardSkeleton key={i} />)
              : visible.map(p => <PickCard key={p.gamePk} p={p} />)
            }
          </div>

          {preds && visible.length === 0 && (
            <div style={{ textAlign: 'center', color: t.muted, fontFamily: t.mono, fontSize: 13, padding: '32px 0' }}>
              No Grade {filter} picks today.
            </div>
          )}

          {preds && (
            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <Link to="/predictions" style={{ fontFamily: t.mono, fontSize: 13, color: t.gold }}>
                Full predictions table →
              </Link>
            </div>
          )}
        </div>

        {/* How it works */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: t.muted, marginBottom: 6 }}>Methodology</div>
          <div style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 26, marginBottom: 24 }}>How the Model Works</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              { icon: '📡', title: 'Live MLB Data', body: 'Game results, lineups, and pitcher stats pulled daily from the official MLB Stats API. No third-party scraping.' },
              { icon: '⚙️', title: 'Elo + Rolling Form', body: 'Team Elo ratings updated after every game, combined with 10- and 30-game rolling win rate, run differential, and rest days.' },
              { icon: '⚾', title: 'Pitcher Matchup', body: 'Prior-season ERA and WHIP for each starter — using only stats available before first pitch to prevent data leakage.' },
              { icon: '🔄', title: 'Walk-Forward Validation', body: 'Each test season is evaluated on a model trained only on prior years. No look-ahead bias. Every prediction is a real out-of-sample forecast.' },
            ].map(c => (
              <div key={c.title} className="card-hover" style={{
                background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: '22px 20px',
              }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>{c.icon}</div>
                <div style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: t.muted, lineHeight: 1.6 }}>{c.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA banner */}
        <div style={{
          background: `linear-gradient(135deg, rgba(26,92,42,.35), rgba(26,92,42,.15))`,
          border: `1px solid rgba(26,92,42,.5)`, borderRadius: 14, padding: '36px 40px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20,
        }}>
          <div>
            <div style={{ fontFamily: t.serif, fontWeight: 800, fontSize: 22, marginBottom: 8 }}>See the full track record</div>
            <div style={{ fontSize: 14, color: t.muted }}>Season-by-season accuracy, grade breakdowns, and every prediction ever made.</div>
          </div>
          <Link to="/performance">
            <button style={{
              background: t.gold, color: t.dark, border: 'none', borderRadius: 8,
              padding: '12px 24px', fontSize: 14, fontFamily: t.mono, fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>Performance Dashboard →</button>
          </Link>
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
