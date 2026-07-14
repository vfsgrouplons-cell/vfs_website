import { useQuery } from '@tanstack/react-query';
import { FileText, LayoutDashboard, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DashboardShell } from '../../components/dashboard/DashboardShell.jsx';
import { DashboardTabs } from '../../components/dashboard/DashboardTabs.jsx';
import { api, apiMessage } from '../../services/api.js';
import { formatDate, humanize } from '../../utils/dashboard.js';
import { ResponsiveTable } from './MemberDashboardPage.jsx';

export function AdminReferralDetailPage() {
  const { code } = useParams(); const [active, setActive] = useState('overview'); const detail = useQuery({ queryKey: ['admin-referral', code], queryFn: async () => (await api.get(`/dashboard/admin/referrals/${code}`)).data.data });
  if (detail.isLoading) return <div className="shell route-loading">Loading referral details…</div>;
  if (detail.isError) return <div className="shell route-loading"><h1>Referral code unavailable</h1><p>{apiMessage(detail.error)}</p></div>;
  const data = detail.data; const tabs = [{ id: 'overview', label: 'Overview', icon: LayoutDashboard }, { id: 'registrations', label: 'Registrations', icon: Users, count: data.registrations.length }, { id: 'referrals', label: 'Service referrals', icon: FileText, count: data.loanReferrals.length }];
  return <DashboardShell role="admin" title={data.referralCode}><Link className="inline-link" to="/admin/dashboard">← Back to admin dashboard</Link><section className="dashboard-welcome"><div><span className="eyebrow">Referral code details</span><h1>{data.referralCode}</h1><p>Owned by <Link className="table-link" to={`/admin/users/${data.owner._id}`}>{data.owner.fullName}</Link> · {data.owner.roles.map((role) => role.name).join(', ')}</p></div></section><DashboardTabs tabs={tabs} active={active} onChange={setActive} label="Referral detail sections"/>
    {active === 'overview' && <section className="metric-grid tab-panel" role="tabpanel"><Metric label="Registrations produced" value={data.metrics.registrations}/><Metric label="Service referrals submitted" value={data.metrics.loanReferrals}/></section>}
    {active === 'registrations' && <section className="dashboard-card dashboard-section tab-panel" role="tabpanel"><h2>Complete registration activity</h2><ResponsiveTable columns={['Name', 'Role', 'Email', 'Phone', 'Registration date']} rows={data.registrations.map((item) => [item.fullName, item.roles.map((role) => role.name).join(', '), item.email || '—', item.mobile, formatDate(item.createdAt)])} empty="No registrations used this code."/></section>}
    {active === 'referrals' && <section className="dashboard-card dashboard-section tab-panel" role="tabpanel"><h2>Owner’s service referrals</h2><ResponsiveTable columns={['ID', 'Applicant', 'Service', 'Submitted', 'Status']} rows={data.loanReferrals.map((item) => [item.referralId, item.applicant.fullName, item.service?.name || '—', formatDate(item.createdAt), humanize(item.status)])} empty="The code owner has not submitted service referrals."/></section>}
  </DashboardShell>;
}
function Metric({ label, value }) { return <article className="metric-card"><span>{label}</span><strong>{value}</strong></article>; }
