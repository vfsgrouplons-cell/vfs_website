export function PoweredBy({ compact = false }) {
  return <div className={`powered-by ${compact ? 'powered-by-compact' : ''}`}>
    <span>Powered by</span>
    <img src="/mern-pixel-logo.png" alt="MERN Pixel" loading="lazy" />
  </div>;
}
