export const permissions = [
  ['customers.view', 'View authorized customer records'], ['customers.edit', 'Edit authorized customer records'], ['customers.suspend', 'Suspend customer accounts'],
  ['contractors.view', 'View contractor records'], ['contractors.approve', 'Approve or reject contractors'], ['contractors.suspend', 'Suspend contractor accounts'],
  ['applications.view', 'View authorized applications'], ['applications.create', 'Create applications'], ['applications.assign', 'Assign applications'], ['applications.status.update', 'Change application status'],
  ['documents.view', 'View authorized documents'], ['documents.verify', 'Verify documents'], ['documents.reject', 'Reject documents'],
  ['subscriptions.view', 'View subscriptions'], ['subscriptions.manage', 'Manage subscriptions'],
  ['commissions.view', 'View commissions'], ['commissions.approve', 'Approve commissions'], ['commissions.pay', 'Record commission payments'],
  ['support.view', 'View support tickets'], ['support.manage', 'Manage support tickets'], ['content.manage', 'Manage CMS content'], ['content.publish', 'Publish CMS content'],
  ['reports.view', 'View reports'], ['reports.export', 'Export reports'], ['settings.manage', 'Manage system settings'], ['roles.manage', 'Manage roles and permissions'], ['audit.view', 'View immutable audit records'],
];

export const roleDefinitions = {
  'super-admin': permissions.map(([key]) => key),
  admin: permissions.map(([key]) => key).filter((key) => key !== 'roles.manage'),
  'operations-manager': ['customers.view', 'customers.edit', 'contractors.view', 'contractors.approve', 'applications.view', 'applications.create', 'applications.assign', 'applications.status.update', 'documents.view', 'documents.verify', 'documents.reject', 'support.view', 'reports.view', 'reports.export'],
  'application-manager': ['customers.view', 'contractors.view', 'applications.view', 'applications.create', 'applications.assign', 'applications.status.update', 'documents.view', 'documents.verify', 'documents.reject', 'reports.view'],
  'finance-manager': ['customers.view', 'contractors.view', 'applications.view', 'subscriptions.view', 'subscriptions.manage', 'commissions.view', 'commissions.approve', 'commissions.pay', 'reports.view', 'reports.export'],
  'support-agent': ['customers.view', 'contractors.view', 'applications.view', 'support.view', 'support.manage'],
  'content-manager': ['content.manage', 'content.publish'],
  contractor: ['customers.view', 'applications.view', 'applications.create', 'documents.view', 'subscriptions.view', 'commissions.view', 'support.view', 'reports.view'],
  customer: ['applications.view', 'applications.create', 'documents.view', 'subscriptions.view', 'support.view'],
};

const assistanceProcess = [
  'Share your requirement with VFS Groups',
  'Provide the information and documents currently available to you',
  'Receive guidance on relevant options and any additional documentation',
  'VFS Groups coordinates the application with an appropriate provider',
  'Track progress and respond to provider requests',
];

const loanEligibility = [
  'Assistance is available for salaried and self-employed applicants',
  'You can approach VFS Groups with ITRs or without ITRs',
  'A low or limited CIBIL score does not prevent you from requesting assistance',
  'VFS Groups reviews the available profile and documents before suggesting the next step',
  'Final eligibility, pricing, tenure, approval, and disbursement are decided by the relevant lender',
];

const loanFeatures = ['Quick processing support', 'Minimum-documentation guidance', 'Competitive options from relevant providers', 'Expert financial guidance', 'Digital and paperless assistance'];
const insuranceEligibility = ['Available to salaried and self-employed customers', 'Product suitability, premium, cover, and acceptance depend on the selected insurer and official policy terms'];
const investmentEligibility = ['Available to salaried and self-employed customers seeking guided investment options', 'Product eligibility, risk, returns, lock-ins, and taxation depend on the selected product and provider'];
const standardConsiderations = ['Cashback applies only to eligible services and is subject to the applicable offer terms', 'Read all provider terms, charges, risks, exclusions, and conditions before proceeding'];
const loanFaqs = [
  { question: 'Can I contact VFS Groups without ITRs?', answer: 'Yes. VFS Groups assists salaried and self-employed applicants with or without ITRs and will review the documents currently available.' },
  { question: 'Can I apply if my CIBIL score is low?', answer: 'Yes, you can still request assistance. VFS Groups will review the profile and discuss possible next steps, but the relevant lender makes the final decision.' },
  { question: 'Is loan approval guaranteed?', answer: 'No. Approval, amount, rate, tenure, charges, and disbursement are decided by the relevant lender after its assessment.' },
];
const providerFaqs = [
  { question: 'Will VFS Groups help me choose an option?', answer: 'Yes. The team can understand your requirement, explain available options, and guide you through the application process.' },
  { question: 'Are benefits or returns guaranteed?', answer: 'No. Benefits, cover, premiums, returns, risks, and acceptance are governed by the selected provider and official product terms.' },
];

