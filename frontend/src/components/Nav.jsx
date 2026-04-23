import { Link, useLocation } from 'react-router-dom';
import { t } from '../theme.js';

const links = [
  { label: 'Home',        to: '/'            },
  { label: 'Predictions', to: '/predictions' },
  { label: 'History',     to: '/history'     },
  { label: 'Performance', to: '/performance' },
];

export default function Nav() {
  const { pathname } = useLocation();
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,800;1,400&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${t.bg}; color: ${t.fg}; }
        a { text-decoration: none; color: inherit; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse  { 0%,100% { opacity:.5; } 50% { opacity:1; } }
        @keyframes shimmer { 0% { background-position:-400px 0; } 100% { background-position:400px 0; } }
        .fade-up { animation: fadeUp .5s ease both; }
        .nav-link { transition: color .15s; color: ${t.muted}; }
        .nav-link:hover { color: ${t.fg} !important; }
        .nav-link.active { color: ${t.fg} !important; font-weight: 500; }
        .row-hover:hover { background: ${t.surface} !important; }
        .card-hover { transition: border-color .2s; }
        .card-hover:hover { border-color: #c0c0c0 !important; }
        .cta-btn { transition: background .15s, color .15s; }
        .cta-btn:hover { background: ${t.fg} !important; color: ${t.bg} !important; }
      `}</style>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        borderBottom: `1px solid ${t.border}`,
        background: t.bg,
        padding: '0 40px',
      }}>
        <div style={{
          maxWidth: 1120, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56,
        }}>
          {/* Left: brand + nav links with pipe separators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, fontSize: 14 }}>
            <Link to="/" style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 15, color: t.fg, marginRight: 24 }}>
              Game 163
            </Link>
            {links.map((l, i) => (
              <span key={l.to} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && <span style={{ color: t.border, margin: '0 12px', userSelect: 'none' }}>|</span>}
                <Link
                  to={l.to}
                  className={`nav-link${pathname === l.to ? ' active' : ''}`}
                  style={{ fontSize: 14, fontFamily: t.sans }}
                >
                  {l.label}
                </Link>
              </span>
            ))}
          </div>

          {/* Right: CTA */}
          <Link to="/predictions">
            <button className="cta-btn" style={{
              background: 'transparent', color: t.fg,
              border: `1px solid ${t.fg}`, borderRadius: 4,
              padding: '7px 16px', fontSize: 13, fontFamily: t.sans,
              cursor: 'pointer', letterSpacing: '.01em',
            }}>
              Today's Picks
            </button>
          </Link>
        </div>
      </nav>
    </>
  );
}
