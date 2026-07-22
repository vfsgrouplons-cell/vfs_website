import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock3, LockKeyhole, PhoneCall } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Breadcrumbs } from '../components/Breadcrumbs.jsx';
import { Seo } from '../components/Seo.jsx';
import { api, apiMessage } from '../services/api.js';
import { trackEvent } from '../services/analytics.js';
import { mobileErrorMessage, mobilePattern, sanitizeMobile } from '../utils/validation.js';

const sessionKey = 'vfs_tracking_session';
function savedSession() { try { return JSON.parse(sessionStorage.getItem(sessionKey)) || null; } catch { return null; } }
const humanize = (value = '') => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export function TrackPage() {
  const [details, setDetails] = useState({ applicationId: '', mobile: '' }); const [mobileError, setMobileError] = useState(''); const [challenge, setChallenge] = useState(null); const [code, setCode] = useState(''); const [session, setSession] = useState(savedSession);
  const tracking = useQuery({ queryKey: ['tracking', session?.applicationId], enabled: Boolean(session?.trackToken && session?.applicationId), queryFn: async () => (await api.get(`/applications/public/track/${session.applicationId}`, { headers: { 'x-tracking-token': session.trackToken } })).data.data, retry: false });
  const requestCode = useMutation({ mutationFn: async () => (await api.post('/applications/public/track/request', details)).data.data, onSuccess: setChallenge });
  const verify = useMutation({ mutationFn: async () => (await api.post('/applications/public/track/verify', { challengeId: challenge.challengeId, code })).data.data, onSuccess: (data) => { const next = { applicationId: data.application.applicationId, trackToken: data.trackToken }; sessionStorage.setItem(sessionKey, JSON.stringify(next)); setSession(next); trackEvent('tracking_verified'); } });
  const application = tracking.data || verify.data?.application;
  const statuses = useMemo(() => application?.history || [], [application]);
  function reset() { sessionStorage.removeItem(sessionKey); setSession(null); setChallenge(null); setCode(''); setMobileError(''); setDetails({ applicationId: '', mobile: '' }); }
  function requestTracking(event) { event.preventDefault(); if (!mobilePattern.test(details.mobile)) { setMobileError(mobileErrorMessage); return; } setMobileError(''); requestCode.mutate(); }
  return <>
    <Seo title="Track Application | VFS Groups" description="Securely verify your registered mobile number and view application progress." path="/track" />
    <section className="page-hero compact-hero track-page-hero"><div className="shell"><Breadcrumbs items={[{ label: 'Track application' }]} /><span className="eyebrow">Secure application tracking</span><h1>See progress after mobile verification.</h1><p>Your application status is protected by a short-lived verification session.</p></div></section>
    <section className="section"><div className="shell narrow">
      {!session && !challenge && <form className="form-card" onSubmit={requestTracking} noValidate><LockKeyhole className="form-icon"/><h2>Find your application</h2><p>Enter the application ID from your acknowledgement and the registered mobile number.</p><div className="form-grid"><label>Application ID<input value={details.applicationId} onChange={(event) => setDetails((value) => ({ ...value, applicationId: event.target.value.toUpperCase() }))} placeholder="VFS-APP-2026-000001" required/></label><label>Registered mobile<input type="tel" inputMode="tel" aria-invalid={Boolean(mobileError)} value={details.mobile} onChange={(event) => { const mobile=sanitizeMobile(event.target.value); setDetails((value) => ({ ...value, mobile })); if (mobileError && mobilePattern.test(mobile)) setMobileError(''); }} onBlur={() => setMobileError(mobilePattern.test(details.mobile) ? '' : mobileErrorMessage)} required/>{mobileError && <small className="field-error" role="alert">{mobileError}</small>}</label></div><button className="button button-gold" disabled={requestCode.isPending}>{requestCode.isPending ? 'Checking…' : 'Send verification code'}</button>{requestCode.isError && <p className="form-error">{apiMessage(requestCode.error)}</p>}</form>}
      {!session && challenge && <form className="form-card verification-card" onSubmit={(event) => { event.preventDefault(); verify.mutate(); }}><Clock3 className="form-icon"/><h2>Enter the 6-digit code</h2><p>{challenge.message}</p>{challenge.mockCode && <div className="demo-code"><span>Mock provider code</span><strong>{challenge.mockCode}</strong><small>Visible only when MOCK_OTP_DISPLAY is enabled.</small></div>}<label>Verification code<input className="otp-input" inputMode="numeric" maxLength="6" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} required/></label><div className="button-row"><button className="button button-gold" disabled={verify.isPending}>{verify.isPending ? 'Verifying…' : 'Verify and view status'}</button><button type="button" className="button button-outline" onClick={() => setChallenge(null)}>Start again</button></div>{verify.isError && <p className="form-error">{apiMessage(verify.error)}</p>}</form>}
      {session && tracking.isLoading && <div className="route-loading">Loading verified application…</div>}
      {session && tracking.isError && <div className="form-card"><h2>Tracking session unavailable</h2><p className="form-error">{apiMessage(tracking.error)}</p><button className="button button-dark" onClick={reset}>Verify again</button></div>}
      {application && <div className="tracking-layout"><section className="tracking-summary"><div><span className="eyebrow">Verified application</span><h2>{application.applicationId}</h2><p>{application.service?.name} · Mobile ending {application.applicant?.mobileLast4}</p></div><span className="status-pill">{humanize(application.status)}</span></section><section className="form-card"><h2>Status timeline</h2><ol className="status-timeline">{statuses.map((item) => <li key={`${item.newStatus}-${item.createdAt}`}><CheckCircle2/><div><strong>{humanize(item.newStatus)}</strong><p>{item.publicNote}</p><small>{new Date(item.createdAt).toLocaleString('en-IN')}</small></div></li>)}</ol></section><section className="form-card in-person-note"><PhoneCall className="form-icon"/><h2>Documents will be coordinated in person</h2><p>VFS Groups will contact you if documents are required and explain what to bring. This website does not accept document uploads.</p></section><button type="button" className="inline-link tracking-reset" onClick={reset}>End tracking session and verify another application</button></div>}
    </div></section>
  </>;
}
