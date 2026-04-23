import { t } from '../theme.js';

const shimmer = {
  background: `linear-gradient(90deg, ${t.surface} 25%, #eeecea 50%, ${t.surface} 75%)`,
  backgroundSize: '400px 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: 4,
};

export function Skeleton({ width = '100%', height = 14, style = {} }) {
  return <div style={{ ...shimmer, width, height, ...style }} />;
}

export function StatCardSkeleton() {
  return (
    <div style={{
      border: `1px solid ${t.border}`, borderRadius: 8,
      padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <Skeleton width="55%" height={12} />
      <Skeleton width="70%" height={36} />
      <Skeleton width="45%" height={11} />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr style={{ borderBottom: `1px solid ${t.border}` }}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '16px 12px' }}>
          <Skeleton width={`${50 + (i * 11) % 40}%`} height={13} />
        </td>
      ))}
    </tr>
  );
}

export function PredictionCardSkeleton() {
  return (
    <div style={{
      border: `1px solid ${t.border}`, borderRadius: 8,
      padding: 20, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <Skeleton width="65%" height={12} />
      <Skeleton width="80%" height={20} />
      <Skeleton width="40%" height={8} />
    </div>
  );
}
