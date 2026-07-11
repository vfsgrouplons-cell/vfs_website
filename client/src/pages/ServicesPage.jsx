import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';

export function ServicesPage() {
  const [query,setQuery]=useState(''); const [category,setCategory]=useState('All');
  const services=useQuery({queryKey:['services'],queryFn:async()=>(await api.get('/services')).data.data});
  const categories=useMemo(()=>['All',...new Set((services.data||[]).map((item)=>item.category))],[services.data]);
  const filtered=useMemo(()=>(services.data||[]).filter((item)=>(category==='All'||item.category===category)&&`${item.name} ${item.shortDescription}`.toLowerCase().includes(query.toLowerCase())),[services.data,query,category]);
  return <><section className="page-hero"><div className="shell"><span className="eyebrow">Financial services</span><h1>Explore a solution around your requirement.</h1><p>Review published information, common documents, considerations, and application steps. Provider policies determine final eligibility and terms.</p></div></section><section className="section"><div className="shell"><div className="filter-bar"><label><Search size={18}/><span className="sr-only">Search services</span><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search services"/></label><div role="group" aria-label="Service category">{categories.map((item)=><button className={item===category?'active':''} key={item} onClick={()=>setCategory(item)}>{item}</button>)}</div></div>{services.isLoading&&<p>Loading published services…</p>}{services.isError&&<div className="notice error">Services are unavailable. Please try again.</div>} {!services.isLoading&&<div className="services-list">{filtered.map((service)=><article key={service._id}><span>{service.category}</span><h2>{service.name}</h2><p>{service.shortDescription}</p><Link to={`/services/${service.slug}`}>Explore service <ArrowRight size={17}/></Link></article>)}{filtered.length===0&&<div className="empty-state">No published service matches these filters.</div>}</div>}</div></section></>;
}
