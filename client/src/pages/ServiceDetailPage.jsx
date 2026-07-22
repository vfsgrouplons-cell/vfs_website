import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, FileText, PhoneCall } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Seo } from '../components/Seo.jsx';
import { api, apiMessage } from '../services/api.js';
import { trackEvent } from '../services/analytics.js';
import { mobileErrorMessage, mobilePattern, sanitizeMobile } from '../utils/validation.js';

const serviceImages = {
  Loans: '/services/loans.webp',
  Insurance: '/services/insurance.webp',
  'Wealth & Investments': '/services/investments.webp',
};

export function ServiceDetailPage() {
  const { slug } = useParams();
  const service = useQuery({ queryKey: ['service', slug], queryFn: async () => (await api.get(`/services/${slug}`)).data.data });
  if (service.isLoading) return <div className="shell route-loading">Loading service information…</div>;
  if (service.isError) return <div className="shell route-loading"><h1>Service unavailable</h1><Link to="/services">Return to services</Link></div>;
  const item = service.data;
  const isLoan = item.category === 'Loans';
  return <>
    <Seo title={item.seo?.title || `${item.name} | VFS Groups`} description={item.seo?.description || item.shortDescription} path={`/services/${item.slug}`} structuredData={{ '@context': 'https://schema.org', '@type': 'Service', name: item.name, description: item.overview, provider: { '@type': 'Organization', name: 'VFS Groups' }, areaServed: 'Karnataka, India', serviceType: item.category }}/>
    <section className="service-hero service-detail-hero">
      <div className="shell">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/services">Services</Link><span>/</span><b>{item.name}</b></nav>
        <div className="service-hero-image"><img src={serviceImages[item.category] || serviceImages.Loans} alt={`${item.name} guidance from VFS Groups`}/></div>
        <div className="service-hero-intro">
          <div><span className="eyebrow">{item.category}</span><h1>{item.name}</h1><p>{item.overview}</p><ul className="service-reassurance"><li><CheckCircle2/> Salaried and self-employed customers can enquire</li>{isLoan && <li><CheckCircle2/> With or without ITRs, including low-CIBIL profiles</li>}<li><CheckCircle2/> Clear guidance before the next step</li></ul></div>
          <QuickServiceEnquiry service={item}/>
        </div>
      </div>
    </section>
    <section className="section service-simple-section">
      <div className="shell">
        <div className="service-facts">
          <SimpleList title="What this service can help with" items={item.useCases}/>
          <SimpleList title="What you may need" items={item.documents} icon={FileText}/>
          <section><span className="eyebrow">Simple process</span><h2>What happens next</h2><ol>{item.process.slice(0, 4).map((value, index) => <li key={value}><b>{index + 1}</b><span>{value}</span></li>)}</ol></section>
        </div>
        <p className="disclaimer service-disclaimer">VFS Groups provides assistance and guidance. Eligibility, approval, interest rates, premiums, returns and final terms are decided by the relevant bank, NBFC, insurer or product provider.</p>
        <Link className="inline-link" to="/services">Explore another service <ArrowRight/></Link>
      </div>
    </section>
  </>;
}

function QuickServiceEnquiry({ service }) {
  const [values, setValues] = useState({ name: '', mobile: '', website: '' });
  const [errors, setErrors] = useState({});
  const enquiry = useMutation({
    mutationFn: async (input) => (await api.post('/contact/callbacks', input)).data.data,
    onSuccess: () => { setValues({ name: '', mobile: '', website: '' }); setErrors({}); trackEvent('service_callback_requested', { service: service.slug }); },
  });
  function update(event) {
    const value = event.target.name === 'mobile' ? sanitizeMobile(event.target.value) : event.target.value;
    setValues((current) => ({ ...current, [event.target.name]: value }));
    setErrors((current) => ({ ...current, [event.target.name]: '' }));
    enquiry.reset();
  }
  function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (values.name.trim().length < 2) nextErrors.name = 'Enter your name';
    if (!mobilePattern.test(values.mobile)) nextErrors.mobile = mobileErrorMessage;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    enquiry.mutate({ name: values.name.trim(), mobile: values.mobile, service: service._id, consent: true, website: values.website });
  }
  return <form className="quick-service-form" onSubmit={submit} noValidate>
    <div><PhoneCall/><span><strong>Interested in {service.name}?</strong><small>Share two details. Our team will call you.</small></span></div>
    <label>Full name<input name="name" value={values.name} onChange={update} autoComplete="name" aria-invalid={Boolean(errors.name)}/>{errors.name && <small className="field-error">{errors.name}</small>}</label>
    <label>Mobile number<input name="mobile" type="tel" inputMode="tel" value={values.mobile} onChange={update} autoComplete="tel" aria-invalid={Boolean(errors.mobile)}/>{errors.mobile && <small className="field-error">{errors.mobile}</small>}</label>
    <input className="honeypot" name="website" value={values.website} onChange={update} tabIndex="-1" autoComplete="off"/>
    <button className="button button-gold" disabled={enquiry.isPending}>{enquiry.isPending ? 'Sending…' : 'Ask VFS Groups to call me'} <ArrowRight/></button>
    <p>By requesting a call, you consent to VFS Groups using these details to respond about this service.</p>
    {enquiry.isError && <p className="form-error" role="alert">{apiMessage(enquiry.error)}</p>}
    {enquiry.isSuccess && <p className="form-success" role="status">Request received. Our team will call you on the number provided.</p>}
  </form>;
}

function SimpleList({ title, items = [], icon: Icon = CheckCircle2 }) {
  return <section><span className="eyebrow">Service guide</span><h2>{title}</h2><ul>{items.slice(0, 5).map((value) => <li key={value}><Icon/><span>{value}</span></li>)}</ul></section>;
}
