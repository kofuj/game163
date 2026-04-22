const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const fetchPerformance  = ()     => get('/api/performance');
export const fetchPredictions  = (date) => get(date ? `/api/predictions/${date}` : '/api/predictions');
export const fetchRecord       = (n=20) => get(`/api/record?limit=${n}`);
export const settleRecord      = ()     => fetch(`${BASE}/api/record/settle`, { method: 'POST' }).then(r => r.json());
