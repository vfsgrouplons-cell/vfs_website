import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BadgeCheck, Calculator, FileCheck2, Headphones, Landmark, LockKeyhole, Quote, ShieldCheck, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo.jsx';
import { organizationSchema } from '../config/seo.js';
import { useSiteSettings } from '../services/content.js';
import { api } from '../services/api.js';

const benefits = [
  [Landmark, 'One-stop financial solutions', 'Explore loans, insurance, investments, and wealth services in one place.'],
  [Users, 'Inclusive loan assistance', 'Support for salaried and self-employed customers, with or without ITRs—even with a low CIBIL score.'],
  [FileCheck2, 'Quick, paperless support', 'Move forward with minimum-documentation guidance and digital processing assistance.'],
  [Headphones, 'Expert financial guidance', 'Get customer-focused support while understanding the available route and next steps.'],
];
const steps = ['Choose a financial service', 'Share your requirement', 'Provide available documents', 'Receive expert guidance', 'Coordinate with a relevant provider', 'Track application progress'];

export function HomePage() {
  const services = useQuery({ queryKey: ['services'], queryFn: async () => (await api.get('/services')).data.data });
  const testimonials = useQuery({ queryKey: ['content', 'testimonials'], queryFn: async () => (await api.get('/content/testimonials')).data.data });
  const settings = useSiteSettings();
  return <>
    <Seo title="VFS Groups | Loans, Insurance and Investment Assistance" description="VFS Groups helps salaried and self-employed customers explore loans, insurance, investments, and wealth services with transparent guidance." path="/" structuredData={organizationSchema(settings.data)}/>
    <section className="hero"><div className="hero-media" aria-hidden="true"><video autoPlay muted loop playsInline preload="metadata"><source src="https://videos.pexels.com/video-files/7688134/7688134-uhd_2160_3840_30fps.mp4" type="video/mp4" /></video></div><div className="shell hero-grid"><div className="hero-copy"><span className="eyebrow"><Sparkles size={16} /> Your trusted financial partner</span><h1>Smart finance for a <em>better future.</em></h1><p>One trusted destination for loans, insurance, investments, and wealth guidance—built for salaried and self-employed customers.</p><div className="button-row"><Link className="button button-gold" to="/services">Explore financial solutions <ArrowRight size={18} /></Link><Link className="button button-outline" to="/apply">Start an application</Link></div><Link className="inline-link" to="/contact">Have no ITR or a low CIBIL score? Talk to us <ArrowRight size={16} /></Link><ul className="hero-points"><li><BadgeCheck /> Clear guidance</li><li><FileCheck2 /> Digital process</li><li><ShieldCheck /> Secure support</li></ul></div></div></section>
    <HomeServiceMarquee services={services.data || []}/>
    <section className="trust-strip"><div className="shell trust-grid">{[[BadgeCheck,'Quick processing'],[FileCheck2,'Minimum documentation'],[Users,'Expert guidance'],[LockKeyhole,'Secure handling']].map(([Icon,label])=><div key={label}><Icon /><span>{label}</span></div>)}</div></section>
    <section className="section"><div className="shell"><div className="section-heading"><div><span className="eyebrow">Explore solutions</span><h2>Start with what you want to achieve.</h2></div><Link className="inline-link" to="/services">View all services <ArrowRight size={16} /></Link></div>{services.isLoading && <div className="card-grid" aria-label="Loading services">{Array.from({length:6},(_,index)=><div className="service-card skeleton" key={index} />)}</div>}{services.isError && <div className="notice error">Published services could not be loaded. Confirm that the API is running and reference data has been seeded.</div>}{services.data && <div className="card-grid">{services.data.slice(0,8).map((service)=><ServiceCard service={service} key={service._id} />)}</div>}</div></section>
    <section className="section finder-section"><div className="shell finder-grid"><div><span className="eyebrow">Everything in one place</span><h2>Start with the financial goal that matters to you.</h2><p>Choose a requirement and explore the relevant published service. Our team can guide the next step without treating missing ITRs or a low CIBIL score as a reason not to speak with us.</p><Link className="button button-gold" to="/services">Find a relevant service <ArrowRight size={18} /></Link></div><div className="finder-options">{[['Personal funding','personal'],['Business growth','business'],['Buy a home','home'],['Finance a vehicle','vehicle'],['Education finance','education'],['Protect what matters','insurance'],['Build investments','investment'],['Manage business cash flow','working capital']].map(([label,q])=><Link to={`/services?q=${encodeURIComponent(q)}`} key={label}>{label}<ArrowRight size={16}/></Link>)}</div></div></section>
    <section className="section"><div className="shell"><div className="section-heading compact"><div><span className="eyebrow">Why VFS Groups</span><h2>Practical support, designed around the journey.</h2></div></div><div className="benefit-grid">{benefits.map(([Icon,title,copy])=><article key={title}><Icon/><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>
    <section className="section process-section"><div className="shell"><div className="section-heading"><div><span className="eyebrow">How it works</span><h2>Six clear steps from requirement to progress.</h2></div></div><ol className="steps">{steps.map((step,index)=><li key={step}><span>{String(index+1).padStart(2,'0')}</span><strong>{step}</strong></li>)}</ol><p className="disclaimer">VFS Groups accepts requests from salaried and self-employed customers with or without ITRs, including low-CIBIL profiles. Final eligibility, approval, rates, terms, cover, returns, and service outcomes remain subject to the relevant provider and applicable product terms.</p></div></section>
    {testimonials.data?.length>0&&<section className="section testimonial-section"><div className="shell"><div className="section-heading compact"><div><span className="eyebrow">Verified customer voices</span><h2>Published only with confirmed consent.</h2></div></div><div className="testimonial-grid">{testimonials.data.map((item)=><blockquote key={item._id}><Quote/><p>“{item.quote}”</p><footer><strong>{item.customerName}</strong><span>{item.customerLabel||item.serviceName}</span></footer></blockquote>)}</div></div></section>}
    <section className="section tools-section"><div className="shell tools-grid"><Link to="/emi-calculator" className="tool-card"><Calculator/><span>Planning tool</span><h2>Estimate an illustrative EMI</h2><p>Explore monthly repayment, total interest, and total estimated repayment.</p><b>Open calculator <ArrowRight size={17}/></b></Link><Link to="/track" className="tool-card dark"><TrendingUp/><span>Secure tracking</span><h2>Check application progress</h2><p>Personal application information requires OTP verification against the registered mobile.</p><b>Track application <ArrowRight size={17}/></b></Link></div></section>
    <section className="final-cta"><div className="shell"><div><span className="eyebrow">Your financial growth, our commitment</span><h2>Need help choosing the right financial solution?</h2></div><div className="button-row"><Link className="button button-gold" to="/contact">Request a callback</Link><Link className="button button-light" to="/services">View all services</Link></div></div></section>
  </>;
}

function ServiceCard({ service }) {
  const icons = { Loans: Landmark, Insurance: ShieldCheck, 'Wealth & Investments': TrendingUp }; const Icon = icons[service.category] || Landmark;
  return <article className="service-card"><div className="service-icon"><Icon /></div><span>{service.category}</span><h3>{service.name}</h3><p>{service.shortDescription}</p><div><Link to={`/services/${service.slug}`}>Learn more <ArrowRight size={16}/></Link><Link to={`/apply?service=${service.slug}`}>Apply</Link></div></article>;
}

function HomeServiceMarquee({ services }) {
  if (!services.length) return null;
  return <section className="home-marquee" aria-label="Explore published VFS Groups services"><div className="home-marquee-label"><Sparkles/><span>Explore</span></div><div className="home-marquee-viewport"><div className="home-marquee-track"><MarqueeGroup services={services}/><MarqueeGroup services={services} duplicate/></div></div></section>;
}

function MarqueeGroup({ services, duplicate = false }) {
  const icons = { Loans: Landmark, Insurance: ShieldCheck, 'Wealth & Investments': TrendingUp };
  return <div className={`home-marquee-group ${duplicate ? 'duplicate' : ''}`} aria-hidden={duplicate || undefined}>{services.map((service) => { const Icon = icons[service.category] || Sparkles; const content = <><Icon/><span><strong>{service.name}</strong><small>{service.category}</small></span><i>•</i></>; return duplicate ? <span className="home-marquee-item" key={service._id}>{content}</span> : <Link className="home-marquee-item" to={`/services/${service.slug}`} key={service._id}>{content}</Link>; })}</div>;
}
