import { useQuery } from '@tanstack/react-query';
import { FileText, ShieldCheck, UserRound, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DashboardShell } from '../../components/dashboard/DashboardShell.jsx';
import { DashboardTabs } from '../../components/dashboard/DashboardTabs.jsx';
import { api, apiMessage } from '../../services/api.js';
import { formatDate, humanize } from '../../utils/dashboard.js';
import { ResponsiveTable } from './MemberDashboardPage.jsx';

export function AdminUserDetailPage() {
  const { id } = useParams(); const [active, setActive] = useState('account'); const detail = useQuery({ queryKey: ['admin-user', id], queryFn: async () => (await api.get(`/dashboard/admin/users/${id}`)).data.data });
  if (detail.isLoading) return <div className="shell route-loading">Loading user details…</div>;
  if (detail.isError) return <div className="shell route-loading"><h1>User unavailable</h1><p>{apiMessage(detail.error)}</p></div>;
  const { user, metrics, referredUsers, loanReferrals, loginActivity } = detail.data; const tabs = [{ id: 'account', label: 'Account', icon: UserRound }, { id: 'registrations', label: 'Registrations', icon: Users, count: referredUsers.length }, { id: 'referrals', label: 'Service referrals', icon: FileText, count: loanReferrals.length }, { id: 'security', label: 'Security', icon: ShieldCheck, count: loginActivity.length }];
  return <DashboardShell role="admin" title={user.fullName}><Link className="inline-link" to="/admin/dashboard">← Back to admin dashboard</Link><section className="dashboard-welcome"><div><span className="eyebrow">User details</span><h1>{user.fullName}</h1><p>{user.roles.map((role) => role.name).join(', ')} · Created {formatDate(user.createdAt)}</p></div>{user.referralCode && <div className="referral-code-card"><span>Referral code</span><strong>{user.referralCode}</strong><Link to={`/admin/referrals/${user.referralCode}`}>Open code details</Link></div>}</section><section className="metric-grid"><Metric label="Successful logins" value={metrics.successfulLogins}/><Metric label="First login" value={formatDate(user.firstLoginAt)}/><Metric label="Last login" value={formatDate(user.lastLoginAt)}/><Metric label="Users referred" value={metrics.referredUsers}/><Metric label="Service referrals" value={metrics.loanReferrals}/></section><DashboardTabs tabs={tabs} active={active} onChange={setActive} label="User detail sections"/>
    {active === 'account' && <section className="dashboard-card dashboard-section tab-panel" role="tabpanel"><h2>Account and attribution</h2><dl className="detail-list"><div><dt>Email</dt><dd>{user.email || '—'}</dd></div><div><dt>Phone</dt><dd>{user.mobile}</dd></div><div><dt>Referred by</dt><dd>{user.referredBy?.fullName || 'Direct registration'}</dd></div><div><dt>Code used</dt><dd>{user.referredByCode || '—'}</dd></div></dl></section>}
    {active === 'registrations' && <section className="dashboard-card dashboard-section tab-panel" role="tabpanel"><h2>Users registered through this code</h2><ResponsiveTable columns={['Name', 'Role', 'Email', 'Phone', 'Registered']} rows={referredUsers.map((item) => [item.fullName, item.roles?.map((role) => role.name).join(', '), item.email || '—', item.mobile, formatDate(item.createdAt)])} empty="No users registered through this code."/></section>}
    {active === 'referrals' && <section className="dashboard-card dashboard-section tab-panel" role="tabpanel"><h2>Service referrals submitted</h2><ResponsiveTable columns={['ID', 'Applicant', 'Service', 'Submitted', 'Status']} rows={loanReferrals.map((item) => [item.referralId, item.applicant.fullName, item.service?.name || '—', formatDate(item.createdAt), humanize(item.status)])} empty="No service referrals submitted."/></section>}
    {active === 'security' && <section className="dashboard-card dashboard-section tab-panel" role="tabpanel"><h2>Recent login activity</h2><ResponsiveTable columns={['Date', 'Role', 'IP', 'Device']} rows={loginActivity.map((item) => [formatDate(item.loginAt), humanize(item.role), item.ip || '—', item.userAgent || 'Unknown'])} empty="No login activity recorded."/></section>}
  </DashboardShell>;
}
function Metric({ label, value }) { return <article className="metric-card compact"><span>{label}</span><strong>{value}</strong></article>; }
