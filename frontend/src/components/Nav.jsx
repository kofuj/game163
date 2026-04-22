import { Link, useLocation } from 'react-router-dom';
import { t } from '../theme.js';

const links = [
  { label: 'Home',        to: '/'            },
  { label: 'Predictions', to: '/predictions' },
  { label: 'Performance', to: '/performance' },
];

export default function Nav() {
  const { pathname } = useLocation();
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;800&family=DM+Mono:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${t.dark}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${t.dark}; }
        ::-webkit-scrollbar-thumb { background: ${t.green}; border-radius: 99px; }
        a { text-decoration: none; color: inherit; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse  { 0%,100% { opacity:.6; } 50% { opacity:1; } }
        @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        .fade-up { animation: fadeUp .55s ease both; }
        .nav-link { transition: color .15s; }
        .nav-link:hover { color: ${t.cream} !important; }
        .card-hover { transition: border-color .2s, background .2s; }
        .card-hover:hover { border-color: rgba(212,168,67,.35) !important; background: rgba(212,168,67,.05) !important; }
        .row-hover:hover { background: rgba(255,255,255,.04) !important; }
      `}</style>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        borderBottom: `1px solid rgba(255,255,255,.06)`,
        background: 'rgba(13,31,19,.94)', backdropFilter: 'blur(14px)',
        padding: '0 32px',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56,
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `linear-gradient(135deg, ${t.green}, ${t.gold})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>⚾</div>
            <span style={{ fontFamily: t.serif, fontWeight: 800, fontSize: 18, letterSpacing: '-.02em', color: t.cream }}>
              Game 163
            </span>
          </Link>
          <div style={{ display: 'flex', gap: 28, fontSize: 13, fontFamily: t.mono }}>
            {links.map(l => (
              <Link key={l.to} to={l.to} className="nav-link" style={{
                color: pathname === l.to ? t.gold : 'rgba(245,240,232,.5)',
                fontWeight: pathname === l.to ? 700 : 400,
              }}>{l.label}</Link>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}
