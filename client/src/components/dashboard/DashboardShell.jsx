import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { PoweredBy } from '../PoweredBy.jsx';

export function DashboardShell({ title, role, children }){const navigate=useNavigate();const location=useLocation();const queryClient=useQueryClient();useEffect(()=>{window.scrollTo({top:0,left:0,behavior:'auto'})},[location.pathname]);const logout=useMutation({mutationFn:()=>api.post('/auth/logout'),onSuccess:()=>{queryClient.clear();navigate(`/${role==='admin'?'admin':role}/sign-in`,{replace:true})}});return <div className="dashboard-page"><header className="dashboard-header"><div><Link to="/" className="brand"><img src="/brand/vfs-groups-logo.png" alt="VFS Groups"/><span>VFS Groups<small>{role} workspace</small></span></Link></div><div><span>{title}</span><button type="button" className="button button-outline" onClick={()=>logout.mutate()} disabled={logout.isPending}><LogOut size={17}/> Sign out</button></div></header>{role==='admin'&&<nav className="dashboard-nav" aria-label="Admin workspace"><NavLink to="/admin/dashboard">Operations</NavLink><NavLink to="/admin/applications">Applications</NavLink><NavLink to="/admin/content">Content studio</NavLink><Link to="/">View website</Link></nav>}<main className="dashboard-main">{children}</main><footer className="dashboard-footer"><PoweredBy compact/></footer></div>}
