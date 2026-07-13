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
  return <><section className="page-hero"><div className="shell"><span className="eyebrow">Loans · Insurance · Investments</span><h1>One stop for your financial needs.</h1><p>Explore VFS Group services for salaried and self-employed customers, backed by digital support, expert guidance, and transparent next steps.</p></div></section><section className="section"><div className="shell"><div className="inclusive-note"><strong>No fixed entry criteria to speak with us.</strong><span>Loan assistance is available with or without ITRs, including for customers with a low or limited CIBIL score. Final approval remains with the relevant lender.</span></div><div className="filter-bar"><label><Search size={18}/><span className="sr-only">Search services</span><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search loans, insurance, or investments"/></label><div role="group" aria-label="Service category">{categories.map((item)=><button className={item===category?'active':''} key={item} onClick={()=>setCategory(item)}>{item}</button>)}</div></div>{services.isLoading&&<p>Loading published services…</p>}{services.isError&&<div className="notice error">Services are unavailable. Please try again.</div>} {!services.isLoading&&<div className="services-list">{filtered.map((service)=><article key={service._id}><span>{service.category}</span><h2>{service.name}</h2><p>{service.shortDescription}</p><Link to={`/services/${service.slug}`}>Explore service <ArrowRight size={17}/></Link></article>)}{filtered.length===0&&<div className="empty-state">No published service matches these filters.</div>}</div>}</div></section></>;
}
