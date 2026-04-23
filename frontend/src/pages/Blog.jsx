import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import { getAllPosts } from '../lib/posts.js';
import { t } from '../theme.js';

function formatDate(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Blog() {
  const posts = getAllPosts();

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.fg, fontFamily: t.sans }}>
      <Nav />
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 40px 100px' }}>

        {/* Header */}
        <div className="fade-up" style={{ paddingTop: 72, paddingBottom: 48, borderBottom: `1px solid ${t.border}` }}>
          <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Blog
          </div>
          <h1 style={{ fontFamily: t.serif, fontWeight: 800, fontSize: 'clamp(36px,5vw,56px)', letterSpacing: '-.03em', lineHeight: 1.05, marginBottom: 12 }}>
            Notes on the model.
          </h1>
          <p style={{ fontSize: 16, color: t.muted, maxWidth: 480, lineHeight: 1.65 }}>
            How it works, what we've learned, and why the numbers are what they are.
          </p>
        </div>

        {/* Post list */}
        <div>
          {posts.map((post, i) => (
            <Link key={post.slug} to={`/blog/${post.slug}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '160px 1fr',
                gap: 32, padding: '36px 0',
                borderBottom: `1px solid ${t.border}`,
                transition: 'opacity .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = '.7'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <div style={{ fontFamily: t.mono, fontSize: 12, color: t.muted, paddingTop: 4 }}>
                  {formatDate(post.date)}
                </div>
                <div>
                  <h2 style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 22, letterSpacing: '-.02em', marginBottom: 8, color: t.fg }}>
                    {post.title}
                  </h2>
                  <p style={{ fontSize: 15, color: t.muted, lineHeight: 1.6, maxWidth: 520 }}>
                    {post.description}
                  </p>
                  <div style={{ marginTop: 12, fontFamily: t.mono, fontSize: 12, color: t.fg, borderBottom: `1px solid ${t.border}`, display: 'inline-block' }}>
                    Read more →
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {posts.length === 0 && (
            <div style={{ padding: '48px 0', color: t.muted, fontFamily: t.mono, fontSize: 13 }}>
              No posts yet.
            </div>
          )}
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
