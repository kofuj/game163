import { useState, useEffect } from 'react';
import Nav from '../components/Nav.jsx';
import { fetchProps } from '../api.js';
import { t } from '../theme.js';

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------
const fmtProb = v => (v >= 0.10 ? v.toFixed(2) : v.toFixed(3));

function SideTag({ side }) {
  if (!side || side === 'PUSH') return (
    <span style={{ fontFamily: t.mono, fontSize: 10, color: t.muted }}>—</span>
  );
  const over = side === 'OVER';
  return (
    <span style={{
      fontFamily: t.mono, fontSize: 10, fontWeight: 600,
      color: over ? '#2d6a3f' : '#c41230',
      background: over ? '#2d6a3f12' : '#c4123012',
      padding: '1px 5px', borderRadius: 3,
    }}>
      {over ? '↑' : '↓'} {side}
    </span>
  );
}

function StatCell({ label, proj, line, side, overPct }) {
  const isOver = side === 'OVER';
  const isUnder = side === 'UNDER';
  const pct = overPct != null ? (isOver ? overPct : 100 - overPct) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 68 }}>
      <span style={{ fontFamily: t.mono, fontSize: 10, color: t.faint, textTransform: 'uppercase', letterSpacing: '.04em' }}>
        {label}
      </span>
      <span style={{ fontFamily: t.mono, fontWeight: 700, fontSize: 15, color: t.fg, lineHeight: 1 }}>
        {typeof proj === 'number' ? proj.toFixed(proj >= 10 ? 0 : 1) : proj}
      </span>
      {line !== undefined && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: t.mono, fontSize: 10, color: t.faint }}>{line}</span>
            <SideTag side={side} />
          </div>
          {pct != null && (
            <span style={{
              fontFamily: t.mono, fontSize: 11, fontWeight: 600,
              color: isOver ? '#2d6a3f' : isUnder ? '#c41230' : t.muted,
            }}>
              {pct}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pitcher card
// ---------------------------------------------------------------------------
function PitcherCard({ pitcher, label }) {
  const p = pitcher?.projection;
  const name = pitcher?.name || 'TBD';

  // Highlight FIP if it meaningfully differs from ERA
  const fipDelta = p ? p.season_fip - p.season_era : 0;
  const fipColor = fipDelta < -0.4 ? '#c41230' : fipDelta > 0.4 ? '#2d6a3f' : t.fg;

  return (
    <div style={{
      flex: 1, padding: '14px 16px',
      border: `1px solid ${t.border}`, borderRadius: 8,
      background: t.surface,
    }}>
      <div style={{ fontFamily: t.mono, fontSize: 10, color: t.faint, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 16, marginBottom: 10, color: t.fg }}>
        {name}
      </div>

      {p ? (
        <>
          {/* Season metrics row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'ERA',   value: p.season_era },
              { label: 'FIP',   value: p.season_fip,  color: fipColor },
              { label: 'xERA',  value: p.season_xera },
              { label: 'WHIP',  value: p.season_whip },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '5px 9px', background: t.bg, borderRadius: 5,
                border: `1px solid ${t.border}`, minWidth: 46,
              }}>
                <span style={{ fontFamily: t.mono, fontSize: 9, color: t.faint, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
                <span style={{ fontFamily: t.mono, fontWeight: 700, fontSize: 14, color: color || t.fg }}>{value}</span>
              </div>
            ))}
          </div>

          {/* K% / BB% */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontFamily: t.mono, fontSize: 11 }}>
            <span style={{ color: t.muted }}>K% <strong style={{ color: t.fg }}>{p.season_k_pct}%</strong></span>
            <span style={{ color: t.muted }}>BB% <strong style={{ color: t.fg }}>{p.season_bb_pct}%</strong></span>
            <span style={{ color: t.muted }}>{p.season_ip_per_gs} IP/GS</span>
          </div>

          {/* Projections */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, borderTop: `1px solid ${t.border}`, paddingTop: 12 }}>
            <StatCell label="Strikeouts" proj={p.proj_k}    line={p.k_line}    side={p.k_side}    overPct={p.k_over_pct} />
            <StatCell label="Outs Rec."  proj={p.proj_outs} line={p.outs_line} side={p.outs_side} overPct={p.outs_over_pct} />
            <StatCell label="Earn. Runs" proj={p.proj_er}   line={p.er_line}   side={p.er_side}   overPct={p.er_over_pct} />
          </div>
        </>
      ) : (
        <div style={{ fontFamily: t.mono, fontSize: 12, color: t.faint }}>
          {name === 'TBD' ? 'Pitcher not announced' : 'Insufficient season data'}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Batter stat column (right-aligned cell with projection + line + probability)
// ---------------------------------------------------------------------------
function BatterStatCol({ proj, line, side, overPct, isHr }) {
  const isOver  = side === 'OVER';
  const isUnder = side === 'UNDER';
  const pct     = overPct != null ? (isOver ? overPct : 100 - overPct) : null;
  const pctColor = isOver ? '#2d6a3f' : isUnder ? '#c41230' : t.muted;

  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontFamily: t.mono, fontWeight: 600, fontSize: 13, color: t.fg }}>
        {isHr ? `${Math.round(proj * 100)}%` : proj.toFixed(2)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 3, marginTop: 2 }}>
        <span style={{ fontFamily: t.mono, fontSize: 10, color: t.faint }}>{line}</span>
        <SideTag side={side} />
      </div>
      {pct != null && (
        <div style={{ fontFamily: t.mono, fontSize: 11, fontWeight: 600, color: pctColor, marginTop: 1 }}>
          {pct}%
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Batter row
// ---------------------------------------------------------------------------
function BatterRow({ batter }) {
  const p = batter.projection;
  if (!p) return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 12px', borderBottom: `1px solid ${t.border}`,
      opacity: 0.5,
    }}>
      <span style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, width: 16, textAlign: 'right' }}>
        {batter.batting_order}
      </span>
      <span style={{ fontFamily: t.mono, fontSize: 10, color: t.faint, width: 24 }}>{batter.position}</span>
      <span style={{ fontFamily: t.sans, fontSize: 13, color: t.muted, flex: 1 }}>{batter.name}</span>
      <span style={{ fontFamily: t.mono, fontSize: 10, color: t.faint }}>no data</span>
    </div>
  );

  // Format batting average style (e.g. .287)
  const fmtAvg = v => v ? `.${String(Math.round(v * 1000)).padStart(3, '0')}` : '—';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '20px 28px 1fr 64px 64px 56px 56px',
      alignItems: 'center',
      gap: 8,
      padding: '10px 12px',
      borderBottom: `1px solid ${t.border}`,
    }}>
      {/* Batting order */}
      <span style={{ fontFamily: t.mono, fontSize: 11, color: t.faint, textAlign: 'right' }}>
        {batter.batting_order}
      </span>
      {/* Position */}
      <span style={{ fontFamily: t.mono, fontSize: 10, color: t.muted }}>
        {batter.position}
      </span>
      {/* Name + sabermetric rates */}
      <div>
        <div style={{ fontFamily: t.sans, fontSize: 13, fontWeight: 500, color: t.fg, lineHeight: 1.3 }}>
          {batter.name}
        </div>
        <div style={{ fontFamily: t.mono, fontSize: 10, color: t.faint, display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 1 }}>
          {p.xba   != null && <span>xBA <strong style={{ color: t.muted }}>{fmtAvg(p.xba)}</strong></span>}
          {p.xslg  != null && <span>xSLG <strong style={{ color: t.muted }}>{fmtAvg(p.xslg)}</strong></span>}
          {p.xwoba != null && <span>xwOBA <strong style={{ color: t.muted }}>{p.xwoba.toFixed(3)}</strong></span>}
          {p.bb_pct != null && <span>BB% <strong style={{ color: t.muted }}>{p.bb_pct}%</strong></span>}
          {p.k_pct  != null && <span>K% <strong style={{ color: t.muted }}>{p.k_pct}%</strong></span>}
          {p.xiso  != null && <span>xISO <strong style={{ color: t.muted }}>{fmtAvg(p.xiso)}</strong></span>}
        </div>
      </div>
      {/* Hits */}
      <BatterStatCol
        proj={p.proj_hits} line={p.hits_line} side={p.hits_side}
        overPct={p.hits_over_pct}
      />
      {/* Total Bases */}
      <BatterStatCol
        proj={p.proj_tb} line={p.tb_line} side={p.tb_side}
        overPct={p.tb_over_pct}
      />
      {/* HR */}
      <BatterStatCol
        proj={p.proj_hr} line={0.5} side={p.hr_side}
        overPct={p.hr_over_pct} isHr
      />
      {/* RBI */}
      <BatterStatCol
        proj={p.proj_rbi} line={p.rbi_line} side={p.rbi_side}
        overPct={p.rbi_over_pct}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column headers for batter table
