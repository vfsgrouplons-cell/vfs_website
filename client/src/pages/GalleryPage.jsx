import { useQuery } from '@tanstack/react-query';
import { Camera, Film, Image as ImageIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Breadcrumbs } from '../components/Breadcrumbs.jsx';
import { Seo } from '../components/Seo.jsx';
import { api } from '../services/api.js';

export function GalleryPage() {
  const gallery = useQuery({ queryKey: ['content', 'gallery'], queryFn: async () => (await api.get('/content/gallery')).data.data }); const [category, setCategory] = useState('All');
  const categories = useMemo(() => ['All', ...new Set((gallery.data || []).map((item) => item.category))], [gallery.data]); const items = (gallery.data || []).filter((item) => category === 'All' || item.category === category);
  return <><Seo title="Gallery | VFS Groups" description="Real, permission-confirmed VFS Groups company, team, event, and customer-service moments." path="/gallery"/><section className="page-hero"><div className="shell"><Breadcrumbs items={[{ label: 'Gallery' }]}/><span className="eyebrow"><Camera size={16}/> Verified media</span><h1>Real moments, published with permission.</h1><p>Only administrator-approved pictures and videos stored through the media API appear here. Stock awards, invented partnerships, and fabricated customer media are not used.</p></div></section><section className="section"><div className="shell"><div className="filter-bar"><div role="group" aria-label="Gallery category">{categories.map((item) => <button key={item} className={item === category ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div></div>{gallery.isLoading && <div className="gallery-grid">{Array.from({ length: 6 }, (_, index) => <div className="gallery-card skeleton" key={index}/>)}</div>}{gallery.isError && <div className="notice error">The gallery could not be loaded.</div>}{!gallery.isLoading && !items.length && <div className="empty-feature"><ImageIcon/><h2>No approved media yet</h2><p>An administrator can upload real office, team, event, or customer-service pictures and videos after confirming publication consent.</p></div>}<div className="gallery-grid">{items.map((item) => <figure className="gallery-card" key={item._id}><PublicGalleryMedia item={item}/><figcaption><span>{item.category}</span><h2>{item.title}</h2>{item.caption && <p>{item.caption}</p>}</figcaption></figure>)}</div></div></section></>;
}

function PublicGalleryMedia({ item }) {
  if (!item.media?.url) return <div className="media-unavailable">{item.media?.resourceType === 'video' ? <Film/> : <ImageIcon/>}<span>Media provider preview unavailable</span></div>;
  if (item.media.resourceType === 'video') return <video src={item.media.url} controls playsInline preload="metadata" aria-label={item.altText || item.title}/>;
  return <img src={item.media.url} alt={item.altText} loading="lazy"/>;
}
