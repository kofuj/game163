import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Nav from '../components/Nav.jsx';
import { getPost } from '../lib/posts.js';
import { t } from '../theme.js';

function formatDate(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const mdComponents = {
  h2: ({ children }) => (
    <h2 style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 24, letterSpacing: '-.02em', margin: '40px 0 14px', color: t.fg }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontFamily: t.serif, fontWeight: 700, fontSize: 20, margin: '28px 0 10px', color: t.fg }}>
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p style={{ fontSize: 17, lineHeight: 1.75, color: '#333333', margin: '0 0 20px', fontFamily: t.sans }}>
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong style={{ fontWeight: 600, color: t.fg }}>{children}</strong>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: '0 0 20px 20px', padding: 0, listStyleType: 'disc' }}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: '0 0 20px 20px', padding: 0 }}>{children}</ol>
  ),
  li: ({ children }) => (
    <li style={{ fontSize: 17, lineHeight: 1.75, color: '#333333', marginBottom: 6, fontFamily: t.sans }}>{children}</li>
  ),
  a: ({ href, children }) => (
    <a href={href} style={{ color: t.fg, borderBottom: `1px solid ${t.border}`, textDecoration: 'none' }}>{children}</a>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{
      borderLeft: `3px solid ${t.fg}`, paddingLeft: 20, margin: '24px 0',
      color: t.muted, fontStyle: 'italic',
    }}>{children}</blockquote>
  ),
  code: ({ inline, children }) => inline
    ? <code style={{ fontFamily: t.mono, fontSize: 14, background: t.surface, padding: '2px 6px', borderRadius: 3 }}>{children}</code>
    : <pre style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 6, padding: '16px 20px', overflowX: 'auto', margin: '20px 0' }}>
        <code style={{ fontFamily: t.mono, fontSize: 13 }}>{children}</code>
      </pre>,
  hr: () => <hr style={{ border: 'none', borderTop: `1px solid ${t.border}`, margin: '36px 0' }} />,
};

export default function BlogPost() {
  const { slug } = useParams();
  const post = getPost(slug);

  if (!post) {
    return (
      <div style={{ minHeight: '100vh', background: t.bg, color: t.fg, fontFamily: t.sans }}>
        <Nav />
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 40px', textAlign: 'center' }}>
          <div style={{ fontFamily: t.mono, fontSize: 13, color: t.muted }}>Post not found.</div>
          <Link to="/blog" style={{ display: 'inline-block', marginTop: 16, fontFamily: t.mono, fontSize: 13, color: t.fg, borderBottom: `1px solid ${t.border}` }}>
            ← Back to blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.fg, fontFamily: t.sans }}>
      <Nav />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 40px 100px' }}>

        {/* Back link */}
        <div style={{ paddingTop: 48, marginBottom: 48 }}>
          <Link to="/blog" style={{ fontFamily: t.mono, fontSize: 12, color: t.muted, borderBottom: `1px solid ${t.border}`, textDecoration: 'none' }}>
            ← All posts
          </Link>
        </div>

        {/* Header */}
        <div className="fade-up" style={{ paddingBottom: 40, borderBottom: `1px solid ${t.border}`, marginBottom: 48 }}>
          <div style={{ fontFamily: t.mono, fontSize: 12, color: t.muted, marginBottom: 16 }}>
            {formatDate(post.date)}
          </div>
          <h1 style={{
            fontFamily: t.serif, fontWeight: 800,
            fontSize: 'clamp(28px,5vw,44px)', letterSpacing: '-.03em', lineHeight: 1.1,
            marginBottom: 16, color: t.fg,
          }}>
            {post.title}
          </h1>
          <p style={{ fontSize: 18, color: t.muted, lineHeight: 1.6, fontFamily: t.sans }}>
            {post.description}
          </p>
        </div>

        {/* Body */}
        <div>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {post.content}
          </ReactMarkdown>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 64, paddingTop: 24, borderTop: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Link to="/blog" style={{ fontFamily: t.mono, fontSize: 12, color: t.fg, borderBottom: `1px solid ${t.border}`, textDecoration: 'none' }}>
            ← All posts
          </Link>
          <div style={{ fontSize: 12, fontFamily: t.mono, color: t.faint }}>
            © 2026 Game 163
          </div>
        </div>
      </div>
    </div>
  );
}