const loan = (service) => ({
  category: 'Loans', features: loanFeatures, suitableFor: ['Salaried customers', 'Self-employed customers', 'Applicants with or without ITRs', 'Applicants with a low or limited CIBIL score'],
  eligibility: loanEligibility, process: assistanceProcess, considerations: standardConsiderations, faqs: loanFaqs, ...service,
});
const insurance = (service) => ({
  category: 'Insurance', features: ['Guided product selection', 'Digital application assistance', 'Minimum-documentation guidance', 'Expert support'], suitableFor: ['Salaried customers', 'Self-employed customers', 'Individuals, families, and businesses as applicable'],
  eligibility: insuranceEligibility, process: assistanceProcess, considerations: standardConsiderations, faqs: providerFaqs, ...service,
});
const investment = (service) => ({
  category: 'Wealth & Investments', features: ['Personalized financial guidance', 'Digital onboarding assistance', 'Investment diversification support', 'Ongoing service coordination'], suitableFor: ['Salaried customers', 'Self-employed customers', 'Customers planning short- or long-term financial goals'],
  eligibility: investmentEligibility, process: assistanceProcess, considerations: standardConsiderations, faqs: providerFaqs, ...service,
});

export const services = [
  loan({ name: 'Personal Loans', slug: 'personal-loans', shortDescription: 'Personal funding assistance for salaried and self-employed customers.', overview: 'Get guided personal loan assistance even when you do not have ITRs or your CIBIL score is low. VFS Groups reviews the available profile and helps identify a suitable next step.', useCases: ['Personal financial requirements', 'Planned purchases or expenses', 'Consolidating eligible obligations'], documents: ['Identity and address proof', 'Available salary, income, or business records', 'Recent bank statements when available', 'Existing loan details when applicable'], relatedSlugs: ['business-loans', 'education-loans'] }),
  loan({ name: 'Business Loans', slug: 'business-loans', shortDescription: 'Funding assistance for self-employed customers, entrepreneurs, and businesses.', overview: 'VFS Groups supports business funding requirements using the information and documents available with the applicant, including profiles with or without ITRs.', useCases: ['Business expansion', 'Inventory or equipment', 'Operational requirements'], documents: ['Identity and address proof', 'Available business registration or activity records', 'Available bank statements, GST records, or ITRs', 'Requirement details'], relatedSlugs: ['working-capital-finance', 'loan-against-property'] }),
  loan({ name: 'Home Loans', slug: 'home-loans', shortDescription: 'Home finance assistance for eligible property purchase requirements.', overview: 'Receive guidance through the home loan journey, from understanding the requirement and available documents to coordination with a relevant lender.', useCases: ['New home purchase', 'Resale home purchase', 'Other eligible residential purchase requirements'], documents: ['Identity and address proof', 'Available income or business records', 'Bank statements when available', 'Property documents'], relatedSlugs: ['loan-against-property', 'personal-loans'] }),
  loan({ name: 'Loan Against Property (LAP)', slug: 'loan-against-property', shortDescription: 'Property-backed loan assistance for personal or business requirements.', overview: 'Explore finance against eligible property with support for profile review, document guidance, and lender coordination.', useCases: ['Business funding', 'Eligible personal financial requirements', 'Working-capital support'], documents: ['Identity and address proof', 'Available income or business records', 'Property ownership documents', 'Bank statements when available'], relatedSlugs: ['home-loans', 'working-capital-finance'] }),
  loan({ name: 'New & Used Car Loans', slug: 'new-used-car-loans', shortDescription: 'Finance assistance for eligible new and pre-owned car purchases.', overview: 'Get support comparing the application route for a new or used car and coordinating the required information with a relevant lender.', useCases: ['New car purchase', 'Used car purchase'], documents: ['Identity and address proof', 'Available income or business records', 'Bank statements when available', 'Vehicle quotation or purchase details'], relatedSlugs: ['motor-insurance', 'personal-loans'] }),
  loan({ name: 'Education Loans', slug: 'education-loans', shortDescription: 'Education finance guidance for eligible study-related requirements.', overview: 'VFS Groups helps families and students organize the available course, institution, cost, and applicant information for lender review.', useCases: ['Tuition and eligible education costs', 'Domestic or overseas study requirements'], documents: ['Identity and address proof', 'Admission or course information', 'Available academic and cost records', 'Applicant or co-applicant financial information'], relatedSlugs: ['personal-loans', 'home-loans'] }),
  loan({ name: 'Loan Against Shares', slug: 'loan-against-shares', shortDescription: 'Funding assistance against eligible shareholdings and investments.', overview: 'Explore a secured funding route against eligible shares or investments, subject to provider rules and valuation.', useCases: ['Eligible personal liquidity needs', 'Eligible business liquidity needs'], documents: ['Identity and address proof', 'Holding or demat statements', 'Available income or business records', 'Bank statements when available'], relatedSlugs: ['working-capital-finance', 'lump-sum-investments'] }),
  loan({ name: 'Working Capital Finance', slug: 'working-capital-finance', shortDescription: 'Finance assistance for day-to-day business cash-flow requirements.', overview: 'VFS Groups helps self-employed customers and businesses present their working-capital requirement using the records currently available.', useCases: ['Inventory purchases', 'Supplier or operating requirements', 'Short-term business cash flow'], documents: ['Identity and address proof', 'Available business activity records', 'Available bank statements, GST records, or ITRs', 'Working-capital requirement details'], relatedSlugs: ['business-loans', 'loan-against-property'] }),
  insurance({ name: 'Health Insurance', slug: 'health-insurance', shortDescription: 'Guidance for health insurance options for individuals and families.', overview: 'Understand available health cover options, key policy terms, disclosures, and the steps needed to apply with a selected insurer.', useCases: ['Individual health cover', 'Family health cover', 'Policy renewal assistance'], documents: ['Identity and age details', 'Member information', 'Existing policy details for renewal', 'Medical information requested by the insurer'], relatedSlugs: ['life-insurance', 'general-insurance'] }),
  insurance({ name: 'Life Insurance', slug: 'life-insurance', shortDescription: 'Guidance for life-protection options and long-term financial security.', overview: 'Discuss life insurance requirements and receive application guidance based on the selected insurer and policy.', useCases: ['Life protection planning', 'Family financial security', 'Policy review or renewal support'], documents: ['Identity and age proof', 'Nominee details', 'Income information if requested', 'Medical information requested by the insurer'], relatedSlugs: ['health-insurance', 'corporate-fixed-deposits'] }),
  insurance({ name: 'Motor Insurance', slug: 'motor-insurance', shortDescription: 'Insurance assistance for cars, two-wheelers, and eligible vehicles.', overview: 'Get help with new motor insurance or renewal while reviewing available cover, add-ons, and official policy terms.', useCases: ['New vehicle cover', 'Policy renewal', 'Eligible add-on review'], documents: ['Vehicle registration details', 'Existing policy for renewal', 'Identity and contact details', 'Claim information if applicable'], relatedSlugs: ['new-used-car-loans', 'general-insurance'] }),
  insurance({ name: 'General Insurance', slug: 'general-insurance', shortDescription: 'Guidance across eligible non-life insurance requirements.', overview: 'Explore general insurance options suited to the stated requirement with support understanding documents and policy terms.', useCases: ['Eligible personal asset protection', 'Travel or other non-life requirements', 'Business-related protection as applicable'], documents: ['Identity and contact details', 'Details of the asset or risk to be covered', 'Existing policy information when applicable'], relatedSlugs: ['motor-insurance', 'warehouse-commercial-insurance'] }),
  insurance({ name: 'Warehouse & Commercial Insurance', slug: 'warehouse-commercial-insurance', shortDescription: 'Insurance guidance for eligible warehouses and commercial requirements.', overview: 'Get assistance presenting a warehouse or commercial insurance requirement and understanding the selected policy terms.', useCases: ['Warehouse protection', 'Commercial property protection', 'Eligible business-risk cover'], documents: ['Business and property details', 'Asset or stock information', 'Existing policy details when applicable', 'Risk information requested by the insurer'], relatedSlugs: ['general-insurance', 'working-capital-finance'] }),
  investment({ name: 'Corporate Fixed Deposits', slug: 'corporate-fixed-deposits', shortDescription: 'Guidance while exploring eligible corporate fixed-deposit options.', overview: 'Review corporate fixed-deposit options with attention to provider information, tenure, payout structure, risk, and applicable terms.', useCases: ['Planned fixed-term investment', 'Income or maturity planning'], documents: ['Identity and address proof', 'PAN and bank details', 'Nominee details', 'Additional KYC requested by the provider'], relatedSlugs: ['sip-investments', 'lump-sum-investments'] }),
  investment({ name: 'SIP (Systematic Investment Plans)', slug: 'sip-investments', shortDescription: 'Guidance for disciplined, periodic investment planning.', overview: 'Build a systematic investment approach around your goals, time horizon, and risk understanding with digital onboarding support.', useCases: ['Periodic investing', 'Long-term goal planning', 'Investment diversification'], documents: ['Identity and address proof', 'PAN and bank details', 'Nominee details', 'Additional KYC requested by the provider'], relatedSlugs: ['lump-sum-investments', 'corporate-fixed-deposits'] }),
  investment({ name: 'Lump Sum Investments', slug: 'lump-sum-investments', shortDescription: 'Guidance for investing a planned amount through suitable options.', overview: 'Discuss a one-time investment requirement and understand diversification, product risk, time horizon, and official terms before proceeding.', useCases: ['One-time investment', 'Portfolio diversification', 'Goal-based investment planning'], documents: ['Identity and address proof', 'PAN and bank details', 'Nominee details', 'Additional KYC requested by the provider'], relatedSlugs: ['sip-investments', 'corporate-fixed-deposits'] }),
].map((service, index) => ({ ...service, status: 'published', sortOrder: index + 1, seo: { title: `${service.name} | VFS Groups`, description: service.shortDescription } }));
