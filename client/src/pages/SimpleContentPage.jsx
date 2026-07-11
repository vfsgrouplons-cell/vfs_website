import { Link } from 'react-router-dom';

export function SimpleContentPage({ eyebrow, title, copy }) {
  return <section className="page-hero"><div className="shell narrow"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p><div className="button-row"><Link className="button button-gold" to="/contact">Talk to our team</Link><Link className="button button-outline" to="/services">Explore services</Link></div></div></section>;
}
