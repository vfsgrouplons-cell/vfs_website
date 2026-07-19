import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clipboard, FileText, LayoutDashboard, Send, Share2, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { LocationFields } from '../../components/LocationFields.jsx';
import { DashboardShell } from '../../components/dashboard/DashboardShell.jsx';
import { DashboardTabs, Pagination } from '../../components/dashboard/DashboardTabs.jsx';
import { INDIA_COUNTRY } from '../../data/indiaLocations.js';
import { api, apiMessage } from '../../services/api.js';
import { formatDate, humanize } from '../../utils/dashboard.js';
import { mobileErrorMessage, mobilePattern, sanitizeMobile, sanitizeMobileEvent } from '../../utils/validation.js';

const pageSize = 10;

export function MemberDashboardPage({ portal }) {
  const queryClient = useQueryClient(); const [copied, setCopied] = useState(false); const [active, setActive] = useState('overview'); const [pages, setPages] = useState({ registrations: 1, submissions: 1, security: 1 });
  const dashboard = useQuery({ queryKey: ['dashboard', portal], queryFn: async () => (await api.get(`/dashboard/${portal}`)).data.data });
  const services = useQuery({ queryKey: ['services'], queryFn: async () => (await api.get('/services')).data.data });
  const registrations = useMemberPage(portal, 'referred-users', pages.registrations, active === 'registrations');
  const submissions = useMemberPage(portal, 'service-referrals', pages.submissions, active === 'submissions');
  const security = useMemberPage(portal, 'login-activity', pages.security, active === 'security');
  const form = useForm({ defaultValues: { service: '', applicant: { fullName: '', mobile: '', email: '', country: INDIA_COUNTRY, state: '', city: '', requestedAmount: 0, notes: '' } } });
  const createReferral = useMutation({ mutationFn: async (values) => (await api.post('/loan-referrals', values)).data.data, onSuccess: () => { form.reset(); queryClient.invalidateQueries({ queryKey: ['dashboard', portal] }); queryClient.invalidateQueries({ queryKey: ['member-page', portal, 'service-referrals'] }); } });
  if (dashboard.isLoading) return <div className="shell route-loading">Loading your dashboard…</div>;
  if (dashboard.isError) return <div className="shell route-loading"><h1>Dashboard unavailable</h1><p>{apiMessage(dashboard.error)}</p></div>;
  const data = dashboard.data; const shareUrl = `${window.location.origin}/customer/sign-up?ref=${data.user.referralCode}`;
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'new-referral', label: 'New referral', icon: UserPlus },
    { id: 'registrations', label: 'Registrations', icon: Users, count: data.metrics.registeredThroughCode },
    { id: 'submissions', label: 'Submissions', icon: FileText, count: data.metrics.loanReferralsSubmitted },
    { id: 'security', label: 'Security', icon: ShieldCheck },
  ];
  async function copy(value) { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1600); }
  async function share() { if (navigator.share) await navigator.share({ title: 'VFS Groups referral', text: 'Register with my VFS Groups referral code.', url: shareUrl }); else await copy(shareUrl); }
  function changePage(key, page) { setPages((value) => ({ ...value, [key]: page })); }
  return <DashboardShell role={portal} title={data.user.fullName}>
    <section className="dashboard-welcome"><div><span className="eyebrow">{portal} dashboard</span><h1>Welcome, {data.user.fullName}</h1><p>Every count and record below is loaded from your authorized MongoDB data.</p></div><div className="referral-code-card"><span>Your permanent referral code</span><strong>{data.user.referralCode}</strong><div><button type="button" onClick={() => copy(data.user.referralCode)}><Clipboard size={16}/>{copied ? 'Copied' : 'Copy'}</button><button type="button" onClick={share}><Share2 size={16}/>Share</button></div></div></section>
    <section className="metric-grid"><Metric label="Successful logins" value={data.metrics.successfulLogins}/><Metric label="Last login" value={formatDate(data.user.lastLoginAt)} compact/><Metric label="Users registered through you" value={data.metrics.registeredThroughCode}/><Metric label="Service referrals submitted" value={data.metrics.loanReferralsSubmitted}/></section>
    <DashboardTabs tabs={tabs} active={active} onChange={setActive} label={`${portal} dashboard sections`}/>

    {active === 'overview' && <section className="dashboard-columns tab-panel" role="tabpanel"><article className="dashboard-card"><span className="eyebrow">Latest registrations</span><h2>Recently registered through you</h2><ResponsiveTable columns={['Name', 'Role', 'Registered']} rows={data.referredUsers.map((user) => [user.fullName, user.roles?.[0]?.name || 'User', formatDate(user.createdAt)])} empty="No users have registered through your code yet."/><button type="button" className="inline-link tab-more" onClick={() => setActive('registrations')}>View all registrations →</button></article><article className="dashboard-card"><span className="eyebrow">Latest submissions</span><h2>Recent service referrals</h2><ResponsiveTable columns={['Referral ID', 'Applicant', 'Status']} rows={data.recentLoanReferrals.map((item) => [item.referralId, item.applicant.fullName, humanize(item.status)])} empty="You have not submitted a service referral yet."/><button type="button" className="inline-link tab-more" onClick={() => setActive('submissions')}>View all submissions →</button></article></section>}

    {active === 'new-referral' && <section className="dashboard-card dashboard-section tab-panel" role="tabpanel"><div className="card-heading"><div><span className="eyebrow">Financial service referral</span><h2>Refer someone who needs financial assistance</h2></div><UserPlus/></div><form className="dashboard-form" onSubmit={form.handleSubmit((values) => createReferral.mutate(values))} noValidate><div className="form-grid"><Field label="Applicant name" name="applicant.fullName" form={form} rules={{ required: 'Enter the applicant name' }}/><Field label="Mobile" name="applicant.mobile" type="tel" form={form} rules={{ required: 'Enter the mobile number', pattern: { value: mobilePattern, message: mobileErrorMessage }, setValueAs: sanitizeMobile }}/><Field label="Email (optional)" name="applicant.email" type="email" form={form}/><LocationFields form={form} prefix="applicant"/><label>Service<select aria-invalid={Boolean(form.formState.errors.service)} {...form.register('service', { required: 'Choose a service' })}><option value="">Choose service</option>{services.data?.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select>{form.formState.errors.service && <small className="field-error" role="alert">{form.formState.errors.service.message}</small>}</label><Field label="Requested amount (₹)" name="applicant.requestedAmount" type="number" form={form} rules={{ valueAsNumber: true, min: { value: 0, message: 'Amount cannot be negative' } }}/></div><label>Notes (optional)<textarea rows="3" {...form.register('applicant.notes')}/></label><button className="button button-gold" disabled={createReferral.isPending}><Send size={17}/>{createReferral.isPending ? 'Submitting…' : 'Submit service referral'}</button>{createReferral.isError && <p className="form-error" role="alert">{apiMessage(createReferral.error)}</p>}{createReferral.isSuccess && <div className="form-success">Service referral {createReferral.data.referralId} was recorded.</div>}</form></section>}

    {active === 'registrations' && <PaginatedPanel title="Users registered through you" eyebrow="Referral-code activity" query={registrations} page={pages.registrations} onPage={(page) => changePage('registrations', page)} label="registrations" columns={['Name', 'Role', 'Email', 'Mobile', 'Registered']} row={(user) => [user.fullName, user.roles?.[0]?.name || 'User', user.email || '—', user.mobile, formatDate(user.createdAt)]} empty="No users have registered through your code yet."/>}
    {active === 'submissions' && <PaginatedPanel title="All service referrals" eyebrow="Your submissions" query={submissions} page={pages.submissions} onPage={(page) => changePage('submissions', page)} label="submissions" columns={['Referral ID', 'Applicant', 'Service', 'Submitted', 'Status']} row={(item) => [item.referralId, item.applicant.fullName, item.service?.name || '—', formatDate(item.createdAt), humanize(item.status)]} empty="You have not submitted a service referral yet."/>}
    {active === 'security' && <PaginatedPanel title="Successful login history" eyebrow="Security activity" query={security} page={pages.security} onPage={(page) => changePage('security', page)} label="login records" columns={['Date and time', 'Role', 'IP', 'Device']} row={(item) => [formatDate(item.loginAt), humanize(item.role), item.ip || '—', item.userAgent || 'Unknown device']} empty="No successful portal login has been recorded yet."/>}
  </DashboardShell>;
}

