import { useState, useEffect, useMemo } from 'react';
import Nav from '../components/Nav.jsx';
import { fetchRecord } from '../api.js';
import { t, gradeColor } from '../theme.js';
import TeamLogo from '../components/TeamLogo.jsx';

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

function formatDate(d) {
  if (!d) return d;
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function DayRecord({ picks }) {
  const settled = picks.filter(p => p.outcome === 'HIT' || p.outcome === 'MISS');
  const hits = picks.filter(p => p.outcome === 'HIT').length;
  const pct = settled.length > 0 ? Math.round((hits / settled.length) * 100) : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: t.mono, fontSize: 12 }}>
      {pct !== null && (
        <span style={{ color: pct >= 55 ? '#2d6a3f' : pct < 45 ? '#c41230' : t.muted }}>
          {hits}/{settled.length} correct ({pct}%)
        </span>
      )}
      <span style={{ color: t.faint }}>{picks.length} pick{picks.length !== 1 ? 's' : ''}</span>
    </div>
  );
}

export default function History() {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [grade,    setGrade]    = useState('All');
  const [outcome,  setOutcome]  = useState('All');
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    fetchRecord(500)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group filtered rows by date, newest first
  const grouped = useMemo(() => {
    let list = data?.predictions ?? [];
    if (grade !== 'All')   list = list.filter(p => p.grade === grade);
    if (outcome !== 'All') list = list.filter(p => p.outcome === outcome);

    const map = {};
    list.forEach(p => {
      if (!map[p.date]) map[p.date] = [];
      map[p.date].push(p);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [data, grade, outcome]);

  // Auto-expand the most recent date on first load
  useEffect(() => {
    if (grouped.length > 0 && expanded.size === 0) {
      setExpanded(new Set([grouped[0][0]]));
    }
  }, [grouped.length]);

  const toggle = (date) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  };

  const allPicks  = data?.predictions ?? [];
  const settled   = allPicks.filter(p => p.outcome === 'HIT' || p.outcome === 'MISS');
  const hits      = allPicks.filter(p => p.outcome === 'HIT').length;
  const overallPct = settled.length > 0 ? Math.round((hits / settled.length) * 100) : null;
  const totalFiltered = grouped.reduce((sum, [, picks]) => sum + picks.length, 0);

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
            Every prediction made by the model, grouped by day.
            {overallPct !== null && (
              <> <strong style={{ color: t.fg }}>{hits}/{settled.length} correct ({overallPct}%)</strong> on settled picks.</>
            )}
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
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
            {loading ? 'Loading…' : `${totalFiltered} pick${totalFiltered !== 1 ? 's' : ''} · ${grouped.length} day${grouped.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Date sections */}
        {loading ? (
          <div style={{ border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ padding: '18px 20px', borderBottom: `1px solid ${t.border}`, background: i % 2 === 0 ? t.surface : t.bg }}>
                <div style={{ height: 13, background: t.border, borderRadius: 4, width: `${20 + i * 8}%` }} />
              </div>
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: t.faint, fontFamily: t.mono, fontSize: 13, border: `1px solid ${t.border}`, borderRadius: 8 }}>
            No predictions match the selected filters.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {grouped.map(([date, picks]) => {
              const open = expanded.has(date);
              return (
                <div key={date} style={{ border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>

                  {/* Date header — clickable */}
                  <button
                    onClick={() => toggle(date)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 20px', background: open ? t.surface : t.bg,
                      border: 'none', cursor: 'pointer', gap: 16,
                      borderBottom: open ? `1px solid ${t.border}` : 'none',
                      transition: 'background .15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 15, color: t.fg }}>
                        {formatDate(date)}
                      </span>
                      <DayRecord picks={picks} />
                    </div>
                    <span style={{ fontFamily: t.mono, fontSize: 12, color: t.muted, flexShrink: 0 }}>
                      {open ? '↑ collapse' : '↓ expand'}
                    </span>
                  </button>

                  {/* Picks table */}
                  {open && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                      <thead>
                        <tr style={{ background: t.surface, borderBottom: `1px solid ${t.border}` }}>
                          {['Matchup', 'Result', 'Pick', 'Grade', 'Outcome'].map(h => (
                            <th key={h} style={{
                              padding: '10px 16px', textAlign: 'left',
                              fontFamily: t.mono, fontSize: 11, fontWeight: 500,
                              letterSpacing: '.07em', textTransform: 'uppercase', color: t.muted,
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {picks.map((p, i) => {
                          const c = gradeColor[p.grade] || t.muted;
                          const [away, home] = (p.matchup || '').split(' @ ');
                          return (
                            <tr key={i} className="row-hover" style={{ borderBottom: i < picks.length - 1 ? `1px solid ${t.border}` : 'none', transition: 'background .12s' }}>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: t.mono, fontSize: 13 }}>
                                  <TeamLogo name={away} size={16} />
                                  <span style={{ color: t.muted }}>{away}</span>
                                  <span style={{ color: t.faint, fontSize: 11 }}>@</span>
                                  <TeamLogo name={home} size={16} />
                                  <span style={{ color: t.fg, fontWeight: 500 }}>{home}</span>
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px', fontFamily: t.mono, fontSize: 13, color: t.muted }}>
                                {p.result || '—'}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <TeamLogo name={p.pick} size={18} />
                                  <span style={{ fontFamily: t.mono, fontWeight: 600, fontSize: 13, color: c }}>{p.pick}</span>
                                </div>
                                <div style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, marginTop: 2 }}>
                                  {p.pick_prob}%
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <GradeChip grade={p.grade} />
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <OutcomeBadge outcome={p.outcome} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
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
