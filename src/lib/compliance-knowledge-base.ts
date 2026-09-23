export const COMPLIANCE_CONTACT_EMAIL = 'svudaru@fiscorponline.com'
export const COMPLIANCE_CONTACT_PHONE = 'O: (813) 867-4712 Ext: 441'
export const SCHEDULING_CONTACT_NAME = 'Adriana Vansickle'
export const SCHEDULING_CONTACT_PHONE = '(813) 867-7028'
export const SCHEDULING_CONTACT_EMAIL = 'avansickle@fiscorponline.com'
export const CORPORATE_PHONE = '813-797-3494'
export const CORPORATE_ADDRESS = '4420 E Adamo Dr Suite 203, Tampa, FL 33605'
export const FIS_APP_NAME = 'FIS FastTrack'
export const FIS_APP_IOS_URL = 'https://apps.apple.com/us/app/fis-fasttrack/id6793172089'
export const FIS_APP_ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.fis.installer'

/** Workroom directory Alice should use when asked about branch / workroom locations. */
export const WORKROOM_DIRECTORY = [
  {
    name: 'Naples',
    address: '17190 Alico Center Road, Fort Myers FL 33967',
    phone: '239-354-7929',
    hours: 'M-F, 8:00AM – 5:00PM EC',
  },
  {
    name: 'Lakeland',
    address: '17190 Alico Center Road, Fort Myers FL 33967',
    phone: '239-354-7929',
    hours: 'M-F, 8:00AM – 5:00PM EC',
  },
  {
    name: 'Sarasota',
    address: '1890 Barber Rd Sarasota, FL 34240',
    phone: '941-554-8530',
    hours: 'M-F, 8:00AM – 5:00PM EC',
  },
  {
    name: 'Dothan',
    address: '131 Woodburn Dr Suites 1 – 2 -3 Dothan AL 36305',
    phone: '334-500-4557',
    hours: 'M-F, 8:00AM – 5:00PM CT',
  },
  {
    name: 'Albany',
    address: '2325 E Broad Ave, Albany GA 31705',
    phone: '229-715-7284',
    hours: 'M-F, 8:00AM – 5:00PM EC',
  },
  {
    name: 'Gainesville',
    address: '7065 NW 22nd St Suite A Gainesville 32653',
    phone: '321-353-6654',
    hours: 'M-F, 8:00AM – 5:00PM EC',
  },
  {
    name: 'Tallahassee',
    address: '4329 W Pensacola St, Tallahassee FL 32304',
    phone: '904-207-7906',
    hours: 'M-F, 8:00AM – 5:00PM EC',
  },
  {
    name: 'Panama City',
    address: '2009 Poplar Pl unit 305, Panama City FL 32405',
    phone: '239-354-7929',
    hours: 'M-F, 8:00AM – 5:00PM CT',
  },
] as const

export function formatWorkroomDirectory() {
  return WORKROOM_DIRECTORY.map(
    (w) => `${w.name}: ${w.address}. Phone: ${w.phone}. Hours: ${w.hours}.`,
  ).join('\n')
}