function useMemberPage(portal, collection, page, enabled) { return useQuery({ queryKey: ['member-page', portal, collection, page], enabled, queryFn: async () => (await api.get(`/dashboard/${portal}/${collection}`, { params: { page, limit: pageSize } })).data }); }
function PaginatedPanel({ title, eyebrow, query, page, onPage, label, columns, row, empty }) { return <section className="dashboard-card dashboard-section tab-panel" role="tabpanel"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{query.isLoading ? <div className="empty-state">Loading {label}…</div> : query.isError ? <p className="form-error">{apiMessage(query.error)}</p> : <><ResponsiveTable columns={columns} rows={(query.data?.data || []).map(row)} empty={empty}/><Pagination page={page} pages={query.data?.meta?.pages} total={query.data?.meta?.total} onChange={onPage} label={label}/></>}</section>; }
export const CustomerDashboardPage = () => <MemberDashboardPage portal="customer"/>;
export const ContractorDashboardPage = () => <MemberDashboardPage portal="contractor"/>;
function Metric({ label, value, compact }) { return <article className={`metric-card ${compact ? 'compact' : ''}`}><span>{label}</span><strong>{value}</strong></article>; }
function nestedError(form, name) { return name.split('.').reduce((value, key) => value?.[key], form.formState.errors); }
function Field({ label, name, type = 'text', form, rules }) { const error = nestedError(form, name); return <label>{label}<input type={type} inputMode={type === 'tel' ? 'tel' : undefined} aria-invalid={Boolean(error)} onInput={type === 'tel' ? sanitizeMobileEvent : undefined} {...form.register(name, rules)}/>{error && <small className="field-error" role="alert">{error.message}</small>}</label>; }
export function ResponsiveTable({ columns, rows, empty }) { if (!rows.length) return <div className="empty-state">{empty}</div>; return <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td data-label={columns[cellIndex]} key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>; }
