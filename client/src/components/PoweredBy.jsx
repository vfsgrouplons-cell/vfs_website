export function PoweredBy({ compact = false }) {
  return <a className={`powered-by ${compact ? 'powered-by-compact' : ''}`} href="https://mernpixel.com" target="_blank" rel="noreferrer" aria-label="Visit MERNpixel website">
    <span>Powered by</span>
    <img src="/mern-pixel-logo.png" alt="MERN Pixel" loading="lazy" />
  </a>;
}
