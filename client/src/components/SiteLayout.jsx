import { Menu, MessageCircle, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChatWidget } from './ChatWidget.jsx';

const links = [['/', 'Home'], ['/about', 'About'], ['/services', 'Services'], ['/partner', 'Partner With Us'], ['/gallery', 'Gallery'], ['/contact', 'Contact']];

export function SiteLayout() {
  const [open, setOpen] = useState(false); const location = useLocation();
  const whatsapp = import.meta.env.VITE_WHATSAPP_NUMBER;
  return <div className="min-h-screen bg-canvas text-ink">
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <header className="site-header">
      <div className="shell header-inner">
        <Link to="/" className="brand" aria-label="VFS Groups home"><img src="/brand/vfs-groups-logo.png" alt="VFS Groups" /><span>VFS Groups<small>Your financial growth</small></span></Link>
        <nav className="desktop-nav" aria-label="Primary navigation">{links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}</nav>
        <div className="header-actions"><Link className="text-action" to="/track">Track application</Link><Link className="button button-dark" to="/sign-in">Sign in</Link><Link className="button button-gold" to="/apply">Apply now</Link></div>
        <button className="menu-button" type="button" aria-expanded={open} aria-label="Toggle navigation" onClick={() => setOpen((value) => !value)}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && <nav className="mobile-nav" aria-label="Mobile navigation">{links.map(([to, label]) => <NavLink key={to} to={to} onClick={() => setOpen(false)}>{label}</NavLink>)}<Link to="/track" onClick={() => setOpen(false)}>Track application</Link><Link className="button button-gold" to="/apply" onClick={() => setOpen(false)}>Apply now</Link></nav>}
    </header>
    <main id="main-content" key={location.pathname}><Outlet /></main>
    {whatsapp && <a className="whatsapp-fab" href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hello VFS Groups, I would like assistance choosing a financial service.')}`} target="_blank" rel="noreferrer" aria-label="Contact VFS Groups on WhatsApp"><MessageCircle /></a>}
    <ChatWidget />
    <footer className="site-footer"><div className="shell footer-grid"><div><Link to="/" className="brand footer-brand"><img src="/brand/vfs-groups-logo.png" alt="" /><span>VFS Groups<small>Your financial growth, our commitment</small></span></Link><p>One destination for loan assistance, insurance guidance, investments, and wealth services.</p></div><div><h2>Explore</h2><Link to="/services">Services</Link><Link to="/emi-calculator">EMI calculator</Link><Link to="/track">Track application</Link><Link to="/partner">Partner program</Link></div><div><h2>Company</h2><Link to="/about">About</Link><Link to="/contact">Contact</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/disclaimer">Disclaimer</Link></div></div><div className="shell footer-bottom"><p>© {new Date().getFullYear()} VFS Groups. All rights reserved.</p><p>Cashback is limited to eligible services. Provider terms and approval policies apply.</p></div></footer>
  </div>;
}
