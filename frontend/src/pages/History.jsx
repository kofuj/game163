import { useState, useEffect, useMemo } from 'react';
import Nav from '../components/Nav.jsx';
import { fetchRecord } from '../api.js';
import { t, gradeColor } from '../theme.js';

function GradeChip({ grade }) {
  const c = gradeColor[grade] || t.muted;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 24, height: 24, borderRadius: 4, fontSize: 11, fontWeight: 700,
      fontFamily: t.mono, background: c + '15', color: c, border: `1px solid ${c}30`,
    }}>{grade}</span>
  );
}

function OutcomeBadge({ outcome }) {
  if (!outcome || outcome === 'PENDING') return (
    <span style={{ fontFamily: t.mono, fontSize: 12, color: t.faint }}>—</span>
  );
  const hit = outcome === 'HIT';
  return (
    <span style={{
      fontFamily: t.mono, fontSize: 13, fontWeight: 700,
      color: hit ? '#2d6a3f' : '#c41230',
    }}>{outcome}</span>
  );
}

const SORT_OPTIONS = ['Date', 'Confidence', 'Edge'];

export default function History() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [sort,    setSort]    = useState('Date');
  const [grade,   setGrade]   = useState('All');
  const [outcome, setOutcome] = useState('All');

  useEffect(() => {
    fetchRecord(500)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    let list = data?.predictions ?? [];

    if (grade !== 'All')   list = list.filter(p => p.grade === grade);
    if (outcome !== 'All') list = list.filter(p => p.outcome === outcome);

    if (sort === 'Date')       list = [...list].sort((a, b) => b.date.localeCompare(a.date));
    if (sort === 'Confidence') list = [...list].sort((a, b) => b.pick_prob - a.pick_prob);
    if (sort === 'Edge')       list = [...list].sort((a, b) => b.pick_prob - a.pick_prob);

    return list;
  }, [data, sort, grade, outcome]);

  const total   = rows.length;
  const settled = rows.filter(p => p.outcome === 'HIT' || p.outcome === 'MISS').length;
  const hits    = rows.filter(p => p.outcome === 'HIT').length;
  const pct     = settled > 0 ? Math.round((hits / settled) * 100) : null;

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.fg, fontFamily: t.sans }}>
      <Nav />
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 40px 100px' }}>

        {/* Header */}
        <div className="fade-up" style={{ paddingTop: 72, paddingBottom: 40, borderBottom: `1px solid ${t.border}`, marginBottom: 36 }}>
          <h1 style={{ fontFamily: t.serif, fontWeight: 800, fontSize: 'clamp(32px,5vw,52px)', lineHeight: 1.05, letterSpacing: '-.03em', marginBottom: 10 }}>
            Prediction History
          </h1>
          <p style={{ fontSize: 15, color: t.muted, lineHeight: 1.6, maxWidth: 480 }}>
            Every prediction made by the model. Filter by grade or outcome.
            {pct !== null && (
              <> <strong style={{ color: t.fg }}>{hits}/{settled} correct ({pct}%)</strong> on settled picks.</>
            )}
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
          {/* Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, textTransform: 'uppercase', letterSpacing: '.08em' }}>Sort</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {SORT_OPTIONS.map(s => (
                <button key={s} onClick={() => setSort(s)} style={{
                  padding: '5px 12px', borderRadius: 3, fontFamily: t.mono, fontSize: 12,
                  border: `1px solid ${sort === s ? t.fg : t.border}`,
                  background: sort === s ? t.fg : 'transparent',
                  color: sort === s ? t.bg : t.muted, cursor: 'pointer',
                }}>{s}{sort === s ? ' ↓' : ''}</button>
              ))}
            </div>
          </div>

          {/* Grade filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, textTransform: 'uppercase', letterSpacing: '.08em' }}>Grade</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {['All', 'A', 'B', 'C'].map(g => (
                <button key={g} onClick={() => setGrade(g)} style={{
                  padding: '5px 12px', borderRadius: 3, fontFamily: t.mono, fontSize: 12,
                  border: `1px solid ${grade === g ? t.fg : t.border}`,
                  background: grade === g ? t.fg : 'transparent',
                  color: grade === g ? t.bg : t.muted, cursor: 'pointer',
                }}>{g === 'All' ? 'All Grades' : `Grade ${g}`}</button>
              ))}
            </div>
          </div>

          {/* Outcome filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, textTransform: 'uppercase', letterSpacing: '.08em' }}>Outcome</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {['All', 'HIT', 'MISS', 'PENDING'].map(o => (
                <button key={o} onClick={() => setOutcome(o)} style={{
                  padding: '5px 12px', borderRadius: 3, fontFamily: t.mono, fontSize: 12,
                  border: `1px solid ${outcome === o ? t.fg : t.border}`,
                  background: outcome === o ? t.fg : 'transparent',
                  color: outcome === o ? t.bg : t.muted, cursor: 'pointer',
                }}>{o === 'All' ? 'All Outcomes' : o}</button>
              ))}
            </div>
          </div>

          <span style={{ fontFamily: t.mono, fontSize: 12, color: t.faint, marginLeft: 'auto' }}>
            {loading ? 'Loading…' : `${total} pick${total !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Table */}
        <div style={{ border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: t.surface, borderBottom: `1px solid ${t.border}` }}>
                {['Date', 'Matchup', 'Result', 'Pick', 'Grade', 'Outcome'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontFamily: t.mono, fontSize: 11, fontWeight: 500,
                    letterSpacing: '.07em', textTransform: 'uppercase', color: t.muted,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
                    {[1,2,3,4,5,6].map(j => (
                      <td key={j} style={{ padding: '14px 16px' }}>
                        <div style={{ height: 13, background: t.surface, borderRadius: 4, width: `${50 + (i*j*3)%40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: t.faint, fontFamily: t.mono, fontSize: 13 }}>
                    No predictions match the selected filters.
                  </td>
                </tr>
              ) : (
                rows.map((p, i) => {
                  const c = gradeColor[p.grade] || t.muted;
                  return (
                    <tr key={i} className="row-hover" style={{ borderBottom: `1px solid ${t.border}`, transition: 'background .12s' }}>
                      <td style={{ padding: '14px 16px', fontFamily: t.mono, fontSize: 12, color: t.muted, whiteSpace: 'nowrap' }}>
                        {p.date}
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: t.mono, fontSize: 13, color: t.fg, fontWeight: 500 }}>
                        {p.matchup}
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: t.mono, fontSize: 13, color: t.muted }}>
                        {p.result || '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontFamily: t.mono, fontWeight: 600, fontSize: 13, color: c }}>
                          {p.pick}
                        </span>
                        <span style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, marginLeft: 6 }}>
                          {p.pick_prob}%
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <GradeChip grade={p.grade} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <OutcomeBadge outcome={p.outcome} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

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
