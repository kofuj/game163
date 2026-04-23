const modules = import.meta.glob('../posts/*.md', { query: '?raw', import: 'default', eager: true });

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: raw };
  const meta = {};
  match[1].split('\n').forEach(line => {
    const colon = line.indexOf(':');
    if (colon === -1) return;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    meta[key] = val;
  });
  return { meta, content: match[2].trim() };
}

export function getAllPosts() {
  return Object.entries(modules)
    .map(([path, raw]) => {
      const { meta, content } = parseFrontmatter(raw);
      return {
        slug:        meta.slug || path.split('/').pop().replace('.md', ''),
        title:       meta.title || 'Untitled',
        date:        meta.date || '',
        description: meta.description || '',
        content,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug) {
  return getAllPosts().find(p => p.slug === slug) || null;
}
