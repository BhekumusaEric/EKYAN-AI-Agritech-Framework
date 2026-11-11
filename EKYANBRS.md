EKYAN Connect
Business Requirements Specification (BRS)
Document status: Draft for stakeholder validation
Version: 1.0
Prepared for: UNICEF Generation Unlimited, EKYAN programme stakeholders and delivery partners
Prepared by: Bhekumusa Eric Ntshwenya
Date: 11 November 2026
Proposed pilot: Poultry value chain, Busia County, Kenya
1. Document Control
1.1 Purpose of this document
This Business Requirements Specification defines the business need, scope, actors, processes, requirements, controls and implementation approach for EKYAN Connect, a proposed digital operating and intelligence layer for the Engaging Kenyan Youth in Agriculture and Nutrition programme.
The BRS is intended to support:
stakeholder alignment;
validation with UNICEF Generation Unlimited, Kuza, SNV, county stakeholders and private-sector partners;
solution design and prototyping;
prioritisation of a minimum viable product;
preparation for a controlled pilot;
engagement with suppliers, lenders, banks, investors and off-takers;
implementation planning in Kiro or another approved engineering environment.
1.2 Background sources
This BRS is based on:
the UNICEF GenU AI discussion with Manuela Radelsboeck;
the EKYAN programme update deck dated October 2026;
the Kenya MPTF 2025 narrative report;
the Generation Unlimited Trust Fund 2025 consolidated report;
the public EKYAN programme description;
the subsequent problem analysis and prototype definition.
1.3 Status and limitations
This document proposes a solution for stakeholder consideration. It does not confirm UNICEF approval, partner commitments, access to production data, technical integration rights or regulatory approval.
All prototype data must remain synthetic until the relevant data-sharing, privacy, information-security and partner agreements are in place.
2. Executive Summary
EKYAN has demonstrated that young agripreneurs can extend agricultural training, services and opportunity to farming communities. However, the programme's next challenge is not simply to train more people. It is to ensure that learning consistently becomes implementation, income and measurable impact.
Farmers and agripreneurs may understand what needs to be done but remain unable to act because of:
unavailable or unaffordable inputs;
insufficient finance;
weak bookkeeping and limited credit history;
water, labour, land and climate constraints;
unreliable access to buyers and off-takers;
fragmented communication between programme participants and service providers;
advisory information that may be incomplete, narrow or insufficiently contextual;
limited real-time programme visibility into unresolved blockers and outcome conversion.
The proposed solution, EKYAN Connect, is a shared operating structure that connects farmers, agripreneurs, suppliers, lenders, investors, buyers, extension officers and programme managers.
It enables the programme to follow a continuous operational loop:
Learn → intend to adopt → report a blocker or need → coordinate a response → fulfil the requirement → verify adoption → record the business outcome → learn at programme level.
EKYAN Connect is not intended to replace Ask Nia, OneNetwork, Agribytes, Chomoka or existing partner systems. It is designed to integrate with them through controlled interfaces and close the operational gaps between them.
The initial solution comprises six connected capabilities:
Farmer and agripreneur field operations;
Blocker reporting and resolution;
Input demand aggregation and fulfilment;
Bookkeeping, credit readiness and investment readiness;
Market and off-taker coordination;
Programme intelligence and cost-effectiveness monitoring.
AI acts as an enabling layer for classification, summarisation, forecasting, data extraction, personalised guidance and decision support. It must not replace professional agricultural advice, regulated lending decisions or accountable human programme decisions.
3. Programme Context
3.1 EKYAN operating model
EKYAN connects:
trained youth agripreneurs;
smallholder farmers;
schools and community hubs;
out-of-school youth;
county and extension services;
agricultural suppliers;
finance providers;
market actors and off-takers;
implementing and funding partners.
The programme has already invested in training, advisory support, entrepreneurship development and digital tools. Its scale ambition requires a system that preserves delivery quality while increasing reach, coordination and evidence.
3.2 Strategic challenge
The current model depends significantly on human training, mentoring, agripreneur relationships and periodic programme reporting. These remain essential, but they become difficult to coordinate consistently as the programme scales.
The strategic requirement is therefore to digitise coordination and follow-through, not merely training content.
3.3 Core business problem
The core business problem is:
EKYAN does not yet have one continuous, shared and real-time operating structure through which farmer needs, agripreneur activity, partner responses, financing, market relationships and verified programme outcomes can be coordinated and measured.
4. Problem Statement and Root-Cause Analysis
ID
Business problem
Root cause
Consequence
P01
Training does not always become implementation
Blockers are often identified after the fact rather than reported and resolved when they occur
Adoption intentions do not consistently translate into changed practice
P02
Farmers struggle to obtain inputs at the right time, quantity, quality and price
Rural demand is fragmented and not visible to suppliers
Suppliers face high last-mile costs and farmers abandon or delay adoption
P03
Agripreneurs and farmers struggle to access formal finance
Limited bookkeeping, collateral, verified cash-flow data and credit history
Viable enterprises remain financially invisible
P04
Producers face unreliable markets and weak buyer relationships
Future supply, quality and harvest timing are not consistently aggregated or visible
Price volatility, distress selling and post-harvest losses
P05
Advisory support is not always timely, sufficiently accurate or broad across value chains
Knowledge is fragmented and escalation pathways are unclear
Poor decisions, delayed intervention and avoidable losses
P06
Scaling the model may reduce quality
Human mentoring and support capacity do not automatically scale with programme reach
Agripreneur effectiveness and farmer support may become uneven
P07
Programme data can be fragmented or inconsistent
Multiple sources, self-reporting and differing KPI definitions
Weak evidence, slow reporting and reduced donor confidence
P08
Out-of-school youth do not consistently reach income and employment outcomes
Training is not always connected to finance, orders, markets or enterprise support
Skills do not become sustainable livelihoods
P09
Context and inclusion needs vary by county and participant
A uniform delivery model may not account for water, land, disability, language, technology access and gendered constraints
Some groups remain underserved
P10
Small enterprises are unattractive to formal investors individually
High due-diligence costs, weak records and small transaction sizes
Growth capital remains unavailable
5. Business Objectives
EKYAN Connect shall support the following objectives:
Create a live feedback and resolution mechanism for farmer and agripreneur blockers.
Increase the conversion of learning and adoption intention into verified implementation.
Aggregate input demand so that suppliers can respond efficiently and competitively.
Create reliable digital business histories for agripreneurs.
Make agripreneurs more assessable by banks, lenders and impact investors.
Improve visibility of expected production and connect producers to buyers.
Extend access to verified and context-sensitive agricultural guidance.
Reduce the administrative burden on agripreneurs and programme teams.
Establish one agreed set of KPI definitions and outcome calculations.
Improve programme cost-effectiveness and evidence for scaling.
Preserve human accountability while using AI to increase speed and insight.
Support multi-county and future multi-country configuration without rebuilding the platform.
6. Proposed Solution
6.1 Solution statement
EKYAN Connect is a digital operating, coordination and intelligence platform that helps EKYAN participants report needs, coordinate services, build business records, access finance and markets, and provide the programme with continuous evidence of outcomes and cost-effectiveness.
6.2 Solution principles
Farmer-first, agripreneur-assisted: a farmer must be able to benefit without owning a smartphone.
Integrate rather than replace: connect to existing EKYAN and partner tools.
One entry, many uses: records captured once should support operations, finance and programme evidence.
Offline and low-bandwidth: field operations must continue without reliable connectivity.
Human accountability: AI supports but does not make final high-impact decisions.
Consent and transparency: participants control who receives their personal and financial information.
Verified advice: agricultural guidance must be source-backed and escalated when uncertain.
Configurable design: counties, languages, value chains, inputs and partner routes must be configurable.
Inclusive design: interfaces and processes must reflect women, youth with disabilities and participants with limited digital access.
Evidence by design: each important outcome must have an agreed definition and auditable source.
6.3 Proposed capability map
Capability
Primary purpose
Field Operations
Record farmer profiles, orders, blockers, transactions and progress
Blocker Resolution
Route problems to accountable actors and track them to closure
Input Network
Aggregate demand, invite supplier response and confirm fulfilment
Enterprise Finance
Build bookkeeping records, credit-readiness and investor profiles
Market Network
Forecast supply, aggregate produce and connect to buyers/off-takers
Advisory and Risk Intelligence
Connect verified advice, weather, soil and production support
Programme Intelligence
Monitor reach, adoption, resolution, finance, markets and cost per outcome
Administration and Governance
Maintain configuration, access, consent, quality and audit controls
7. Stakeholders and Actors
Actor
Role in the ecosystem
Value received
Farmer
Produces crops or livestock and receives services
Timely inputs, advice, blocker resolution, finance pathways and buyers
Agripreneur
Serves farmers and coordinates local activity
Business tools, more customers, records, finance readiness and operating efficiency
Supplier
Provides agricultural inputs or equipment
Aggregated, forecast and location-specific demand
Bank or lender
Provides regulated credit or input finance
Consent-based records, cash-flow evidence and lower assessment cost
Impact investor
Provides growth or portfolio capital
Standardised enterprise profiles, financial projections and impact evidence
Buyer/off-taker
Purchases agricultural produce
Forward visibility of volume, timing and quality
Extension officer
Provides specialist or government support
Prioritised cases and better use of scarce capacity
School/community hub
Supports access, demonstration and coordination
Structured local service point
County administration
Supports agricultural delivery and local response
Area-level demand, risk and performance insight
UNICEF/GenU
Programme sponsor and oversight
Outcome evidence, target tracking and cost-effectiveness
Delivery partner
Implements training, support or technology
Shared workflows and reduced fragmentation
Platform administrator
Manages configuration, access and quality
Controlled and auditable operations
8. Future-State Business Process
8.1 End-to-end process
A farmer receives training or expresses an intention to adopt a practice.
The farmer or agripreneur records the intended activity, required input or blocker.
The platform categorises the need and recommends the appropriate route.
The agripreneur confirms the categorisation and routing.
The responsible supplier, lender, extension officer, buyer or programme actor receives the request.
The responsible actor responds, commits or requests additional information.
The service, input, finance or market connection is delivered.
The agripreneur or farmer confirms fulfilment.
The platform records whether adoption occurred and the resulting business outcome.
Programme indicators and cost-effectiveness calculations are updated.
Recurring blockers and high-performing interventions are identified for programme improvement.
8.2 Example: poultry input and finance journey
A farmer intends to vaccinate poultry but cannot obtain affordable vaccines.
The agripreneur records the problem using a short form or voice note.
AI transcribes and suggests the categories Inputs and Finance.
The agripreneur confirms the classification.
The platform identifies similar requests nearby and creates a pooled demand group.
A verified supplier quotes for the combined order.
A finance partner reviews the agripreneur's consented business profile.
Approved finance is paid directly to the supplier.
Delivery is made to an agreed local point.
The agripreneur confirms farmer receipt and vaccination.
The farmer's journey moves from intention to fulfilled support and verified adoption.
9. Scope
9.1 MVP scope
The MVP shall include:
role-based access;
farmer records managed by agripreneurs;
offline field logging;
blocker capture, routing, status and escalation;
input-order capture and pooled demand;
supplier commitment and fulfilment confirmation;
simple agripreneur bookkeeping;
explainable finance-readiness profile;
consent-controlled lender view;
investor opportunity profile generated from verified data;
mock integration interfaces for Ask Nia, OneNetwork, Chomoka and finance partners;
programme dashboard and KPI dictionary;
synthetic pilot data;
English and Kiswahili configuration;
audit logging and data-quality checks.
9.2 Phase 2 scope
buyer/off-taker marketplace;
supply and harvest forecasting;
integrated agricultural bundles;
real partner integrations;
climate, weather and soil services;
receipt and invoice extraction;
voice-to-structured-record capability;
notifications over approved messaging channels;
portfolio finance and investor aggregation;
multi-county rollout.
9.3 Future scope
value-addition and processing coordination;
insurance integration;
advanced geospatial intelligence;
multi-country configuration;
lender-approved predictive risk models where sufficient lawful data exists;
automated impact-investment reporting;
integration with formal credit bureaus where legally and contractually appropriate.
9.4 Out of scope for MVP
automatic loan approval or rejection;
distribution of real funds;
production use of personal or financial data;
storage of children's personal data;
public supplier enrolment without programme verification;
replacement of Ask Nia, OneNetwork, Agribytes or Chomoka;
unverified agronomic or veterinary prescriptions;
unrestricted AI-generated financial or agricultural advice.
10. Functional Business Requirements
10.1 User, role and configuration requirements
ID
Requirement
Priority
BR-001
The solution shall support agripreneur, supplier, lender, investor, buyer, extension officer, programme manager and administrator roles.
Must
BR-002
The solution shall restrict each role to authorised data and actions.
Must
BR-003
Farmers shall not require a system account during the MVP.
Must
BR-004
Agripreneurs shall be able to act on behalf of farmers with recorded consent.
Must
BR-005
Counties, wards, languages, value chains, inputs, blocker categories, partners and service routes shall be configurable.
Must
BR-006
The solution shall support onboarding and verification statuses for suppliers, buyers and finance partners.
Should
10.2 Farmer and field-operation requirements
ID
Requirement
Priority
BR-010
Agripreneurs shall be able to create and maintain farmer records.
Must
BR-011
A farmer record shall capture only the minimum information required for programme and service delivery.
Must
BR-012
Agripreneurs shall be able to record an adoption intention, order, blocker, transaction or outcome.
Must
BR-013
Field records shall work offline and synchronise when connectivity returns.
Must
BR-014
Every proxy action shall record who acted and on whose behalf.
Must
BR-015
The solution should support short voice notes and later convert them into structured records.
Should
BR-016
Participants shall be able to use English or Kiswahili, with additional languages configurable.
Must
10.3 Blocker-management requirements
ID
Requirement
Priority
BR-020
Users shall be able to record blockers including category, description, location, urgency and affected activity.
Must
BR-021
AI may suggest a blocker category, urgency and responsible route.
Should
BR-022
An agripreneur shall confirm or correct AI suggestions before routing.
Must
BR-023
Every blocker shall have an owner, status, due date and escalation path.
Must
BR-024
Statuses shall include Open, Acknowledged, In Progress, Resolved, Cannot Resolve and Closed.
Must
BR-025
Overdue blockers shall be escalated to the appropriate programme actor.
Must
BR-026
The farmer or agripreneur shall confirm whether the resolution was effective.
Must
BR-027
Recurring blockers shall be visible in the programme dashboard by type, geography and value chain.
Must
10.4 Input-demand requirements
ID
Requirement
Priority
BR-030
Agripreneurs shall record input type, specification, quantity, location and required date.
Must
BR-031
The solution shall aggregate compatible demand by item, location and time window.
Must
BR-032
Verified suppliers shall view aggregate demand without unnecessary farmer personal data.
Must
BR-033
Suppliers shall submit quantity, price, quality evidence and delivery date.
Must
BR-034
Agripreneurs shall be notified of supplier commitments.
Should
BR-035
Delivery and farmer receipt shall be confirmed before an order is marked fulfilled.
Must
BR-036
Supplier performance shall be measured using delivery, quality and fulfilment evidence.
Should
BR-037
AI should forecast likely input demand and potential shortages.
Could
10.5 Bookkeeping requirements
ID
Requirement
Priority
BR-040
Agripreneurs shall record income, expenses, services, purchases and sales.
Must
BR-041
The solution shall provide monthly revenue, expense and operating cash-flow summaries.
Must
BR-042
The solution should identify missing, duplicate or unusual records for review.
Should
BR-043
AI should categorise transactions and extract structured records from voice notes or receipts.
Could
BR-044
Agripreneurs shall be able to correct AI-generated transaction records before saving.
Must
BR-045
The solution shall distinguish verified, programme-confirmed, self-reported and unavailable evidence.
Must
10.6 Bank-ready credit-profile requirements
ID
Requirement
Priority
BR-050
The solution shall generate an agripreneur finance-readiness profile from consented records.
Must
BR-051
The profile shall display applicant, business, amount requested, purpose, term, data period and evidence quality.
Must
BR-052
The profile shall show revenue, expenses, operating surplus, seasonality and existing obligations.
Must
BR-053
The profile shall show customer activity, order fulfilment, supplier performance and buyer relationships.
Must
BR-054
The profile shall calculate an explainable finance-readiness band.
Must
BR-055
Every readiness factor shall display its source, weight and plain-language explanation.
Must
BR-056
Gender, disability, ethnicity, religion and other protected characteristics shall not be used as credit-readiness factors.
Must
BR-057
The profile shall be labelled as decision support and not a loan approval.
Must
BR-058
A lender shall only view a profile where active purpose-specific consent exists.
Must
BR-059
Profile access and consent changes shall be audited.
Must
BR-060
The profile should include affordability and stress scenarios aligned to the agricultural production cycle.
Should
BR-061
The solution should support supplier-direct disbursement and buyer-linked repayment designs in later integration phases.
Should
10.7 Investor-readiness requirements
ID
Requirement
Priority
BR-070
The solution shall generate an investor opportunity profile from verified business and impact data.
Should
BR-071
The profile shall include growth, margin, customer base, capacity, capital need, use of funds and key risks.
Should
BR-072
The profile shall include youth, women, employment, livelihood and climate-impact indicators where available.
Should
BR-073
AI may generate an investment summary, but every claim shall link to its source data.
Should
BR-074
The solution should identify agripreneurs that could be grouped into a diversified finance portfolio.
Could
BR-075
Portfolio views should show concentration by geography, value chain, supplier, buyer and production risk.
Could
10.8 Market requirements
ID
Requirement
Priority
BR-080
Agripreneurs shall record expected produce, quantity, location, quality and readiness date.
Should
BR-081
Verified buyers shall publish demand, specification, delivery window and terms.
Should
BR-082
The solution shall identify potential matches between supply and buyer demand.
Should
BR-083
The solution shall support aggregation across farmers and agripreneurs.
Should
BR-084
Delivery, acceptance and payment status shall be tracked.
Should
BR-085
AI should identify oversupply, shortfalls, quality risks and likely buyer matches.
Could
10.9 Advisory, climate and risk requirements
ID
Requirement
Priority
BR-090
Agricultural questions shall be routed through an advisory integration interface.
Must
BR-091
Advice shall display source and confidence where available.
Must
BR-092
Low-confidence, high-risk or unsupported questions shall be escalated to a qualified human.
Must
BR-093
The solution shall not invent pesticide, veterinary or dosage instructions.
Must
BR-094
Existing weather, climate and soil services should be integrated instead of recreated.
Should
BR-095
AI should translate general alerts into context-sensitive recommended next actions.
Could
10.10 Programme-intelligence requirements
ID
Requirement
Priority
BR-100
The solution shall maintain one version-controlled KPI dictionary.
Must
BR-101
Programme managers shall filter results by geography, value chain, period, gender and participant type.
Must
BR-102
The solution shall display the funnel from training or intention through fulfilment, adoption and outcome.
Must
BR-103
The dashboard shall show blocker volume, resolution rate and resolution time.
Must
BR-104
The dashboard shall show input demand, supplier commitments and fulfilment.
Must
BR-105
The dashboard shall show finance profiles, consented shares and finance outcomes where available.
Should
BR-106
The dashboard shall calculate cost per meaningful outcome using approved methodology.
Should
BR-107
The solution shall identify missing, conflicting or unusual programme data.
Must
BR-108
KPI tables shall be exportable for approved reporting use.
Should
11. Credit and Investment Readiness Design
11.1 Credit-readiness information domains
The bank-ready profile shall contain:
Applicant and business verification;
EKYAN participation and training evidence;
Twelve-month revenue, cost and cash-flow history;
Customer and order activity;
Supplier and buyer relationships;
Savings and repayment evidence where permitted;
Requested facility and use of funds;
Agricultural cycle and repayment timing;
Operational, market and climate risks;
Data quality and verification status;
Consent, expiry and access history.
11.2 Initial finance-readiness factors
The first pilot should use an explainable rules-based assessment rather than a predictive default model.
Factor
Illustrative maximum weight
Record completeness and consistency
20%
Cash-flow capacity
20%
Revenue stability and growth
15%
Customer diversification
10%
Order-fulfilment reliability
10%
Savings and repayment behaviour
10%
Verified supplier and buyer relationships
10%
Operational risk management
5%
The weights are illustrative and require validation by a regulated lender.
11.3 Readiness bands
Band
Interpretation
0–39
Foundation stage; insufficient evidence or critical gaps
40–59
Building history; may suit small controlled finance with additional evidence
60–79
Finance-ready for formal lender assessment
80–100
Strong documented readiness, still subject to underwriting
11.4 AI use in finance readiness
AI may:
convert voice notes and receipts into draft records;
categorise transactions;
identify incomplete or inconsistent evidence;
forecast cash flow and seasonality;
generate normal and stress scenarios;
explain profile strengths and weaknesses;
produce draft bank and investor summaries;
detect unusual activity for human review;
identify portfolio opportunities.
AI shall not:
approve or decline a loan;
fabricate missing evidence;
use protected characteristics in scoring;
conceal uncertainty;
recommend pricing without a lender-approved methodology;
share data without consent.
11.5 Investor opportunity profile
An investor profile should include:
historic revenue and margin;
growth rate;
customer and farmer network;
production capacity;
verified demand and buyer relationships;
capital sought;
use of funds;
projected scenarios;
jobs and livelihoods supported;
participation of women and youth;
climate and regenerative-agriculture outcomes;
investment risks, mitigations and monitoring plan.
12. AI and Analytics Requirements
12.1 Permitted AI services
voice transcription;
multilingual summarisation;
blocker classification and routing recommendation;
advisory retrieval from approved sources;
transaction categorisation;
receipt and invoice extraction;
demand and supply forecasting;
data-quality analysis;
cash-flow scenario generation;
finance-readiness explanation;
investor memo drafting;
programme performance narration.
12.2 Human-in-the-loop controls
agripreneurs confirm blocker classifications;
users confirm extracted financial records;
extension professionals approve high-risk advice;
lenders perform underwriting;
investors complete due diligence;
programme managers approve external reports;
administrators review data-quality exceptions.
12.3 AI quality requirements
AI output shall show its source or contributing records where applicable.
Low-confidence output shall be clearly identified.
High-risk agricultural advice shall be escalated.
All models and rule sets shall be versioned.
Material decisions shall be reproducible and auditable.
AI performance shall be monitored by language, value chain and user group.
13. Non-Functional Requirements
ID
Requirement
NFR-001
Field logging shall function offline and synchronise safely.
NFR-002
The primary interface shall support low-end Android devices.
NFR-003
Forms shall minimise typing and support large touch targets.
NFR-004
The solution shall meet WCAG 2.1 AA accessibility expectations where technically applicable.
NFR-005
English and Kiswahili shall be supported in the initial prototype.
NFR-006
API and interface performance shall support responsive use under pilot volumes.
NFR-007
Data shall be encrypted in transit and at rest in production.
NFR-008
Access shall be role-based and least-privilege.
NFR-009
High-impact actions and information access shall be audited.
NFR-010
Personal data retention and deletion shall follow approved policy.
NFR-011
The solution shall be modular so that partner integrations can be replaced without rewriting core workflows.
NFR-012
The platform shall distinguish synthetic, self-reported, programme-confirmed and independently verified records.
NFR-013
The architecture shall support configurable counties, countries, value chains and currencies.
NFR-014
The solution shall expose monitoring for sync failures, integration failures and overdue cases.
14. Data, Privacy and Governance
14.1 Data principles
collect the minimum necessary data;
explain why each data item is needed;
record consent and purpose;
restrict access by role and relationship;
allow consent revocation where applicable;
maintain evidence provenance;
retain records only for approved periods;
separate programme operations from lending decisions;
avoid personal data about minors in the MVP;
use synthetic data during prototyping.
14.2 Consent records
A consent record shall include:
participant;
organisation receiving data;
data fields shared;
purpose;
date granted;
expiry date;
revocation date where applicable;
most recent access;
person or channel through which consent was captured.
14.3 Fairness and inclusion
The solution shall:
exclude protected characteristics from credit-readiness scoring;
test whether non-protected factors create unexplained group disparities;
report profile distribution by gender and disability for monitoring, not scoring;
support assisted use and voice capture;
allow context-specific blocker categories such as water, land and time constraints;