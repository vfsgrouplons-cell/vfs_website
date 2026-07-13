import { CheckCircle2, ShieldCheck, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const missionPoints = [
  'Provide fast, reliable, and hassle-free financial solutions',
  'Deliver loan, insurance, investment, and wealth-management services',
  'Offer attractive cashback benefits on eligible services',
  'Build long-term relationships through trust and transparency',
  'Empower customers through expert guidance and digital services',
  'Create a nationwide network of trained financial advisors and connectors',
];

const values = ['Integrity', 'Customer First', 'Transparency', 'Innovation', 'Speed', 'Professionalism', 'Trust', 'Compliance', 'Excellence'];
const trends = ['Digital loan processing', 'Paperless documentation', 'Online customer support', 'AI-assisted loan eligibility guidance', 'Personalized financial planning', 'Investment diversification', 'End-to-end wealth management', 'Fast digital approvals', 'Secure customer data handling', 'Cashback and reward-based financial services'];

export function AboutPage() {
  return <>
    <section className="page-hero about-hero"><div className="shell"><span className="eyebrow"><Sparkles size={16}/> About VFS Group</span><h1>Your trusted partner for financial growth.</h1><p>VFS Group brings loans, insurance, investments, and wealth guidance together in one customer-focused financial service experience.</p><div className="button-row"><Link className="button button-gold" to="/services">Explore our services</Link><Link className="button button-outline" to="/contact">Talk to our team</Link></div></div></section>

    <section className="section"><div className="shell purpose-grid">
      <article className="purpose-card vision-card"><div className="purpose-icon"><TrendingUp/></div><span className="eyebrow">Our vision</span><h2>Financial progress built on trust.</h2><p>To become one of India&apos;s most trusted and customer-focused financial service organizations by providing innovative, transparent, and technology-driven financial solutions that help individuals, families, entrepreneurs, and businesses achieve their financial goals.</p></article>
      <article className="purpose-card"><div className="purpose-icon"><Users/></div><span className="eyebrow">Our mission</span><h2>Make financial services easier to access.</h2><ul>{missionPoints.map((point)=><li key={point}><CheckCircle2/>{point}</li>)}</ul></article>
    </div></section>

    <section className="section values-section"><div className="shell"><div className="section-heading compact"><div><span className="eyebrow">Our core values</span><h2>The principles behind every customer relationship.</h2></div><ShieldCheck className="section-mark"/></div><div className="value-grid">{values.map((value,index)=><article key={value}><span>{String(index+1).padStart(2,'0')}</span><strong>{value}</strong></article>)}</div></div></section>

    <section className="section trends-section"><div className="shell trends-layout"><div><span className="eyebrow">Modern financial services</span><h2>Technology that keeps the journey moving.</h2><p>VFS Group embraces modern financial practices to improve access, speed, support, planning, and secure handling throughout the customer journey.</p><Link className="button button-gold" to="/apply">Start your application</Link></div><div className="trend-grid">{trends.map((trend)=><div key={trend}><CheckCircle2/><span>{trend}</span></div>)}</div></div></section>

    <section className="final-cta"><div className="shell"><div><span className="eyebrow">Your financial growth, our commitment</span><h2>One stop for loans, insurance, and investments.</h2></div><div className="button-row"><Link className="button button-gold" to="/services">View services</Link><Link className="button button-light" to="/contact">Request a callback</Link></div></div></section>
  </>;
}
