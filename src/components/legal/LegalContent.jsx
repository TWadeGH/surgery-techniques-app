/**
 * Legal page content components for Terms, Privacy, About, Contact, Sponsorship, Copyright.
 * Rendered inside LegalModal.
 */

import React from 'react';

const proseClass = 'prose prose-sm dark:prose-invert max-w-none px-6 py-4 text-gray-700 dark:text-gray-300';
const sectionClass = 'mb-6';
const h2Class = 'text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2';
const pClass = 'mb-3 leading-relaxed';
const ulClass = 'list-disc pl-6 mb-3 space-y-1';

/** TWH Systems, LLC – Terms and Conditions (final version) */
export function TermsContent() {
  return (
    <div className={proseClass}>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">TWH SYSTEMS, LLC</h1>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">TERMS AND CONDITIONS</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Last Updated: January 18, 2026</p>
      <p className={pClass}>
        These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of the Surgery Techniques mobile application, website, and any related services (collectively, the &quot;Services&quot;) provided by TWH Systems, LLC, a Texas limited liability company (&quot;TWH Systems,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
      </p>
      <p className={`${pClass} font-semibold text-gray-900 dark:text-white`}>
        IMPORTANT NOTICE: BY CLICKING &quot;I ACCEPT,&quot; REGISTERING FOR AN ACCOUNT, OR ACCESSING OR USING THE SERVICES IN ANY MANNER, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE LEGALLY BOUND BY THESE TERMS. IF YOU DO NOT AGREE, DO NOT ACCESS OR USE THE SERVICES.
      </p>

      <section className={sectionClass}>
        <h2 className={h2Class}>1. ELIGIBILITY; PROFESSIONAL AND EDUCATIONAL USE ONLY</h2>
        <h3 className="font-medium text-gray-900 dark:text-white mt-2 mb-1">1.1 Permitted Users</h3>
        <p className={pClass}>The Services are intended solely for professional and educational use by the following categories of users (collectively, &quot;Users&quot;):</p>
        <ul className={ulClass}>
          <li>Licensed healthcare professionals</li>
          <li>Medical students, residents, fellows, and other trainees</li>
          <li>Employees, contractors, and affiliates of medical device, pharmaceutical, biotechnology, healthcare technology, and life sciences companies</li>
          <li>Other individuals accessing the Services in a professional, academic, research, or industry capacity</li>
        </ul>
        <h3 className="font-medium text-gray-900 dark:text-white mt-2 mb-1">1.2 No Patient or Consumer Use</h3>
        <p className={pClass}>The Services are not intended for patients or members of the general public. Use of the Services for personal medical decision-making, diagnosis, or treatment is strictly prohibited.</p>
        <h3 className="font-medium text-gray-900 dark:text-white mt-2 mb-1">1.3 User Representations</h3>
        <p className={pClass}>By accessing or using the Services, you represent and warrant that:</p>
        <ul className={ulClass}>
          <li>You are using the Services solely in a professional, educational, academic, or industry capacity</li>
          <li>You will not rely on the Services for personal medical care or patient-specific medical advice</li>
        </ul>
        <p className={pClass}>TWH Systems reserves the right to restrict, suspend, or terminate access if it reasonably determines that the Services are being misused or accessed in violation of these Terms.</p>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>2. NO MEDICAL ADVICE; NO PRACTICE OF MEDICINE</h2>
        <p className={`${pClass} font-medium`}>THIS SECTION IS A FUNDAMENTAL CONDITION OF USE.</p>
        <h3 className="font-medium text-gray-900 dark:text-white mt-2 mb-1">2.1 Educational and Informational Reference Only</h3>
        <p className={pClass}>All content made available through the Services—including links to surgical videos, techniques, articles, PDFs, and other materials (&quot;Content&quot;)—is provided for general educational and informational purposes only. The Services:</p>
        <ul className={ulClass}>
          <li>Do not provide medical, surgical, diagnostic, or treatment advice</li>
          <li>Do not recommend specific procedures, implants, devices, or techniques</li>
          <li>Do not establish, define, or imply the applicable standard of care</li>
        </ul>
        <h3 className="font-medium text-gray-900 dark:text-white mt-2 mb-1">2.2 Use by Non-Clinicians</h3>
        <p className={pClass}>If you are not a licensed healthcare professional, you expressly acknowledge and agree that:</p>
        <ul className={ulClass}>
          <li>The Content is not intended to train, certify, or qualify you to perform medical or surgical procedures</li>
          <li>You may not use the Services to engage in, assist with, or represent the practice of medicine or clinical care</li>
        </ul>
        <h3 className="font-medium text-gray-900 dark:text-white mt-2 mb-1">2.3 Independent Professional Judgment</h3>
        <p className={pClass}>Licensed healthcare professionals acknowledge and agree that:</p>
        <ul className={ulClass}>
          <li>All clinical decisions and patient care remain solely their responsibility</li>
          <li>They must rely on their own training, experience, institutional policies, and manufacturer instructions for use (&quot;IFUs&quot;)</li>
          <li>Any reliance on Content is entirely at their own risk</li>
        </ul>
        <h3 className="font-medium text-gray-900 dark:text-white mt-2 mb-1">2.4 Intervening Cause</h3>
        <p className={pClass}>Any clinical decision, action, or omission by a User constitutes an independent, superseding, and intervening act, severing any causal connection between the Services and patient outcomes.</p>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>3. USER ACCOUNTS; DATA ENTRY; UPCOMING CASES</h2>
        <p className={pClass}>Certain features of the Services require account registration.</p>
        <h3 className="font-medium text-gray-900 dark:text-white mt-2 mb-1">3.1 Data Entry Restrictions</h3>
        <p className={pClass}>You agree that you will not:</p>
        <ul className={ulClass}>
          <li>Enter patient names, identifiers, or Protected Health Information (&quot;PHI&quot;)</li>
          <li>Use the Services to store, transmit, or process patient records</li>
        </ul>
        <p className={pClass}>Entries are limited to generalized procedure types, dates, and non-identifiable metadata.</p>
        <h3 className="font-medium text-gray-900 dark:text-white mt-2 mb-1">3.2 Account Security</h3>
        <p className={pClass}>You are responsible for safeguarding your account credentials and device. TWH Systems is not responsible for unauthorized access resulting from your failure to maintain security.</p>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>4. THIRD-PARTY CONTENT; CURATION; INTELLECTUAL PROPERTY</h2>
        <h3 className="font-medium text-gray-900 dark:text-white mt-2 mb-1">4.1 Third-Party Content</h3>
        <p className={pClass}>The Services primarily provide links to third-party content hosted on external platforms. TWH Systems does not own, host, control, or modify such content and makes no representations regarding its accuracy, completeness, legality, or availability.</p>
        <h3 className="font-medium text-gray-900 dark:text-white mt-2 mb-1">4.2 User Curation</h3>
        <p className={pClass}>To the extent Users curate, organize, or recommend third-party materials:</p>
        <ul className={ulClass}>
          <li>You represent that such activity does not knowingly infringe any third-party rights</li>
          <li>You grant TWH Systems a non-exclusive, royalty-free, worldwide license to display such curated links within the Services</li>
        </ul>
        <h3 className="font-medium text-gray-900 dark:text-white mt-2 mb-1">4.3 Copyright Complaints</h3>
        <p className={pClass}>TWH Systems respects intellectual property rights. Copyright holders may submit takedown requests to legal@surgicaltechniques.app. Upon receipt of a valid notice, TWH Systems will review and, where appropriate, remove the referenced link.</p>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>5. SPONSORED CONTENT; INDUSTRY PARTICIPATION; ANALYTICS</h2>
        <h3 className="font-medium text-gray-900 dark:text-white mt-2 mb-1">5.1 Sponsored Placements</h3>
        <p className={pClass}>The Services may display clearly labeled sponsored placements from medical device manufacturers, pharmaceutical companies, or other industry participants. Sponsorship does not constitute endorsement. TWH Systems makes no representations or warranties regarding the safety, effectiveness, or performance of any product, implant, device, or technique.</p>
        <h3 className="font-medium text-gray-900 dark:text-white mt-2 mb-1">5.2 Analytics and Data Use</h3>
        <p className={pClass}>By using the Services, you grant TWH Systems the right to:</p>
        <ul className={ulClass}>
          <li>Collect usage data relating to interaction with the Services</li>
          <li>De-identify, anonymize, and aggregate such data</li>
          <li>Use and disclose aggregated, anonymized data for analytics, research, commercial, and product development purposes</li>
        </ul>
        <p className={pClass}>TWH Systems does not sell personally identifiable information. Individual user behavior is not disclosed to sponsors or other third parties.</p>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>6. DISCLAIMER OF WARRANTIES</h2>
        <p className={pClass}>THE SERVICES AND ALL CONTENT ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; TO THE MAXIMUM EXTENT PERMITTED BY LAW, TWH SYSTEMS DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ACCURACY.</p>
        <p className={pClass}>TWH SYSTEMS DOES NOT WARRANT THAT ANY CONTENT IS CURRENT, COMPLETE, ERROR-FREE, OR APPROPRIATE FOR ANY PARTICULAR USER, PATIENT, PROCEDURE, OR ANATOMY.</p>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>7. LIMITATION OF LIABILITY</h2>
        <p className={`${pClass} font-medium`}>THIS SECTION SUBSTANTIALLY LIMITS YOUR RIGHTS.</p>
        <p className={pClass}>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</p>
        <ul className={ulClass}>
          <li>TWH SYSTEMS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES</li>
          <li>INCLUDING, WITHOUT LIMITATION, CLAIMS ARISING FROM CLINICAL USE, PATIENT OUTCOMES, PROFESSIONAL RELIANCE, OR BUSINESS DECISIONS</li>
        </ul>
        <p className={pClass}>IN ALL CASES, TWH SYSTEMS&apos; TOTAL AGGREGATE LIABILITY SHALL NOT EXCEED ONE HUNDRED U.S. DOLLARS (USD $100.00).</p>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>8. INDEMNIFICATION</h2>
        <p className={pClass}>You agree to defend, indemnify, and hold harmless TWH Systems, its members, officers, employees, contractors, and affiliates from and against any claims, damages, liabilities, losses, or expenses (including reasonable attorneys&apos; fees) arising out of or related to:</p>
        <ul className={ulClass}>
          <li>Your use or misuse of the Services</li>
          <li>Any clinical, professional, academic, or business decisions you make</li>
          <li>Your breach of these Terms</li>
          <li>Any violation of applicable law or third-party rights</li>
        </ul>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>9. GOVERNING LAW; VENUE</h2>
        <p className={pClass}>These Terms are governed by the laws of the State of Texas, without regard to conflict-of-laws principles.</p>
        <p className={pClass}>Any dispute arising out of or relating to these Terms or the Services shall be brought exclusively in the state or federal courts located in Harris County, Texas, and you consent to personal jurisdiction and venue therein.</p>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>10. TERMINATION; MODIFICATIONS</h2>
        <p className={pClass}>TWH Systems may suspend or terminate access to the Services at any time for misuse, misrepresentation, or legal risk.</p>
        <p className={pClass}>TWH Systems may modify these Terms at any time. Continued access to or use of the Services after changes become effective constitutes acceptance of the modified Terms.</p>
      </section>
    </div>
  );
}

/** Privacy Policy – TWH Systems, LLC (Copy/Paste Ready) */
export function PrivacyContent() {
  return (
    <div className={proseClass}>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Privacy Policy – TWH Systems, LLC</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Last Updated: January 18, 2026</p>
      <p className={pClass}>
        This Privacy Policy explains how TWH Systems, LLC (&quot;TWH Systems,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, shares, and protects information when you use the Surgery Techniques app, website, and related services (collectively, the &quot;Services&quot;).
      </p>

      <section className={sectionClass}>
        <h2 className={h2Class}>1. Information We Collect</h2>
        <h3 className="font-medium text-gray-900 dark:text-white mt-2 mb-1">A. Account Information</h3>
        <p className={pClass}>When you create an account, we may collect:</p>
        <ul className={ulClass}>
          <li>Name</li>
          <li>Email address</li>
          <li>Professional role (e.g., surgeon, student, industry employee)</li>
          <li>Specialty/subspecialty</li>
          <li>Years in practice or training status</li>
          <li>Country and practice setting</li>
        </ul>
        <h3 className="font-medium text-gray-900 dark:text-white mt-2 mb-1">B. Usage Data</h3>
        <p className={pClass}>We collect information about how you use the Services, including:</p>
        <ul className={ulClass}>
          <li>Searches and viewed content</li>
          <li>Favorites and ratings (stored anonymously)</li>
          <li>Interaction with features like &quot;Upcoming Cases&quot;</li>
          <li>Device and browser information (e.g., device type, operating system)</li>
        </ul>
        <h3 className="font-medium text-gray-900 dark:text-white mt-2 mb-1">C. Non-PHI Only</h3>
        <p className={pClass}>You agree not to enter patient names or Protected Health Information (PHI). We do not intentionally collect PHI.</p>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>2. How We Use Your Information</h2>
        <p className={pClass}>We use your information to:</p>
        <ul className={ulClass}>
          <li>Provide and improve the Services</li>
          <li>Personalize your experience</li>
          <li>Understand usage trends and content performance</li>
          <li>Develop new features and products</li>
          <li>Support customer service</li>
        </ul>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>3. Analytics and Data Sharing</h2>
        <p className={pClass}>We may:</p>
        <ul className={ulClass}>
          <li>De-identify, aggregate, and anonymize usage data</li>
          <li>Share aggregated, anonymized data with third parties for research, analytics, and commercial purposes</li>
        </ul>
        <p className={pClass}>We do not sell personally identifiable information (PII). Individual user behavior is not disclosed to sponsors or third parties.</p>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>4. Cookies and Tracking</h2>
        <p className={pClass}>We may use cookies and similar technologies to:</p>
        <ul className={ulClass}>
          <li>Remember user preferences</li>
          <li>Improve performance and usability</li>
          <li>Track aggregated usage patterns</li>
        </ul>
        <p className={pClass}>You may disable cookies in your browser, but some features may not function properly.</p>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>5. Data Security</h2>
        <p className={pClass}>We use industry-standard measures to protect data, including:</p>
        <ul className={ulClass}>
          <li>Encryption in transit (HTTPS)</li>
          <li>Access controls and authentication</li>
          <li>Regular security monitoring</li>
        </ul>
        <p className={pClass}>However, no system is 100% secure. We cannot guarantee absolute security.</p>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>6. Data Retention</h2>
        <p className={pClass}>We retain data as long as necessary to provide the Services and comply with legal obligations. Aggregated, anonymized data may be retained indefinitely.</p>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>7. Your Rights</h2>
        <p className={pClass}>Depending on your jurisdiction, you may have rights to:</p>
        <ul className={ulClass}>
          <li>Access, correct, or delete your account information</li>
          <li>Request information about data processing</li>
          <li>Opt-out of certain data uses</li>
        </ul>
        <p className={pClass}>To exercise your rights, contact us at privacy@surgicaltechniques.app.</p>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>8. Children</h2>
        <p className={pClass}>The Services are not intended for individuals under 18. We do not knowingly collect information from minors.</p>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>9. Contact Us</h2>
        <p className={pClass}>For privacy questions, please contact privacy@surgicaltechniques.app.</p>
      </section>
    </div>
  );
}

/** About Surgery Techniques App (Copy/Paste Ready) */
export function AboutContent() {
  return (
    <div className={proseClass}>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">About Surgery Techniques App</h1>
      <p className={pClass}>
        Surgery Techniques App is a surgeon-built, mission-critical reference platform designed to help healthcare professionals quickly find high-quality, procedure-specific educational content.
      </p>

      <section className={sectionClass}>
        <h2 className={h2Class}>Our Mission</h2>
        <p className={pClass}>
          To reduce search friction and support professional learning by providing a curated, searchable library of surgical technique videos, articles, PDFs, and instructional guides.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>What We Do</h2>
        <ul className={ulClass}>
          <li>Curate third-party educational content (no original content created)</li>
          <li>Organize resources by procedure and specialty</li>
          <li>Provide a streamlined &quot;Upcoming Cases&quot; dashboard for quick access in clinical workflows</li>
          <li>Maintain independence through anonymous curation and non-endorsement of sponsors</li>
        </ul>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>Who It&apos;s For</h2>
        <ul className={ulClass}>
          <li>Surgeons and clinicians</li>
          <li>Medical trainees and students</li>
          <li>Industry professionals in medical device, pharma, and life sciences</li>
        </ul>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>How We Work</h2>
        <p className={pClass}>
          We do not host or modify third-party content. We provide links to publicly available resources and rely on board-certified clinicians to curate and organize materials based on educational value.
        </p>
      </section>
    </div>
  );
}

/** Contact Us (Copy/Paste Ready) */
export function ContactContent() {
  return (
    <div className={proseClass}>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Contact Us</h1>
      <p className={pClass}>
        We welcome feedback, questions, and inquiries. Please use the appropriate contact method below:
      </p>
      <ul className="list-none pl-0 space-y-2 mb-4">
        <li><strong>General Support:</strong> support@surgicaltechniques.app</li>
        <li><strong>Privacy Questions:</strong> privacy@surgicaltechniques.app</li>
        <li><strong>Copyright / Takedown Requests:</strong> legal@surgicaltechniques.app</li>
      </ul>
      <p className={pClass}>For sponsorship inquiries or business partnerships, please use the "Sponsorship" button next to "Contact Us" in the app header.</p>
    </div>
  );
}

/** Sponsorship Disclosure (Copy/Paste Ready) */
export function SponsorshipContent() {
  return (
    <div className={proseClass}>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Sponsorship Disclosure</h1>
      <p className={pClass}>
        Surgery Techniques App is free for Users and supported in part by sponsorships from medical device, pharmaceutical, and healthcare industry partners.
      </p>

      <section className={sectionClass}>
        <h2 className={h2Class}>What Sponsorship Means</h2>
        <ul className={ulClass}>
          <li>Sponsored placements are clearly labeled</li>
          <li>Sponsorship provides visibility only</li>
          <li>Sponsors do not influence content selection, curation, ratings, or inclusion</li>
        </ul>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>No Endorsement</h2>
        <p className={pClass}>
          Inclusion of any sponsor, product, technique, or implant does not constitute an endorsement by TWH Systems or its curators.
        </p>
      </section>
    </div>
  );
}

/** Copyright & Takedown Policy (Copy/Paste Ready) */
export function CopyrightContent() {
  return (
    <div className={proseClass}>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Copyright &amp; Takedown Policy</h1>
      <p className={pClass}>
        TWH Systems respects intellectual property rights. The Services primarily provide links to third-party content hosted on external platforms. We do not own or host that content.
      </p>

      <section className={sectionClass}>
        <h2 className={h2Class}>How to Submit a Copyright Complaint</h2>
        <p className={pClass}>
          If you believe a link on our platform infringes your copyright, please contact us at:
        </p>
        <p className={pClass}>legal@surgicaltechniques.app</p>
        <p className={pClass}>Please include:</p>
        <ul className={ulClass}>
          <li>Your name and contact information</li>
          <li>A description of the copyrighted work</li>
          <li>The URL of the linked content</li>
          <li>A statement that you believe the use is unauthorized</li>
          <li>A statement that the information is accurate</li>
        </ul>
      </section>

      <section className={sectionClass}>
        <h2 className={h2Class}>Response and Removal</h2>
        <p className={pClass}>
          Upon receipt of a valid notice, TWH Systems will review and may remove or disable the link if appropriate.
        </p>
      </section>
    </div>
  );
}
