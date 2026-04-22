const shimmer = {
  background: 'linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.09) 50%, rgba(255,255,255,.04) 75%)',
  backgroundSize: '400px 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: 8,
};

export function Skeleton({ width = '100%', height = 20, style = {} }) {
  return <div style={{ ...shimmer, width, height, ...style }} />;
}

export function StatCardSkeleton() {
  return (
    <div style={{
      background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)',
      borderRadius: 12, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <Skeleton width="60%" height={12} />
      <Skeleton width="80%" height={40} />
      <Skeleton width="50%" height={12} />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '12px 0' }}>
          <Skeleton width={`${60 + (i * 10) % 30}%`} height={14} />
        </td>
      ))}
    </tr>
  );
}

export function PredictionCardSkeleton() {
  return (
    <div style={{
      background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)',
      borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <Skeleton width="70%" height={14} />
      <Skeleton width="50%" height={32} />
      <Skeleton width="40%" height={12} />
    </div>
  );
}
