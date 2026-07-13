import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute.jsx';
import { SiteLayout } from '../components/SiteLayout.jsx';
import { SimpleContentPage } from '../pages/SimpleContentPage.jsx';

const HomePage = lazy(() => import('../pages/HomePage.jsx').then((module) => ({ default: module.HomePage })));
const ServicesPage = lazy(() => import('../pages/ServicesPage.jsx').then((module) => ({ default: module.ServicesPage })));
const ServiceDetailPage = lazy(() => import('../pages/ServiceDetailPage.jsx').then((module) => ({ default: module.ServiceDetailPage })));
const AboutPage = lazy(() => import('../pages/AboutPage.jsx').then((module) => ({ default: module.AboutPage })));
const EmiCalculatorPage = lazy(() => import('../pages/EmiCalculatorPage.jsx').then((module) => ({ default: module.EmiCalculatorPage })));
const ContactPage = lazy(() => import('../pages/ContactPage.jsx').then((module) => ({ default: module.ContactPage })));
const PortalChoicePage = lazy(() => import('../pages/PortalChoicePage.jsx').then((module) => ({ default: module.PortalChoicePage })));
const PortalLoginPage = lazy(() => import('../pages/PortalLoginPage.jsx').then((module) => ({ default: module.PortalLoginPage })));
const AccountRegisterPage = lazy(() => import('../pages/AccountRegisterPage.jsx').then((module) => ({ default: module.AccountRegisterPage })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.jsx').then((module) => ({ default: module.NotFoundPage })));
const ApplyPage = lazy(() => import('../pages/ApplyPage.jsx').then((module) => ({ default: module.ApplyPage })));
const CustomerDashboardPage = lazy(() => import('../pages/dashboards/MemberDashboardPage.jsx').then((module) => ({ default: module.CustomerDashboardPage })));
const ContractorDashboardPage = lazy(() => import('../pages/dashboards/MemberDashboardPage.jsx').then((module) => ({ default: module.ContractorDashboardPage })));
const AdminDashboardPage = lazy(() => import('../pages/dashboards/AdminDashboardPage.jsx').then((module) => ({ default: module.AdminDashboardPage })));
const AdminUserDetailPage = lazy(() => import('../pages/dashboards/AdminUserDetailPage.jsx').then((module) => ({ default: module.AdminUserDetailPage })));
const AdminReferralDetailPage = lazy(() => import('../pages/dashboards/AdminReferralDetailPage.jsx').then((module) => ({ default: module.AdminReferralDetailPage })));
const route = (element) => <Suspense fallback={<div className="shell route-loading" role="status">Loading page…</div>}>{element}</Suspense>;
const adminRoles=['super-admin','admin','operations-manager','application-manager','finance-manager','support-agent','content-manager'];

export const router = createBrowserRouter([{
  path: '/', element: <SiteLayout />, children: [
    { index: true, element: route(<HomePage />) }, { path: 'services', element: route(<ServicesPage />) }, { path: 'services/:slug', element: route(<ServiceDetailPage />) },
    { path: 'emi-calculator', element: route(<EmiCalculatorPage />) }, { path: 'contact', element: route(<ContactPage />) },
    { path: 'sign-in', element: route(<PortalChoicePage />) },
    { path: 'customer/sign-in', element: route(<PortalLoginPage portal="customer" />) }, { path: 'contractor/sign-in', element: route(<PortalLoginPage portal="contractor" />) }, { path: 'admin/sign-in', element: route(<PortalLoginPage portal="admin" />) },
    { path: 'customer/sign-up', element: route(<AccountRegisterPage accountType="customer" />) }, { path: 'contractor/sign-up', element: route(<AccountRegisterPage accountType="contractor" />) },
    { path: 'about', element: route(<AboutPage />) },
    { path: 'partner', element: <SimpleContentPage title="Grow with the VFS partner network" eyebrow="Partner with us" copy="The contractor program is being implemented with verified onboarding, unique referral attribution, application visibility, subscriptions, and ledger-backed commissions. No partner metric is shown until it comes from operational data." /> },
    { path: 'apply', element: route(<ApplyPage />) },
    { path: 'track', element: <SimpleContentPage title="Track securely with OTP verification" eyebrow="Application tracking" copy="For privacy, application information will be shown only after the application ID and registered mobile are verified through a rate-limited OTP flow." /> },
    { path: 'eligibility', element: <SimpleContentPage title="Start with your requirement—not a rigid checklist" eyebrow="Inclusive loan assistance" copy="VFS Group assists salaried and self-employed customers with or without ITRs, including customers with a low or limited CIBIL score. Share the information available to you and our team will guide the next step. Final approval and terms are decided by the relevant lender." /> },
    { path: 'gallery', element: <SimpleContentPage title="Approved moments from VFS Groups" eyebrow="Gallery" copy="Only administrator-approved media stored through the gallery API will appear here. No stock awards, partnerships, or customer claims are fabricated." /> },
    { path: 'faqs', element: <SimpleContentPage title="Straight answers, careful claims" eyebrow="Frequently asked questions" copy="Service-specific questions are available on each published service page. General content will be managed through the CMS so answers stay accurate and reviewable." /> },
    { path: 'privacy', element: <SimpleContentPage title="Privacy policy" eyebrow="Legal" copy="The final policy will describe collected data, purposes, lawful handling, providers, retention, security controls, and user rights. Authorized legal text must be published before production launch." /> },
    { path: 'terms', element: <SimpleContentPage title="Terms and conditions" eyebrow="Legal" copy="Production terms must be reviewed and published by an authorized administrator before the service accepts live applications." /> },
    { path: 'disclaimer', element: <SimpleContentPage title="Financial services disclaimer" eyebrow="Important information" copy="VFS Groups provides application assistance, product guidance, and related support. Approval, rates, loan amounts, tenure, charges, disbursement, insurance benefits, exclusions, premiums, investment risks and returns, cashback eligibility, and claims depend on the relevant institution and applicable terms." /> },
    { path: '*', element: route(<NotFoundPage />) },
  ],
},
{ path:'/customer/dashboard',element:route(<ProtectedRoute allowedRoles={['customer']}><CustomerDashboardPage/></ProtectedRoute>) },
{ path:'/contractor/dashboard',element:route(<ProtectedRoute allowedRoles={['contractor']}><ContractorDashboardPage/></ProtectedRoute>) },
{ path:'/admin/dashboard',element:route(<ProtectedRoute allowedRoles={adminRoles}><AdminDashboardPage/></ProtectedRoute>) },
{ path:'/admin/users/:id',element:route(<ProtectedRoute allowedRoles={adminRoles}><AdminUserDetailPage/></ProtectedRoute>) },
{ path:'/admin/referrals/:code',element:route(<ProtectedRoute allowedRoles={adminRoles}><AdminReferralDetailPage/></ProtectedRoute>) },
]);