// ---------------------------------------------------------------------------
function BatterTableHeader() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '20px 28px 1fr 64px 64px 56px 56px',
      gap: 8,
      padding: '7px 12px',
      background: t.surface,
      borderBottom: `1px solid ${t.border}`,
    }}>
      {['#', 'Pos', 'Name', 'Hits', 'Tot. Bases', 'HR%', 'RBI'].map(h => (
        <div key={h} style={{
          fontFamily: t.mono, fontSize: 10, color: t.faint,
          textTransform: 'uppercase', letterSpacing: '.06em',
          textAlign: h === 'Name' || h === '#' || h === 'Pos' ? 'left' : 'right',
        }}>{h}</div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single game card
// ---------------------------------------------------------------------------
function GameCard({ game }) {
  const [activeTeam, setActiveTeam] = useState('away');

  const activeBatters = activeTeam === 'away' ? game.away_batters : game.home_batters;
  const activeName    = activeTeam === 'away' ? game.away_name    : game.home_name;
  const hasLineups    = (game.away_batters?.length > 0) || (game.home_batters?.length > 0);

  return (
    <div style={{
      border: `1px solid ${t.border}`,
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      {/* ── Game header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px',
        background: t.fg, color: t.bg,
        flexWrap: 'wrap', gap: 8,
      }}>
        <span style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 17 }}>
          {game.away_name} <span style={{ opacity: .5, fontWeight: 400 }}>@</span> {game.home_name}
        </span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {game.park_factor !== 1.0 && (
            <span style={{ fontFamily: t.mono, fontSize: 10, opacity: .6 }}>
              park ×{game.park_factor.toFixed(2)}
            </span>
          )}
          {game.game_time && (
            <span style={{ fontFamily: t.mono, fontSize: 11, opacity: .55 }}>
              {new Date(game.game_time + 'Z').toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}
            </span>
          )}
        </div>
      </div>

      {/* ── Pitchers ── */}
      <div style={{ padding: '16px 16px 14px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <PitcherCard pitcher={game.away_pitcher} label={`${game.away_name} SP`} />
        <PitcherCard pitcher={game.home_pitcher} label={`${game.home_name} SP`} />
      </div>

      {/* ── Lineups ── */}
      {hasLineups ? (
        <>
          {/* Team selector */}
          <div style={{
            display: 'flex', gap: 0, borderTop: `1px solid ${t.border}`,
            borderBottom: `1px solid ${t.border}`,
          }}>
            {[
              { key: 'away', label: game.away_name },
              { key: 'home', label: game.home_name },
            ].map(({ key, label }) => {
              const active = activeTeam === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTeam(key)}
                  style={{
                    flex: 1, padding: '9px 16px',
                    fontFamily: t.mono, fontSize: 12,
                    background: active ? t.fg   : t.surface,
                    color:      active ? t.bg   : t.muted,
                    border: 'none', cursor: 'pointer',
                    fontWeight: active ? 600 : 400,
                    borderRight: key === 'away' ? `1px solid ${t.border}` : 'none',
                    transition: 'background .15s, color .15s',
                  }}
                >
                  {label} Lineup
                </button>
              );
            })}
          </div>

          <BatterTableHeader />
          {activeBatters.map(b => <BatterRow key={b.id} batter={b} />)}

          {activeBatters.length === 0 && (
            <div style={{ padding: '20px 16px', fontFamily: t.mono, fontSize: 12, color: t.faint, textAlign: 'center' }}>
              {activeName} lineup not yet posted
            </div>
          )}
        </>
      ) : (
        <div style={{
          padding: '16px 20px', borderTop: `1px solid ${t.border}`,
          fontFamily: t.mono, fontSize: 12, color: t.faint,
        }}>
          Lineups not yet posted for this game.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Props() {
  const [data,    setData]    = useState(null);
  const [error,   setError]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProps()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const games    = data?.games ?? [];
  const dateLabel = data?.date
    ? new Date(data.date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : 'Today';

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.fg, fontFamily: t.sans }}>
      <Nav />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 32px 100px' }}>

        {/* Header */}
        <div className="fade-up" style={{
          paddingTop: 72, paddingBottom: 40,
          borderBottom: `1px solid ${t.border}`, marginBottom: 36,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2d6a3f', animation: 'pulse 2s infinite' }} />
            <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '.12em', textTransform: 'uppercase' }}>
              {loading ? 'Loading…' : dateLabel}
            </span>
          </div>
          <h1 style={{ fontFamily: t.serif, fontWeight: 800, fontSize: 'clamp(28px,5vw,52px)', lineHeight: 1.05, letterSpacing: '-.03em', marginBottom: 12 }}>
            Player Projections
          </h1>
          <p style={{ fontSize: 15, color: t.muted, lineHeight: 1.65, maxWidth: 560 }}>
            Model-projected prop lines for every starting player. Batters use Statcast expected stats (xBA, xSLG, xwOBA). Pitchers use FIP and xERA. Pitcher quality adjustments use FIP, not raw ERA. Park-adjusted throughout.
          </p>
        </div>

        {/* Legend */}
        {!loading && (
          <div style={{
            marginBottom: 28, padding: '12px 16px',
            border: `1px solid ${t.border}`, borderRadius: 8,
            background: t.surface, fontFamily: t.mono, fontSize: 11, color: t.muted,
            display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center',
          }}>
            <span style={{ color: t.faint, fontWeight: 600 }}>How to read:</span>
            <span><strong style={{ color: t.fg }}>↑ OVER</strong> / <strong style={{ color: t.fg }}>↓ UNDER</strong> = projection vs line</span>
            <span>Hits &amp; TB use <strong style={{ color: t.fg }}>xBA / xSLG</strong> (Statcast expected)</span>
            <span>Pitcher ER uses <strong style={{ color: t.fg }}>xERA</strong>; Ks use <strong style={{ color: t.fg }}>K%</strong></span>
            <span>Pitcher quality adjustment via <strong style={{ color: t.fg }}>FIP</strong></span>
            <span>HR% = projected chance of any HR</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            border: `1px solid #e8c0c0`, borderRadius: 6, padding: '14px 18px',
            color: '#c41230', fontFamily: t.mono, fontSize: 13,
            marginBottom: 24, background: '#fff5f5',
          }}>
            Could not reach the props API. Run <code>player_props.py</code> to generate data.
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ border: `1px solid ${t.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ height: 48, background: t.fg, opacity: .08 }} />
                <div style={{ padding: 16, display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, height: 100, background: t.surface, borderRadius: 8 }} />
                  <div style={{ flex: 1, height: 100, background: t.surface, borderRadius: 8 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Game cards */}
        {!loading && !error && games.length === 0 && (
          <div style={{
            padding: 40, textAlign: 'center',
            fontFamily: t.mono, fontSize: 13, color: t.muted,
            border: `1px solid ${t.border}`, borderRadius: 10,
          }}>
            No props data available for today.
          </div>
        )}

        {!loading && !error && games.map(game => (
          <GameCard key={game.gamePk} game={game} />
        ))}

        {/* Footer */}
        <div style={{
          marginTop: 80, paddingTop: 24,
          borderTop: `1px solid ${t.border}`,
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
          <span style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 15 }}>Game 163</span>
          <div style={{ fontSize: 12, fontFamily: t.mono, color: t.faint }}>
            Projections only · Not betting advice · © 2026 Game 163
          </div>
        </div>
      </div>
    </div>
  );
}