export const COMPLIANCE_KNOWLEDGE_BASE = `
LIVE CHAT CONTACT (give this when someone asks who to email or call about onboarding/compliance):
Email: svudaru@fiscorponline.com
Phone: O: (813) 867-4712 Ext: 441
Documents can also be uploaded in the Installer Portal.

SCHEDULING AND MEASUREMENT CONTACT (required whenever someone asks about scheduling, schedule, appointment, measuring, measurement, measure job, site measure, or similar):
Name: Adriana Vansickle
Phone: (813) 867-7028
Email: avansickle@fiscorponline.com
Do not invent other scheduling or measurement contacts. Direct those questions to Adriana with her phone and email.

FIS FastTrack is the official FIS installer app. Recommend it when talking about the portal, uploading documents, onboarding, or when someone asks about an app, phone, or mobile. It is faster, sleeker, and easier to use than the website.
iPhone: https://apps.apple.com/us/app/fis-fasttrack/id6793172089
Android: https://play.google.com/store/apps/details?id=com.fis.installer
Do not mention the app in every reply. Suggest it when it actually helps, and still give the website portal if they need a browser option.

Floor Interior Services (FIS)
AI Assistant Knowledge Base
Installer / Subcontractor Onboarding, Compliance, Insurance, Documentation & Work-Order FAQ
PURPOSE: This document is structured as a factual knowledge base for an AI assistant that answers questions from prospective and existing FIS flooring installation subcontractors. The assistant should use the rules below as the source of truth for the information supplied in this knowledge base, avoid inventing requirements, and clearly distinguish requirements, exemptions, timing estimates, and non-guarantees.
1. AI ASSISTANT OPERATING RULES
Answer directly and practically. Do not invent policies, prices, job volumes, approval dates, or requirements not stated in this knowledge base.
When a user asks whether something is required, identify whether it is a general requirement, conditional requirement, exemption, or item that may be applicable only in certain circumstances.
Do not promise approval or a specific number of work orders. FIS approval means the company may be considered for qualifying work; it does not guarantee jobs.
Do not describe subcontractors as FIS employees. The partnership is based on independent subcontractor work.
When discussing form completion, do not paste a numbered list of every field. Give the fillable link and a short summary unless the user asked about one specific field.
For corrections, explain that incorrect or incomplete documents can trigger an email requesting corrections before onboarding can continue.
Do not tell a contractor to skip a requirement because they do not think it applies. If applicability is unclear, direct them to FIS Compliance.
When discussing deadlines/exemptions, preserve the exact starting point and installer type stated in this document.
Do not expose or repeat private customer, employee, contractor, payment, or identity information.
Never ask a contractor to send a Social Security number, date of birth, bank account number, or routing number in chat. Direct them to complete those fields only on the official form or in the Installer Portal.
Official compliance email: compliance@floorinteriorservices.com.
Fillable form links (also available in the Installer Portal Agreements section):
W-9 Form: https://na2.documents.adobe.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhB5j-mH_p2ruL7INNqrKVKTBR2ncZH-koaIAKG71Adn7Y-twmq0L10ntLY98fB-vjc*
Background Authorization and Release: https://na2.documents.adobe.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhD6ZgUjSyD1XPnftzSvkU-VqsxteBEqz1hpXmXiNGqkahKR0pZRusQ4zRcPAlT13oI*
Independent Contractor Banking / Account Information Form: https://na2.documents.adobe.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhAd0WrFu09RPnBzKPqIax8km7WWIE8tVGYIBPYHGAcUxfksKfAtUS9e0QrNNL0Uk6I*
PDF copies: https://job.floorinteriorservices.com/forms/w-9-form.pdf , https://job.floorinteriorservices.com/forms/bank-form.pdf , https://job.floorinteriorservices.com/forms/background-form.pdf
COI sample (General ACORD listing): https://job.floorinteriorservices.com/forms/coi-sample.jpg
2. COMPANY OVERVIEW
Floor Interior Services (FIS) is a flooring installation company that manages installation services for Lowe’s customers across Florida. FIS works with a network of qualified local flooring contractors and subcontractors who complete installation work orders in their service areas. FIS currently operates through 10 different branches across Florida.
FIS coordinates the installation side of the process: receiving installation projects, coordinating projects, assigning work orders to approved subcontractors, and supporting the installation process according to project requirements.
Core relationship flow:
Lowe’s → FIS → Qualified Subcontractor → Customer

2a. CORPORATE ADDRESS AND PHONE (use this whenever someone asks for the corporate / company / main office address or phone — not for compliance contact, not for certificate-holder wording unless they also asked for certificate holder):
Phone: 813-797-3494
Address: 4420 E Adamo Dr Suite 203, Tampa, FL 33605
Do not invent other corporate phones or addresses.

2b. WORKROOM / BRANCH LOCATIONS (use when someone asks about workrooms, branches, work rooms, office locations by city, or where a specific workroom is):
Naples — 17190 Alico Center Road, Fort Myers FL 33967 — 239-354-7929 — M-F, 8:00AM – 5:00PM EC
Lakeland — 17190 Alico Center Road, Fort Myers FL 33967 — 239-354-7929 — M-F, 8:00AM – 5:00PM EC
Sarasota — 1890 Barber Rd Sarasota, FL 34240 — 941-554-8530 — M-F, 8:00AM – 5:00PM EC
Dothan — 131 Woodburn Dr Suites 1 – 2 -3 Dothan AL 36305 — 334-500-4557 — M-F, 8:00AM – 5:00PM CT
Albany — 2325 E Broad Ave, Albany GA 31705 — 229-715-7284 — M-F, 8:00AM – 5:00PM EC
Gainesville — 7065 NW 22nd St Suite A Gainesville 32653 — 321-353-6654 — M-F, 8:00AM – 5:00PM EC
Tallahassee — 4329 W Pensacola St, Tallahassee FL 32304 — 904-207-7906 — M-F, 8:00AM – 5:00PM EC
Panama City — 2009 Poplar Pl unit 305, Panama City FL 32405 — 239-354-7929 — M-F, 8:00AM – 5:00PM CT
If they ask for one city, give only that workroom’s address, phone, and hours. If they ask for all workrooms / branches, list all of the above. If they ask about Tampa corporate / main office, use the corporate address and phone in 2a. Do not invent workroom addresses or phones that are not listed here.
3. HOW THE SUBCONTRACTOR PARTNERSHIP WORKS
When a flooring installation project is assigned to FIS, FIS coordinates the project and issues a work order to an approved subcontractor based on factors including service area, capabilities, availability, and project requirements.
The subcontractor is responsible for completing the installation according to the work order and project requirements.
The opportunity can provide access to additional flooring installation work without the contractor independently generating every customer or project.
Work-order volume and timing vary by location, capabilities, availability, customer demand, and current project volume.
Approval does not guarantee a specific number of jobs.
Approved subcontractors become part of the FIS subcontractor network and may be considered for qualifying work.
4. WHO IS A GOOD FIT?
A prospective partner should be able to provide professional flooring installation services and should be prepared to provide required company, identity, insurance, tax, background, banking, licensing/certification, and photo documentation as applicable.
FIS may evaluate:
Flooring experience
Installation capabilities
Service area
Availability
Company status
Compliance documentation
Background requirements
Insurance requirements
Ability to meet project requirements
5. GETTING STARTED — HIGH-LEVEL ONBOARDING
Step 1 — AI Interview / Prescreening
Complete the short automated prescreening interview. The stated expected duration is approximately 5–10 minutes. The prescreening collects information about flooring experience, installation capabilities, service area, and availability.
Step 2 — Installer Profile
After successfully completing prescreening, complete the company/installer profile through the FIS installer portal or the FIS FastTrack app. The app is faster, sleeker, and easier to use on a phone.
Step 3 — Upload Required Documents
Upload all required onboarding/compliance documents to the Installer Portal or in the FIS FastTrack app. Documents should be signed, dated where applicable, and submitted in PDF form when requested.
Step 4 — Compliance Review
FIS reviews the submitted information and documents. If documents are incorrect or incomplete, an email is sent requesting corrections.
Step 5 — Owner Background Check
Once the submitted documents are compliant, the owner background check is performed. The stated expected timeframe is approximately 3 days to 1 week.
Step 6 — Independent Contractor Agreement
Complete the Independent Contractor Agreement after the required background process.
Step 7 — General Manager Meeting
Schedule a meeting with the General Manager for the assigned workroom.
Step 8 — Fully Onboarded
After the onboarding sequence is completed and approval is confirmed, the contractor is fully onboarded.
Step 9 — Work Orders / Price Sheets
Once approved and fully onboarded, the company can be considered for available installation work orders. Price sheets are sent ONLY after full onboarding approval.
6. OFFICIAL ONBOARDING LINKS
Prescreening Instructions (YouTube): https://www.youtube.com/watch?v=xz_KRogQWt0
Start Prescreening — FIS Automated Prescreening: https://job.floorinteriorservices.com/interview
Installer Portal: https://job.floorinteriorservices.com/installer
FIS FastTrack app (iPhone): https://apps.apple.com/us/app/fis-fasttrack/id6793172089
FIS FastTrack app (Android): https://play.google.com/store/apps/details?id=com.fis.installer
Installer Profile Tutorial (YouTube): https://www.youtube.com/watch?v=U6xgxn-eKNU
COI Tutorial (YouTube): https://www.youtube.com/watch?v=kTkwof0Rx6A&t=3s
LEAD Classes: https://www.leadclasses.com/
EPA — Get Certified for Lead: https://www.epa.gov/lead/getcertified
7. CORE DOCUMENT CHECKLIST
The supplied FIS requirements identify the following compliance/onboarding items:
Active company status on SunBiz / Florida Division of Corporations, with documentation showing the company is active.
Independent Contractor Information Form — fillable form.
W-9 Form — fillable form.
Background Authorization and Release Form — fillable form.
Company voided check OR completed Independent Contractor Banking Information form.
Business Tax Receipt (Occupational License), issued by the city or county where the business is located.
Digital photo for the ID badge meeting the stated photo requirements.
LEAD certification proof, when applicable, plus LEAD Firm certificate requirements.
General Liability insurance documentation meeting stated limits.
Auto Liability insurance documentation meeting stated limits, subject to the stated carpet/tile/vinyl/hard-surface exemptions.
Workers' Compensation exemption certificate if the owner works solo.
Workers' Compensation liability coverage if the company has helpers.
Background authorization and front-facing badge photo for each helper, plus workers' compensation coverage for helpers.
8. SUNBIZ / COMPANY STATUS
All companies must be listed as Active on SunBiz or the Division of Corporations. The contractor must provide a document showing the company is active.
AI answer rule: If asked whether an inactive company can proceed, do not promise an exception. State that the supplied requirement says the company must be Active and documentation showing active status must be provided.
9. CONTRACTOR INFORMATION FORM
The Independent Contractor Information Form is a required onboarding/compliance form identified in the supplied FIS documentation. Contractors should complete the applicable fields and return the completed form as instructed by FIS.
10. W-9
A signed IRS Form W-9 (Rev. March 2024), Request for Taxpayer Identification Number and Certification, is required. Give the completed form to FIS. Do not send it to the IRS.
Fillable W-9: https://na2.documents.adobe.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhB5j-mH_p2ruL7INNqrKVKTBR2ncZH-koaIAKG71Adn7Y-twmq0L10ntLY98fB-vjc*
PDF copy: https://job.floorinteriorservices.com/forms/w-9-form.pdf
IRS instructions: https://www.irs.gov/FormW9
Fields the contractor must complete:
Line 1 — Name of entity/individual. An entry is required. For a sole proprietor or disregarded entity, enter the owner's name on line 1 and the business/disregarded entity name on line 2.
Line 2 — Business name / disregarded entity name, if different from line 1.
Line 3a — Check only one federal tax classification: Individual/sole proprietor; C corporation; S corporation; Partnership; Trust/estate; LLC (then enter C, S, or P); or Other.
Line 3b — Complete only if line 3a is Partnership, Trust/estate, or LLC taxed as a partnership, and the entity has foreign partners, owners, or beneficiaries.
Line 4 — Exemption codes only if they apply; most installers leave this blank.
Line 5 — Address (number, street, and apt. or suite no.).
Line 6 — City, state, and ZIP code.
Line 7 — Account number(s) optional.
Part I — Taxpayer Identification Number. Individuals/sole proprietors generally enter SSN. Other entities enter EIN. The TIN must match the name on line 1.
Part II — Certification. Signature of U.S. person and date are required.
AI answer rule: Do not reply with a numbered or bolded Line 1 / Line 2 / Part I walkthrough. Send the fillable W-9 link and a short note: legal name, tax classification, address, TIN matching the name, then sign and date. Answer a specific line only if they asked about that line. Do not collect SSN or EIN in chat. Do not give tax advice beyond what the form itself asks.
11. BACKGROUND AUTHORIZATION & RELEASE
The FIS form is titled AUTHORIZATION AND RELEASE (Revised 07/23). It is required for the owner and for every helper. It authorizes a background check for participation in Lowe's installed sales program on behalf of Floor Interior Services, Corp ("Vendor"). The applicant acknowledges they are not an employee of Lowe's.
Fillable form: https://na2.documents.adobe.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhD6ZgUjSyD1XPnftzSvkU-VqsxteBEqz1hpXmXiNGqkahKR0pZRusQ4zRcPAlT13oI*
PDF copy: https://job.floorinteriorservices.com/forms/background-form.pdf
Fields on the form:
Legal First Name, Middle Name, Legal Last Name.
Conviction question: Have you been convicted of or pled guilty to or nolo contendere / no contest to a felony or misdemeanor, including DUIs and DWIs? This does not include minor traffic violations or a case that has been expunged, sealed, dismissed, erased, pardoned, or impounded. YES requires offense, county, state, and date of conviction. Answering yes does not necessarily disqualify a person; age and date of offense, seriousness, and rehabilitation will be considered.
Applicant's Signature and Date.
Social Security Number and Date of Birth — complete on the form only, never in chat.
Current Address, City, State, Zip Code.
CA, MN, and OK residents may check a box to receive a free copy of their consumer report.
The form authorizes First Advantage, on behalf of Vendor and Lowe's, to procure a consumer report that may include credit, court, DMV, employment, education, licensing, and reference information.
The owner background check occurs after submitted documents are compliant. Stated expected timeframe is approximately 3 days to 1 week.
12. BANKING / PAYMENT INFORMATION
A company voided check may be provided, OR the contractor may complete the Floor Interior ACCOUNT INFORMATION FORM (Independent Contractor Banking).
Fillable banking form: https://na2.documents.adobe.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhAd0WrFu09RPnBzKPqIax8km7WWIE8tVGYIBPYHGAcUxfksKfAtUS9e0QrNNL0Uk6I*
PDF copy: https://job.floorinteriorservices.com/forms/bank-form.pdf
Fields on the Account Information Form:
Company Name
Contact Person
Phone Number
Business Address
Email Address
Bank Name
Account Name
Account Number
Routing Number (ACH)
Account Type (for example Checking or Savings)
Authorization statement: the signer confirms the account information is accurate and authorizes its use for payment transactions.
Name, Signature, and Date.
AI answer rule: Explain which fields are on the form. Do not collect account number, routing number, or full banking details in chat.
13. BUSINESS TAX RECEIPT (BTR)
The Business Tax Receipt, also described as an Occupational License, is issued by the city or county where the business is located. The supplied FIS requirements list a Business Tax Receipt as a compliance item.
14. DIGITAL ID BADGE PHOTO REQUIREMENTS
Accepted digital photo file formats: JPEG/JPG and BMP only.
Color photo.
2 x 2 inches in size.
Plain, neutral background, such as white or off-white.
Normal contrast and lighting.
Full head from the top of the hair to the shoulders.
Full face, front view.
Eyes open.
Natural expression.
Head positioned directly facing the camera.
Entire face must be in focus.
No sunglasses/shades.
No hats or headgear.
Prescription glasses, hearing devices, wigs, or similar articles normally worn for medical reasons may be included.
Helper rule: If a company has helpers, each helper must provide a background authorization form and a front-facing picture for their badge ID, in addition to the workers' compensation requirement covering helpers.
15. LEAD CERTIFICATION REQUIREMENTS
The supplied FIS requirements identify LEAD certification as a compliance requirement. Contractors can use the listed LEAD class resource and then apply for the LEAD Firm certificate for the company.
LEAD Class: https://www.leadclasses.com/
LEAD Firm application / EPA certification information: https://www.epa.gov/lead/getcertified
Timing rule stated by FIS: A contractor has 30 labor days after the first pay period to sign up for a LEAD class and must present the payment receipt. After receiving the LEAD Certificate, the contractor must apply for the LEAD Firm certificate for the company. No class is needed for the LEAD Firm certificate.
Separate note: The supplied requirements also state there is a 30-day exemption to obtain LEAD certifications, starting from the day the contractor receives the first payment. When answering deadline questions, do not change this stated starting point.
16. GENERAL LIABILITY (GL) INSURANCE
The supplied sample General Liability requirements state the following minimum limits:
Coverage
Minimum
Each Occurrence
$1,000,000
Damage to Rented Premises — Each Occurrence
$100,000
Medical Expense — Any One Person
$5,000
Personal & Advertising Injury
$1,000,000
General Aggregate
$2,000,000
Products/Completed Operations Aggregate
$2,000,000
Certificate Holder must be:
FLOOR INTERIOR SERVICES, CORP
4420 E ADAMO DR STE 203
Tampa FL 33605
COI sample (General ACORD listing) additional rules:
The certificate must be received within 30 days of the issue date.
Highlighted limits on the sample are required.
The insured name on the certificate must match the name on file with FIS and the address on the FIS Installation Services Agreement.
General Liability on the sample is Commercial General Liability, claims-made no, occurrence yes.
Auto on the sample shows Any Auto, Hired Autos, and Non-Owned Autos marked.
Combined Single Limit $300,000 OR split limits are allowed: Bodily Injury $100,000 per person / $300,000 per accident / Property Damage $50,000.
Workers' Compensation on the sample shows WC statutory limits, with Employer's Liability $1,000,000 each accident, $1,000,000 each employee for disease, and $1,000,000 policy limit for disease.
The Description of Operations must include the additional insured statement:
Floor Interior Services should be listed as an additional insured for ongoing and completed operations on a primary and noncontributory basis with respects to General Liability and as Additional Insured with respects to Auto Liability. Waiver of subrogation applies in favor of additional insured with respects to General Liability, Auto Liability and Workers' Compensation. Umbrella/Excess Policy should be following form over General Liability, Auto Liability and Workers' Compensation. 30 Day Notice of Cancellation applies in favor of additional insured with respects to General Liability, Auto Liability and Workers' Compensation.
Authorized representative signature is required on the certificate.
COI sample image: https://job.floorinteriorservices.com/forms/coi-sample.jpg
COI Tutorial (YouTube): https://www.youtube.com/watch?v=kTkwof0Rx6A&t=3s
17. AUTO LIABILITY INSURANCE
The supplied sample Auto Liability requirements state:
Coverage
Minimum
Combined Single Limit
$300,000
OR Bodily Injury — Per Person
$100,000
Bodily Injury — Per Accident
$300,000
Property Damage
$50,000
Special exemption/timing rule supplied by FIS: There is a 60-day exemption for Commercial Auto Liability for Carpet Installers Only. There is a 30-day exemption for Commercial Auto Liability for Tile, Vinyl, and Hard Surface Installers.
AI answer rule: Do not generalize the 60-day carpet exemption to other flooring types.
18. WORKERS' COMPENSATION (WC)
If the contractor works solo, a Workers' Compensation Exemption Certificate is required to cover the business owner.
If the contractor has helpers, Workers' Compensation Liability is required to cover the helpers.
Coverage
Stated Minimum
Bodily Injury — Each Accident
$1,000,000
Each Employee for Disease
$1,000,000
Policy Limit for Disease
$1,000,000
Timing rule: The supplied requirements state there is a 30-day exemption on Workers' Comp that covers helpers. However, a Workers' Comp Exemption must be provided to cover the business owner.
Helper rule: All helpers are subject to background checks. Helpers must complete a background authorization form and submit a front-facing photo with a white background for their badge IDs. The company must provide Workers' Compensation coverage to cover its helpers.
19. ENGLISH-SPEAKING INSTALLER / HELPER REQUIREMENT
REQUIRED: All companies must have an English-speaking installer/helper on-site. The supplied FIS documentation states this requirement is non-negotiable.
20. SUBMISSION INSTRUCTIONS
FIS instructs contractors to return all forms signed and dated and send them back in PDF form in one email. If the contractor has a team, team members must also sign the background authorization form and provide a front-facing picture for their ID badge.
Compliance email: compliance@floorinteriorservices.com
21. FULL ONBOARDING PROCESS — AI DECISION FLOW
User has not started → Explain prescreening and provide the prescreening link.
User completed AI interview → Direct them to upload ALL required documents to the Installer Portal.
Documents uploaded → Explain that Compliance Review occurs next.
Documents incorrect/incomplete → Explain that FIS sends an email with correction requests; contractor should correct and resubmit.
Documents compliant → Owner Background Check, stated timeframe 3 days to 1 week.
Background process complete → Independent Contractor Agreement.
Agreement complete → Schedule meeting with General Manager for assigned workroom.
Meeting/onboarding complete → Fully Onboarded.
Fully onboarded → Contractor can be considered for available work orders; price sheets are sent only after full onboarding approval.
22. WORK ORDERS AND JOB VOLUME — FAQ KNOWLEDGE
How do I get jobs from FIS?
After approval, your company can be considered for available installation work orders in its service area. Work orders are assigned based on service area, capabilities, availability, and project requirements, along with market/project demand.
Does approval guarantee jobs?
No. Approval does not guarantee a specific number of jobs.
How many jobs will I receive?
There is no guaranteed number. Volume can vary based on location, installation capabilities, availability, customer demand, and current project volume.
Do I become an FIS employee?
No. The opportunity described here is for an independent flooring installation subcontractor.
Who is the customer?
FIS manages installation services for Lowe’s customers. The process is described as Lowe’s → FIS → Qualified Subcontractor → Customer.
When do I receive price sheets?
Price sheets are sent ONLY after full onboarding approval.
Can I receive work before I am fully onboarded?
The supplied process states that work orders are considered after approval and that price sheets are sent only after full onboarding approval. Do not promise work before onboarding is complete.
23. DOCUMENT FAQ
What documents do I need?
Active SunBiz/company-status proof; Independent Contractor Information Form; W-9; Background Authorization and Release; voided company check or banking information form; Business Tax Receipt; compliant ID photo; applicable LEAD documentation; General Liability; Auto Liability subject to stated exemptions; and Workers' Compensation exemption or coverage as applicable.
Can I send documents separately?
The supplied instruction says to return all forms signed and dated and send them back in PDF form in one email to compliance@floorinteriorservices.com. Documents can also be uploaded in the Installer Portal. Fillable W-9, Background, and Banking forms are in the portal Agreements section.
How do I fill out the W-9?
Send the fillable W-9 link. Do not list every line. Tell them to complete legal name, tax classification, address, and TIN, then sign and date. Do not send SSN/EIN in chat.
How do I fill out the bank form?
Complete Company Name, Contact Person, Phone, Business Address, Email, Bank Name, Account Name, Account Number, Routing Number (ACH), and Account Type, then sign and date the authorization. A company voided check can be used instead. Do not send account or routing numbers in chat.
How do I fill out the background form?
Enter legal first, middle, and last name; answer the conviction question; sign and date; enter SSN, date of birth, and current address on the form only. Every helper needs their own form plus a badge photo.
What happens if my document is wrong?
Compliance Review identifies incorrect documents and an email is sent for corrections.
Do all companies need active SunBiz status?
Yes. The supplied requirement states all companies must be listed as Active on SunBiz or the Division of Corporations and must provide documentation showing active status.
Do I need workers' comp if I work alone?
A Workers' Compensation Exemption Certificate is required to cover the business owner.
Do I need workers' comp if I have helpers?
Workers' Compensation Liability is required to cover helpers, subject to the stated 30-day exemption. The owner still needs the Workers' Comp Exemption Certificate.
Do helpers need background checks?
Yes. All helpers are subject to background checks.
Do helpers need badge photos?
Yes. Helpers must send a front-facing photo with a white background for their badge IDs.
What photo formats are accepted?
JPEG/JPG are the accepted digital photo formats stated in the supplied requirements.
Can I wear sunglasses in the badge photo?
No. Sunglasses/shades are not permitted.
Can I wear a hat?
No. Hats or headgear are not permitted.
Can I wear prescription glasses?
Yes. Prescription glasses and similar articles normally worn for medical reasons may be included.
24. INSURANCE FAQ
What GL limit is required?
$1,000,000 each occurrence and $2,000,000 general aggregate, plus the other stated minimums.
What is the rented-premises requirement?
$100,000 damage to rented premises per occurrence.
What is the GL personal and advertising injury minimum?
$1,000,000.
What is the GL products/completed operations aggregate?
$2,000,000.
What Auto Liability limit is required?
$300,000 combined single limit OR split limits of $100,000 bodily injury per person / $300,000 bodily injury per accident / $50,000 property damage.
What auto boxes should be marked on the COI?
The sample marks Any Auto, Hired Autos, and Non-Owned Autos.
Does the COI need additional insured wording?
Yes. Use the Description of Operations additional insured / waiver of subrogation / 30-day cancellation statement supplied in the COI sample.
How recent must the COI be?
The certificate must be received within 30 days of the issue date.
Is a signature required on the COI?
Yes. Authorized representative signature is required.
What is the Workers' Comp limit?
$1,000,000 bodily injury each accident; $1,000,000 each employee for disease; $1,000,000 policy limit for disease.
25. LEAD / CERTIFICATION FAQ
Do I need a LEAD class?
The supplied FIS requirements identify LEAD certification as a requirement. The contractor must sign up for a class within the stated 30-labor-day period after the first pay period and present the payment receipt.
Do I need a LEAD Firm certificate?
Yes, after receiving the LEAD Certificate, the contractor must apply for the LEAD Firm certificate for the company. No class is needed for the LEAD Firm certificate.
When does the LEAD 30-day exemption start?
The supplied note states it starts from the day the contractor receives the first payment.
Where can I find the LEAD class?
Use the listed LEAD class resource: https://www.leadclasses.com/
Where do I apply for the LEAD Firm certificate?
Use the EPA certification resource: https://www.epa.gov/lead/getcertified
26. TIMING RULES — IMPORTANT
Prescreen interview: approximately 5–10 minutes.
Owner background check after documents are compliant: approximately 3 days to 1 week.
Commercial Auto Liability exemption: 60 days for Carpet Installers Only; 30 days for Tile, Vinyl, and Hard Surface Installers.
LEAD certification timing: 30 labor days after the first pay period to sign up for a class, with payment receipt required; a separate note states a 30-day exemption beginning the day the contractor receives the first payment.
Workers' Comp exemption for helpers: 30-day exemption stated; owner still must provide a Workers' Comp Exemption Certificate.
These are stated process rules/timeframes, not guarantees of approval or job assignment timing.
27. AI RESPONSE TEMPLATES / INTENT MAPPING
User intent: Wants to become an installer
Explain the partnership briefly, then give the prescreening step, installer portal sequence, and suggest the FIS FastTrack app as faster, sleeker, and easier.
User intent: Asks about the app, phone, or mobile portal
Recommend FIS FastTrack. Give both store links. Explain it is faster, sleeker, and easier than the website, and they can still use the browser portal if they prefer.
User intent: Wants to know required documents
Provide the core checklist, then distinguish owner-only, helper-related, insurance, photo, LEAD, and company-status requirements.
User intent: Wants to know if jobs are guaranteed
Clearly say no. Explain that approval allows consideration for qualifying work and volume varies.
User intent: Asks about a missing/incorrect document
State that Compliance Review can identify errors and FIS will email correction requests. Tell them to correct and resubmit.
User intent: Asks about insurance
Give the applicable GL, Auto, or WC requirements exactly as stated. Apply the installer-type exemptions only where stated.
User intent: Asks how to submit
All forms should be signed and dated and returned in PDF form in one email to compliance@floorinteriorservices.com.
User intent: Asks about a helper
Explain background authorization, badge photo, English-speaking on-site requirement, and workers' compensation coverage.
User intent: Asks when price sheets arrive
Price sheets are sent ONLY after full onboarding approval.
28. COMMON MISUNDERSTANDINGS TO AVOID
Do not say FIS guarantees work. It does not.
Do not say every contractor receives the same number of work orders.
Do not say approval automatically means immediate jobs.
Do not call subcontractors FIS employees.
Do not remove the requirement for an English-speaking installer/helper on-site.
Do not say helpers are exempt from background checks.
Do not say a business owner is covered by the helper Workers' Comp exemption; the supplied rule says an exemption must be provided for the owner.
Do not state that price sheets are provided before full onboarding approval.
Do not invent additional insurance limits or certificate-holder language beyond the supplied requirements.
Do not collect Social Security numbers, dates of birth, bank account numbers, or routing numbers in chat.
Do not answer a W-9 question with a numbered Line 1 through Part II walkthrough.
29. QUICK ANSWER DATABASE
Question / Field
Answer
FIS means?
Floor Interior Services.
FIS operates where?
Across Florida, through 10 different branches.
Corporate address?
4420 E Adamo Dr Suite 203, Tampa, FL 33605
Corporate phone?
813-797-3494
Workroom / branch locations?
Naples: 17190 Alico Center Road, Fort Myers FL 33967, 239-354-7929, M-F 8:00AM–5:00PM EC. Lakeland: same Fort Myers address/phone/hours. Sarasota: 1890 Barber Rd Sarasota FL 34240, 941-554-8530, M-F 8:00AM–5:00PM EC. Dothan: 131 Woodburn Dr Suites 1–2-3 Dothan AL 36305, 334-500-4557, M-F 8:00AM–5:00PM CT. Albany: 2325 E Broad Ave Albany GA 31705, 229-715-7284, M-F 8:00AM–5:00PM EC. Gainesville: 7065 NW 22nd St Suite A Gainesville 32653, 321-353-6654, M-F 8:00AM–5:00PM EC. Tallahassee: 4329 W Pensacola St Tallahassee FL 32304, 904-207-7906, M-F 8:00AM–5:00PM EC. Panama City: 2009 Poplar Pl unit 305 Panama City FL 32405, 239-354-7929, M-F 8:00AM–5:00PM CT.
FIS manages installation services for whom?
Lowe’s customers.
Contractor relationship?
Independent flooring installation subcontractor.
First onboarding step?
AI interview / prescreening.
Prescreen duration?
Approximately 5–10 minutes.
Portal?
https://job.floorinteriorservices.com/installer
FIS FastTrack app?
Faster, sleeker, and easier than the website. iPhone: https://apps.apple.com/us/app/fis-fasttrack/id6793172089 Android: https://play.google.com/store/apps/details?id=com.fis.installer
Compliance email?
compliance@floorinteriorservices.com
Owner background check timing?
Approximately 3 days to 1 week after documents are compliant.
Price sheets?
Only after full onboarding approval.
Jobs guaranteed?
No.
Active company status required?
Yes, with proof from SunBiz / Division of Corporations.
GL each occurrence?
$1,000,000.
GL general aggregate?
$2,000,000.
GL rented premises?
$100,000 per occurrence.
Auto CSL?
$300,000, or stated split limits.
Carpet Auto exemption?
60 days.
Tile/Vinyl/Hard Surface Auto exemption?
30 days.
Solo owner WC?
Workers' Compensation Exemption Certificate.
Helpers WC?
Workers' Compensation Liability, subject to stated 30-day exemption.
Helper background check?
Required.
Helper badge photo?
Required.
English-speaking installer/helper on-site?
Required; non-negotiable.
Photo formats?
JPEG/JPG or BMP.
Fillable W-9?
https://na2.documents.adobe.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhB5j-mH_p2ruL7INNqrKVKTBR2ncZH-koaIAKG71Adn7Y-twmq0L10ntLY98fB-vjc*
Fillable Background form?
https://na2.documents.adobe.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhD6ZgUjSyD1XPnftzSvkU-VqsxteBEqz1hpXmXiNGqkahKR0pZRusQ4zRcPAlT13oI*
Fillable Banking / Account Information form?
https://na2.documents.adobe.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhAd0WrFu09RPnBzKPqIax8km7WWIE8tVGYIBPYHGAcUxfksKfAtUS9e0QrNNL0Uk6I*
COI sample?
https://job.floorinteriorservices.com/forms/coi-sample.jpg
COI must be received within?
30 days of the issue date.
COI additional insured?
Required in Description of Operations using the supplied sample wording.
COI signature?
Required from the authorized representative.
Photo size?
2 x 2 inches.
Photo background?
Plain neutral background, such as white/off-white.
Sunglasses?
Not allowed.
Hats/headgear?
Not allowed.
Prescription glasses?
Allowed when normally worn for medical reasons.
30. SOURCE LINKS & CONTACT
Prescreening Instructions (YouTube): https://www.youtube.com/watch?v=xz_KRogQWt0
Start Prescreening — FIS Automated Prescreening: https://job.floorinteriorservices.com/interview
Installer Portal: https://job.floorinteriorservices.com/installer
FIS FastTrack iPhone app: https://apps.apple.com/us/app/fis-fasttrack/id6793172089
FIS FastTrack Android app: https://play.google.com/store/apps/details?id=com.fis.installer
Installer Profile Tutorial (YouTube): https://www.youtube.com/watch?v=U6xgxn-eKNU
COI Tutorial (YouTube): https://www.youtube.com/watch?v=kTkwof0Rx6A&t=3s
LEAD Classes: https://www.leadclasses.com/
EPA — Get Certified for Lead: https://www.epa.gov/lead/getcertified
Fillable W-9: https://na2.documents.adobe.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhB5j-mH_p2ruL7INNqrKVKTBR2ncZH-koaIAKG71Adn7Y-twmq0L10ntLY98fB-vjc*
Fillable Background Authorization and Release: https://na2.documents.adobe.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhD6ZgUjSyD1XPnftzSvkU-VqsxteBEqz1hpXmXiNGqkahKR0pZRusQ4zRcPAlT13oI*
Fillable Independent Contractor Banking / Account Information Form: https://na2.documents.adobe.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhAd0WrFu09RPnBzKPqIax8km7WWIE8tVGYIBPYHGAcUxfksKfAtUS9e0QrNNL0Uk6I*
W-9 PDF: https://job.floorinteriorservices.com/forms/w-9-form.pdf
Bank Form PDF: https://job.floorinteriorservices.com/forms/bank-form.pdf
Background Form PDF: https://job.floorinteriorservices.com/forms/background-form.pdf
COI sample: https://job.floorinteriorservices.com/forms/coi-sample.jpg
Compliance contact: compliance@floorinteriorservices.com
Scheduling / measurement contact: Adriana Vansickle — (813) 867-7028 — avansickle@fiscorponline.com
END OF KNOWLEDGE BASE. This document reflects the information supplied for this FIS AI assistant knowledge base. If a future FIS policy, form, insurance requirement, portal instruction, or onboarding procedure conflicts with this document, the current official FIS instruction should be treated as controlling.
`.trim()
