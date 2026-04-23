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
      padding: '2px 7px', borderRadius: 3, fontSize: 11, fontWeight: 600,
      fontFamily: t.mono, background: c + '15', color: c, border: `1px solid ${c}30`,
      letterSpacing: '.04em',
    }}>{grade}</span>
  );
}

function PickCard({ p }) {
  const c = gradeColor[p.grade] || t.muted;
  const edge = (p.pick_prob - 50).toFixed(1);
  return (
    <div className="card-hover" style={{
      border: `1px solid ${t.border}`, borderRadius: 8,
      padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10,
      background: t.bg,
    }}>
      <div style={{ fontSize: 12, fontFamily: t.mono, color: t.muted }}>
        {p.away_name} <span style={{ color: t.faint }}>@</span> {p.home_name}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 18, color: t.fg }}>
          {p.pick}
        </div>
        <GradeChip grade={p.grade} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 3, background: t.border, borderRadius: 99 }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${((p.pick_prob - 50) / 50) * 100}%`,
            background: c,
          }} />
        </div>
        <span style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 600, color: c }}>
          {p.pick_prob}%
        </span>
      </div>
      <div style={{ fontFamily: t.mono, fontSize: 11, color: t.faint }}>
        +{edge} edge
      </div>
      {p.outcome && p.outcome !== 'PENDING' && (
        <span style={{
          alignSelf: 'flex-start',
          padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, fontFamily: t.mono,
          background: p.outcome === 'HIT' ? '#2d6a3f18' : '#c4123018',
          color: p.outcome === 'HIT' ? '#2d6a3f' : '#c41230',
          border: `1px solid ${p.outcome === 'HIT' ? '#2d6a3f30' : '#c4123030'}`,
        }}>{p.outcome}{p.result ? ` · ${p.result}` : ''}</span>
      )}
    </div>
  );
}

function MiniStat({ label, value, sub }) {
  return (
    <div style={{
      borderTop: `2px solid ${t.fg}`, paddingTop: 16,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 11, fontFamily: t.mono, color: t.muted, textTransform: 'uppercase', letterSpacing: '.1em' }}>{label}</div>
      <div style={{ fontFamily: t.serif, fontWeight: 800, fontSize: 38, color: t.fg, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, fontFamily: t.mono, color: t.muted }}>{sub}</div>}
    </div>
  );
}

export default function Home() {
  const [preds, setPreds]     = useState(null);
  const [perf,  setPerf]      = useState(null);
  const [predErr, setPredErr] = useState(false);
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    fetchPredictions().then(setPreds).catch(() => setPredErr(true));
    fetchPerformance().then(setPerf).catch(() => {});
  }, []);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const gradePreds = preds?.predictions ?? [];
  const visible = filter === 'all' ? gradePreds : gradePreds.filter(p => p.grade === filter);
  const o = perf?.overall;

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.fg, fontFamily: t.sans }}>
      <Nav />

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 40px 100px' }}>

        {/* Hero */}
        <div className="fade-up" style={{ paddingTop: 96, paddingBottom: 64, borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2d6a3f', animation: 'pulse 2s infinite' }} />
            <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '.12em', textTransform: 'uppercase' }}>
              Live · {today}
            </span>
          </div>
          <h1 style={{
            fontFamily: t.serif, fontWeight: 800, lineHeight: 1.05,
            letterSpacing: '-.03em', marginBottom: 24,
            fontSize: 'clamp(42px,6vw,76px)',
            maxWidth: 800,
          }}>
            MLB win probability.<br />
            <em style={{ fontStyle: 'italic', fontWeight: 400 }}>No guesswork.</em>
          </h1>
          <p style={{ fontSize: 17, color: t.muted, maxWidth: 520, lineHeight: 1.7, marginBottom: 36, fontFamily: t.sans }}>
            Walk-forward validated predictions across every MLB game.
            Grade A picks hit at{' '}
            <strong style={{ color: t.fg, fontWeight: 600 }}>{o?.acc_grade_A ?? '65'}%</strong>{' '}
            accuracy — trained on prior seasons only.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/predictions">
              <button style={{
                background: t.fg, color: t.bg, border: `1px solid ${t.fg}`,
                borderRadius: 4, padding: '11px 22px', fontSize: 14, fontFamily: t.sans,
                cursor: 'pointer', fontWeight: 500,
              }}>Today’s Picks →</button>
            </Link>
            <Link to="/performance">
              <button style={{
                background: 'transparent', color: t.fg, border: `1px solid ${t.border}`,
                borderRadius: 4, padding: '11px 22px', fontSize: 14, fontFamily: t.sans,
                cursor: 'pointer',
              }}>Full Track Record</button>
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="fade-up" style={{
          paddingTop: 48, paddingBottom: 56, borderBottom: `1px solid ${t.border}`,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32,
        }}>
          {!o ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <MiniStat label="Overall accuracy"   value={`${o.accuracy}%`}    sub={`+${o.vs_baseline} vs home baseline`} />
              <MiniStat label="Grade A accuracy"   value={`${o.acc_grade_A ?? '—'}%`} sub="Highest-confidence tier" />
              <MiniStat label="Games validated"    value={o.total_games?.toLocaleString() ?? '—'} sub="Walk-forward holdout" />
              <MiniStat label="Seasons backtested" value={perf?.by_season?.length ?? '—'} sub="2021–2024" />
            </>
          )}
        </div>

        {/* Today's picks */}
        <div style={{ paddingTop: 48, marginBottom: 64 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: t.muted, marginBottom: 6 }}>
                {preds ? preds.date : '—'}
              </div>
              <h2 style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 28, letterSpacing: '-.02em' }}>
                Today’s Predictions
                {preds && (
                  <span style={{ fontFamily: t.mono, fontWeight: 400, fontSize: 14, color: t.muted, marginLeft: 12 }}>
                    {preds.games} games
                  </span>
                )}
              </h2>
            </div>
            {preds && (
              <div style={{ display: 'flex', gap: 4, fontFamily: t.mono, fontSize: 12 }}>
                {['all', 'A', 'B', 'C'].map(g => (
                  <button key={g} onClick={() => setFilter(g)} style={{
                    padding: '5px 12px', borderRadius: 3,
                    border: `1px solid ${filter === g ? t.fg : t.border}`,
                    background: filter === g ? t.fg : 'transparent',
                    color: filter === g ? t.bg : t.muted,
                    cursor: 'pointer', fontSize: 12, fontFamily: t.mono,
                  }}>{g === 'all' ? 'All' : `Grade ${g}`}</button>
                ))}
              </div>
            )}
          </div>

          {predErr && (
            <div style={{
              border: `1px solid #e8c0c0`, borderRadius: 6, padding: '14px 18px',
              color: '#c41230', fontFamily: t.mono, fontSize: 13, marginBottom: 24,
              background: '#fff5f5',
            }}>
              Could not reach the prediction API. Is the backend running?
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))', gap: 12 }}>
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
              <Link to="/predictions" style={{ fontFamily: t.mono, fontSize: 13, color: t.fg, borderBottom: `1px solid ${t.border}` }}>
                Full predictions table →
              </Link>
            </div>
          )}
        </div>

        {/* How it works */}
        <div style={{ paddingBottom: 64, borderBottom: `1px solid ${t.border}` }}>
          <div style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: t.muted, marginBottom: 8 }}>Methodology</div>
          <h2 style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 28, letterSpacing: '-.02em', marginBottom: 36 }}>How the model works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 0 }}>
            {[
              { n: '01', title: 'Live MLB Data', body: 'Game results, lineups, and pitcher stats pulled daily from the official MLB Stats API. No third-party scraping.' },
              { n: '02', title: 'Elo + Rolling Form', body: 'Team Elo ratings updated after every game, combined with 10- and 30-game rolling win rate, run differential, and rest days.' },
              { n: '03', title: 'Pitcher Matchup', body: 'Prior-season ERA and WHIP for each starter — using only stats available before first pitch to prevent data leakage.' },
              { n: '04', title: 'Walk-Forward Validation', body: 'Each test season is evaluated on a model trained only on prior years. No look-ahead bias. Every prediction is a real out-of-sample forecast.' },
            ].map((c, i) => (
              <div key={c.n} style={{
                borderTop: `1px solid ${t.border}`,
                borderLeft: i > 0 ? `1px solid ${t.border}` : 'none',
                padding: '28px 24px',
              }}>
                <div style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, marginBottom: 12 }}>{c.n}</div>
                <div style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 17, marginBottom: 10, color: t.fg }}>{c.title}</div>
                <div style={{ fontSize: 14, color: t.muted, lineHeight: 1.65, fontFamily: t.sans }}>{c.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ paddingTop: 64, paddingBottom: 16, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <h2 style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 'clamp(28px,4vw,48px)', letterSpacing: '-.02em', lineHeight: 1.1, marginBottom: 12 }}>
              See the full<br />track record.
            </h2>
            <p style={{ fontSize: 15, color: t.muted, maxWidth: 400, lineHeight: 1.6, fontFamily: t.sans }}>
              Season-by-season accuracy, grade breakdowns, and every prediction ever made.
            </p>
          </div>
          <Link to="/history">
            <button style={{
              background: t.fg, color: t.bg, border: `1px solid ${t.fg}`,
              borderRadius: 4, padding: '13px 26px', fontSize: 14, fontFamily: t.sans,
              cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap',
            }}>Full Prediction History →</button>
          </Link>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 80, paddingTop: 24, borderTop: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 15, color: t.fg }}>Game 163</span>
          <div style={{ fontSize: 12, fontFamily: t.mono, color: t.faint }}>
            Not affiliated with MLB. Analytics only, not betting advice. © 2026 Game 163
          </div>
        </div>
      </div>
    </div>
  );
}
