import { Menu, MessageCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { createWhatsAppUrl } from '../config/contact.js';
import { trackEvent } from '../services/analytics.js';
import { useSiteSettings } from '../services/content.js';
import { ChatWidget } from './ChatWidget.jsx';

const links = [['/', 'Home'], ['/about', 'About'], ['/services', 'Services'], ['/partner', 'Partner With Us'], ['/gallery', 'Gallery'], ['/contact', 'Contact']];

export function SiteLayout() {
  const [open, setOpen] = useState(false); const location = useLocation();
  const settings = useSiteSettings(); const phone = settings.data?.contact?.phone || '919160353295'; const whatsapp = settings.data?.contact?.whatsapp || phone;
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => { trackEvent('page_view', {}, location.pathname); }, [location.pathname]);
  return <div className="min-h-screen bg-canvas text-ink">
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <header className="site-header">
      <div className="shell header-inner">
        <Link to="/" className="brand" aria-label="VFS Groups home"><img src="/brand/vfs-groups-logo.png" alt="VFS Groups" /><span>VFS Groups<small>Your financial growth</small></span></Link>
        <nav className="desktop-nav" aria-label="Primary navigation">{links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}</nav>
        <div className="header-actions"><Link className="text-action" to="/track">Track application</Link><Link className="button button-dark" to="/sign-in">Sign in</Link><Link className="button button-gold" to="/apply">Apply now</Link></div>
        <button className="menu-button" type="button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open?'Close navigation':'Open navigation'} onClick={() => setOpen((value) => !value)}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">{links.map(([to, label]) => <NavLink key={to} to={to} onClick={() => setOpen(false)}>{label}</NavLink>)}<Link to="/track" onClick={() => setOpen(false)}>Track application</Link><Link className="button button-dark" to="/sign-in" onClick={() => setOpen(false)}>Sign in</Link><Link className="button button-gold" to="/apply" onClick={() => setOpen(false)}>Apply now</Link></nav>}
    </header>
    <main id="main-content" key={location.pathname}><Outlet /></main>
    <a className="whatsapp-fab" href={createWhatsAppUrl('Hello VFS Groups, I would like assistance choosing a financial service.', whatsapp)} target="_blank" rel="noreferrer" aria-label="Contact VFS Groups on WhatsApp"><MessageCircle /></a>
    <ChatWidget phone={phone} whatsapp={whatsapp} />
    <footer className="site-footer"><div className="shell footer-grid"><div><Link to="/" className="brand footer-brand"><img src="/brand/vfs-groups-logo.png" alt="" /><span>VFS Groups<small>Your financial growth, our commitment</small></span></Link><p>One destination for loan assistance, insurance guidance, investments, and wealth services.</p><p className="footer-disclosure">{settings.data?.legal?.providerRelationship}</p></div><div><h2>Explore</h2><Link to="/services">Services</Link><Link to="/emi-calculator">EMI calculator</Link><Link to="/track">Track application</Link><Link to="/partner">Partner program</Link><Link to="/faqs">FAQs</Link></div><div><h2>Company</h2><Link to="/about">About</Link><Link to="/gallery">Gallery</Link><Link to="/contact">Contact</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/disclaimer">Disclaimer</Link></div></div><div className="shell footer-bottom"><p>© {new Date().getFullYear()} VFS Groups. All rights reserved.</p><p>{settings.data?.cashback?.enabled ? settings.data.cashback.terms : 'No general cashback entitlement is currently published. Provider terms and approval policies apply.'}</p></div></footer>
  </div>;
}
