import Link from "next/link";
import "@/styles/legal.css";

type LegalType = "privacy" | "terms" | "dmca";

type LegalPageConfig = {
  title: string;
  tagline: string;
  badges: string[];
  contactTitle: string;
  lastUpdated: string;
  content: React.ReactNode;
};

const LEGAL_PAGES: Record<LegalType, LegalPageConfig> = {
  privacy: {
    title: "Privacy Policy",
    tagline: "Transparent data practices, strong security measures, and your rights in control of your personal information",
    badges: ["Data Protection", "Privacy Rights", "Transparency"],
    contactTitle: "Questions about your privacy?",
    lastUpdated: "30 March 2026",
    content: (
      <>
        <p className="legal-lead">
          6ure ("we", "us", "our") is committed to protecting your privacy. This policy explains what data we collect, why we collect it, how we use it, and what rights you have. We do not sell your personal data.
        </p>
        <div className="legal-summary-box">
          <h3 className="legal-summary-title">In short</h3>
          <ul>
            <li>We operate the 6ure website (About, Wiki, Password hub, Verify), the 6ure Requests platform, <strong>application forms</strong>, optional <strong>paid memberships</strong>, and use <strong>Discord</strong> for login across platforms.</li>
            <li>We store your <strong>Discord ID, username, avatar</strong>; on Requests: <strong>requests, comments, upvotes</strong>; on Applications: <strong>form submissions and answers</strong>; and preferences (theme, notifications).</li>
            <li><strong>Memberships:</strong> payments are processed by <strong>PayPal</strong>; we do not store your full card number. We keep billing records needed to run subscriptions (plan, status, amounts, dates, PayPal reference IDs) linked to your Discord account.</li>
            <li>We use <strong>cookies</strong> for session, theme, and feature access (e.g. password hub, Wiki unlocks); we do not use advertising or tracking cookies.</li>
            <li>We may use <strong>local storage</strong> for theme preferences. Contact form and Wiki &quot;Suggest changes&quot; store your <strong>name, email, message</strong>.</li>
            <li>We may send <strong>application acceptance emails</strong> to the address you provide in forms. Application responses may be posted to our Discord server via webhook for review.</li>
            <li>You can request <strong>access, correction, or deletion</strong> of your data at any time by contacting us.</li>
          </ul>
        </div>
        <nav className="legal-toc" aria-label="Table of contents">
          <h3 className="legal-toc-title">Contents</h3>
          <ol>
            <li><a href="#privacy-who">Who we are</a></li>
            <li><a href="#privacy-collect">Information we collect</a></li>
            <li><a href="#privacy-basis">Legal basis</a></li>
            <li><a href="#privacy-use">How we use your information</a></li>
            <li><a href="#privacy-sharing">Sharing and disclosure</a></li>
            <li><a href="#privacy-retention">Data retention</a></li>
            <li><a href="#privacy-rights">Your rights</a></li>
            <li><a href="#privacy-security">Security</a></li>
            <li><a href="#privacy-children">Children</a></li>
            <li><a href="#privacy-transfers">International transfers</a></li>
            <li><a href="#privacy-memberships">Memberships and payments</a></li>
            <li><a href="#privacy-changes">Changes to this policy</a></li>
          </ol>
        </nav>
        <h3 id="privacy-who">1. Who we are</h3>
        <p>6ure operates: (a) the 6ure website (6ureleaks.com), including the About page, Wiki, Password hub, Verify page, application forms, and optional paid memberships; (b) the 6ure Requests platform (6ureleaks.com/requests); and (c) the contact and &quot;Suggest changes&quot; feedback forms. For the purpose of data protection law, we are the data controller. Contact us at <a href="mailto:contact@6ureleaks.com">contact@6ureleaks.com</a> for any privacy-related request or question.</p>
        <h3 id="privacy-collect">2. Information we collect</h3>
        <p>We collect only what is necessary to run our platforms and to give you a personalised experience.</p>
        <h4>Account data (from Discord)</h4>
        <p>When you log in with Discord (OAuth), we receive and may store: <strong>Discord user ID</strong>, <strong>username</strong>, <strong>avatar URL</strong>, and optionally guild roles for badges and access control. We do not store your Discord email or access your DMs except when we send you a one-off DM (e.g. request completed) if you have opted in.</p>
        <h4>Usage data</h4>
        <p>On our Requests platform we may record views, upvotes, and session data. On the Wiki we record page view counts (e.g. per user per 24h for uniqueness). We use a server-side session (session cookie) so you stay logged in.</p>
        <h4>Content you provide</h4>
        <p>When you submit requests or comments on the Requests platform, we store that content. When you apply through our application forms (e.g. moderator applications), we store your responses, Discord ID, username, timezone, and any other information you provide in the form. When you use the contact form (About page) or &quot;Suggest changes&quot; (Wiki), we store your name, email, and message. When you verify (Discord) or use the Password hub, we process the data you provide as needed for those features.</p>
        <h4>Cookies</h4>
        <p>We use: (a) a <strong>session cookie</strong> to keep you logged in; (b) <strong>6ure-theme</strong> for light/dark preference; (c) <strong>pw_via</strong> for Password hub access (short-lived); (d) <strong>wiki_unlocked</strong> for password-protected Wiki pages (signed, tamper-proof); (e) <strong>pw_viewed_at</strong> for view-count uniqueness. We do not use advertising or tracking cookies.</p>
        <h4>Local storage</h4>
        <p>We may store <strong>theme preferences</strong> (settings-theme, wiki-theme) in your browser&apos;s local storage. This is used only to remember your display preference.</p>
        <h4>Technical data</h4>
        <p>Our servers may log IP address and request metadata for security, troubleshooting, and operation. We use <strong>Discord</strong> for OAuth login and, on Requests, to send you optional DMs (e.g. request completed, comment reply) if you opt in. We send application acceptance emails via contact@6ureleaks.com (SMTP). Application responses may be forwarded to our Discord server via webhook for staff review. We use <strong>Google Fonts</strong> (Inter) and our own CDN (images.6ureleaks.com) for assets.</p>
        <h3 id="privacy-basis">3. Legal basis</h3>
        <p>We process your data on: <strong>Contract</strong> – to run our platforms; <strong>Consent</strong> – for optional features; <strong>Legitimate interest</strong> – to prevent abuse and improve security.</p>
        <h3 id="privacy-use">4. How we use your information</h3>
        <p>We use your data to: identify you and display your profile; run the Wiki (including view counts and unlock state), Password hub, and Verify flow; process Requests, comments, and upvotes; process application form submissions, review applications, communicate acceptance or rejection by email, and post application responses to our Discord server for staff review when configured; send you optional Discord DMs (request completed, comment reply) when you opt in; respond to contact and Suggest-changes feedback; enforce moderation and protection rules (e.g. blocked creator/product links on Requests); operate <strong>paid memberships</strong> (billing, access, support, fraud prevention, and compliance); and comply with legal obligations.</p>
        <h3 id="privacy-sharing">5. Sharing and disclosure</h3>
        <p>We do not sell your data. We may share with: <strong>Discord</strong> (OAuth login; application responses via webhook for staff review; and, if you opt in, DMs for Requests notifications); <strong>PayPal</strong> (to process membership payments and related notices); <strong>email providers</strong> (to send application acceptance emails); <strong>hosting and infrastructure providers</strong>; <strong>Google</strong> (fonts via next/font, subject to Google&apos;s policies); or when <strong>required by law</strong>. Discord&apos;s use of data is governed by their <a href="https://discord.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> and <a href="https://discord.com/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>. PayPal&apos;s use of payment data is governed by PayPal&apos;s privacy statement and user agreement.</p>
        <h3 id="privacy-retention">6. Data retention</h3>
        <p>We keep account and content data until you request deletion or we no longer need it. Application submissions are retained for review, decision-making, and record-keeping. <strong>Membership and payment records</strong> are kept for as long as needed to provide the service, meet tax and accounting obligations, resolve disputes, and enforce our agreements (which may extend after a subscription ends). Session and unlock cookies are short-lived. Theme preferences persist until you change them. Contact and Suggest-changes messages are retained for as long as needed to respond and for legitimate business purposes.</p>
        <h3 id="privacy-rights">7. Your rights</h3>
        <p>Depending on where you live (e.g. GDPR), you may have rights to access, rectify, erase, port, object, withdraw consent, and lodge a complaint. Contact us at <a href="mailto:contact@6ureleaks.com">contact@6ureleaks.com</a> to exercise these rights.</p>
        <h3 id="privacy-security">8. Security</h3>
        <p>We use technical and organisational measures to protect your data. No system is completely secure; we work to minimise risks.</p>
        <h3 id="privacy-children">9. Children</h3>
        <p>Our service is not directed at anyone under 13. We do not knowingly collect data from children. Contact us if you believe we have; we will delete it.</p>
        <h3 id="privacy-transfers">10. International transfers</h3>
        <p>Your data may be processed on servers outside your country. Where required, we use appropriate safeguards (e.g. standard contractual clauses).</p>
        <h3 id="privacy-memberships">11. Memberships and payments</h3>
        <p>We may offer <strong>optional paid memberships</strong> (for example recurring subscriptions or one-time purchases) as described on our membership and checkout pages. These unlock digital access or benefits we describe at the point of sale.</p>
        <h4>Payment processor</h4>
        <p>Payments are processed by <strong>PayPal</strong> (and PayPal-related services where applicable). We do <strong>not</strong> receive or store your full payment card number, card security code, or full bank account details. PayPal collects and processes payment information under its own terms and privacy policy.</p>
        <h4>What we hold for memberships</h4>
        <p>To provide, renew, cancel, and support memberships, we process and store data such as: your <strong>Discord account identifier</strong> linked to the purchase; <strong>plan or tier</strong>; <strong>billing interval</strong> (e.g. monthly) where relevant; <strong>subscription status</strong> (e.g. active, cancelled, pending); <strong>amounts and currency</strong>; <strong>dates</strong> relevant to billing (e.g. purchase, renewal, cancellation, access period); and <strong>transaction, subscription, or order references</strong> that PayPal or our systems use to match payments to your account. We use this for fulfilment, customer support, accounting, fraud prevention, dispute handling, and legal compliance. We do not publish individual payment details publicly.</p>
        <h4>Promotional offers</h4>
        <p>If you use a <strong>promotional or discount code</strong>, we process the code and related eligibility information as needed to apply the offer and prevent abuse.</p>
        <h4>Your choices</h4>
        <p>You can manage PayPal payment methods and receipts in your <strong>PayPal account</strong>. Where we provide an <strong>Account & subscriptions</strong> (or similar) page on the website, you can review certain subscription status and use cancellation tools we offer; recurring billing may also be managed through PayPal according to your agreement with them.</p>
        <h3 id="privacy-changes">12. Changes to this policy</h3>
        <p>We may update this Privacy Policy from time to time. We will change the &quot;Last updated&quot; date when we do. We encourage you to review this page periodically.</p>
      </>
    ),
  },
  terms: {
    title: "Terms of Service",
    tagline: "Fair rules, clear expectations, and mutual respect for our community",
    badges: ["Platform Agreement", "Fair Rules", "Clear Expectations"],
    contactTitle: "Questions about our terms?",
    lastUpdated: "30 March 2026",
    content: (
      <>
        <p className="legal-lead">
          Welcome to 6ure. By accessing or using our website and platforms you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree, please do not use the service.
        </p>
        <div className="legal-summary-box">
          <h3 className="legal-summary-title">In short</h3>
          <ul>
            <li>These terms apply to all 6ure platforms: the website (About, Wiki, Password hub, Verify), Requests, <strong>application forms</strong>, optional <strong>paid memberships</strong>, and feedback forms.</li>
            <li>You must use our platforms <strong>lawfully</strong> and not submit or promote content that infringes copyright or others&apos; rights. Application submissions must be accurate and complete.</li>
            <li>Your account is linked to <strong>Discord</strong>; Verify and some features require Discord server membership. Login uses Discord OAuth.</li>
            <li><strong>Paid plans</strong> are billed through <strong>PayPal</strong>; recurring subscriptions renew until cancelled as described at checkout and in our <Link href="/privacy">Privacy Policy</Link>.</li>
            <li>We provide the service <strong>as-is</strong>; we may moderate content, enforce protection rules (e.g. blocked links on Requests), accept or reject applications, or suspend accounts that breach these terms.</li>
            <li>You grant us a <strong>license</strong> to use your submissions to operate the platforms; we do not claim ownership of your content.</li>
            <li>Our <strong>liability</strong> is limited to the extent permitted by law.</li>
          </ul>
        </div>
        <nav className="legal-toc" aria-label="Table of contents">
          <h3 className="legal-toc-title">Contents</h3>
          <ol>
            <li><a href="#terms-acceptance">Acceptance</a></li>
            <li><a href="#terms-eligibility">Eligibility</a></li>
            <li><a href="#terms-account">Account</a></li>
            <li><a href="#terms-membership">Paid memberships and payments</a></li>
            <li><a href="#terms-use">Use of the platform</a></li>
            <li><a href="#terms-content">Content and conduct</a></li>
            <li><a href="#terms-moderation">Moderation</a></li>
            <li><a href="#terms-ip">Your content and intellectual property</a></li>
            <li><a href="#terms-service">Our service</a></li>
            <li><a href="#terms-liability">Limitation of liability</a></li>
            <li><a href="#terms-indemnity">Indemnification</a></li>
            <li><a href="#terms-termination">Termination</a></li>
            <li><a href="#terms-changes">Changes to the terms</a></li>
            <li><a href="#terms-contact">Contact</a></li>
          </ol>
        </nav>
        <h3 id="terms-acceptance">1. Acceptance</h3>
        <p>By creating an account, logging in via Discord, or otherwise using any 6ure platform - including the 6ure website (About, Wiki, Password hub, Verify), the Requests platform (6ureleaks.com/requests), application forms, paid memberships where offered, and feedback forms (contact, Suggest changes) - you agree to these Terms and to our <Link href="/privacy">Privacy Policy</Link>. Continued use after we update these Terms constitutes acceptance of the updated Terms.</p>
        <h3 id="terms-eligibility">2. Eligibility</h3>
        <p>You must be at least 13 years old (or the minimum age in your jurisdiction) and not prohibited from using the service. The service is not directed at children. Some application forms may set a higher minimum age (e.g. 18); you must meet any stated requirements to apply.</p>
        <h3 id="terms-account">3. Account</h3>
        <p>Access is tied to your <strong>Discord</strong> identity. The Verify page helps you join the 6ure Discord server; some features may require server membership. You are responsible for keeping your Discord account secure and for all activity under your account. We are not liable for unauthorised use. Contact us at <a href="mailto:contact@6ureleaks.com">contact@6ureleaks.com</a> if your account has been compromised.</p>
        <h3 id="terms-membership">4. Paid memberships, billing, and payments</h3>
        <p>We may offer <strong>paid memberships or one-time purchases</strong> (for example recurring subscriptions or lifetime access) as described on our membership and checkout pages. By purchasing, you agree to the price, billing cycle, and benefits shown at the time of checkout.</p>
        <p><strong>Payment processing.</strong> Payments are processed by <strong>PayPal</strong> (or affiliated PayPal services). You authorise PayPal to charge your selected payment method. Your relationship with PayPal is governed by PayPal&apos;s user agreement and policies. We do not receive your full card number or card security code.</p>
        <p><strong>Recurring billing.</strong> Where you choose a subscription, it <strong>renews automatically</strong> at the stated interval until you cancel. You may cancel through tools we provide (e.g. Account & subscriptions) and/or through PayPal, as described at purchase. Cancelling stops future charges; you may retain access until the end of the period you already paid for, unless we state otherwise.</p>
        <p><strong>Access and changes.</strong> Membership grants the digital access and benefits we describe on the site. We may update features or eligibility with reasonable notice where practicable. We may change <strong>prices</strong> for new purchases or renewals with notice where required by law; continued use after a change may constitute acceptance where applicable.</p>
        <p><strong>Refunds and disputes.</strong> Refunds, if any, are handled according to our stated policies, applicable law, and PayPal&apos;s rules. Unless we expressly agree otherwise or the law requires, <strong>payments are non-refundable</strong>. Abusive chargebacks or payment disputes may result in suspension of access.</p>
        <p><strong>Failed payments.</strong> If a payment fails or is reversed, we may suspend or end membership access until payment is resolved.</p>
        <p><strong>Taxes.</strong> Stated prices may exclude taxes unless we say otherwise. You are responsible for any taxes we do not collect.</p>
        <p><strong>Consumer rights.</strong> Nothing in these Terms limits <strong>mandatory consumer rights</strong> that apply to you under the laws of your country or region.</p>
        <h3 id="terms-use">5. Use of the platform</h3>
        <p>You must use our platforms lawfully and in line with these Terms and any rules we publish (e.g. in our Discord server). You must not: submit or promote content that infringes copyright or others&apos; rights; use the service for illegal activity, fraud, or harassment; circumvent access controls (e.g. Password hub, Wiki unlocks, or paid membership gates) or abuse our systems; impersonate others. On Requests, certain creator or product links may be protected or blocked; you must not attempt to bypass those rules.</p>
        <h3 id="terms-content">6. Content and conduct</h3>
        <p>When you submit requests, comments, contact messages, Suggest changes feedback, application form responses, or other content, you represent that you have the right to share it and that it does not violate these Terms or the law. You must provide accurate and complete information in application forms. We may reject, edit, or remove content that breaches our policies. On our Requests platform, completion of a request is at our discretion and does not create a contract beyond these Terms. Application decisions (acceptance, rejection) are at our sole discretion and do not create employment or other obligations. Password-protected content (Password hub, Wiki pages) is subject to access rules we set.</p>
        <h3 id="terms-moderation">7. Moderation</h3>
        <p>We and our staff may approve, reject, or remove content; lock comments; ban users; accept or reject applications; and enforce access controls. Moderation decisions are at our discretion. We may share application responses with our team (including via Discord) for review. For copyright claims, see our <Link href="/dmca">DMCA & Copyright</Link> page and contact us.</p>
        <h3 id="terms-ip">8. Your content and intellectual property</h3>
        <p>You retain ownership of the content you submit. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, store, display, and process it as necessary to operate the platforms. We do not claim ownership of your content.</p>
        <h3 id="terms-service">9. Our service</h3>
        <p>We provide the platform <strong>as-is</strong> and <strong>as available</strong>. We do not guarantee uninterrupted access or accuracy of user-generated content. We may change, suspend, or discontinue features (including membership benefits) with reasonable notice where practicable.</p>
        <h3 id="terms-liability">10. Limitation of liability</h3>
        <p>To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages. Our total liability shall not exceed the amount you paid us in the twelve (12) months before the claim (or zero if nothing was paid).</p>
        <h3 id="terms-indemnity">11. Indemnification</h3>
        <p>You agree to indemnify and hold harmless 6ure, its operators, and affiliates from claims arising from your use, content, conduct, or violation of these Terms or the law.</p>
        <h3 id="terms-termination">12. Termination</h3>
        <p>We may suspend or terminate your access at any time, with or without cause or notice. You may stop using the service at any time. Upon termination, your right to use the platform ceases; we may retain or delete your data as described in our Privacy Policy. Termination does not excuse amounts already owed for paid periods you used.</p>
        <h3 id="terms-changes">13. Changes to the terms</h3>
        <p>We may update these Terms from time to time. We will change the &quot;Last updated&quot; date and may notify you for material changes. Continued use after the effective date constitutes acceptance.</p>
        <h3 id="terms-contact">14. Contact</h3>
        <p>For questions about these Terms, billing, or memberships, or to report violations or request takedowns, contact us at <a href="mailto:contact@6ureleaks.com">contact@6ureleaks.com</a>. We will respond as reasonably practicable.</p>
      </>
    ),
  },
  dmca: {
    title: "DMCA & Copyright",
    tagline: "Copyright protection, takedown procedures, and request removal of copyrighted work including presets",
    badges: ["Copyright Protection", "Safe Harbor", "Presets & Requests"],
    contactTitle: "Questions about our DMCA policy?",
    lastUpdated: "27 February 2026",
    content: (
      <>
        <p className="legal-lead">
          6ure respects intellectual property rights. We respond to valid notices under the U.S. Digital Millennium Copyright Act (&quot;DMCA&quot;) and similar laws. If you believe content on any 6ure platform - including <strong>presets</strong> (hosted on our Discord server), requests, Wiki content, or other materials - infringes your copyright, you may send a takedown notice. If your content was removed and you believe it was mistaken or misidentified, you may send a counter-notice.
        </p>
        <div className="legal-summary-box">
          <h3 className="legal-summary-title">In short</h3>
          <ul>
            <li><strong>Copyright holder</strong> – send a DMCA takedown notice to our designated agent (see below) with the required information; we will process valid notices and may remove or disable access to the reported content (presets on Discord, requests, Wiki pages, etc.); for Discord-hosted content we encourage contacting us first so we can address concerns promptly.</li>
            <li><strong>User whose content was removed</strong> – you may send a counter-notice if you believe the removal was mistaken; we may forward it to the complainant and, if they do not sue, we may restore the content.</li>
            <li>We may <strong>terminate repeat infringers</strong> in appropriate circumstances. Knowingly misrepresenting that content is infringing (or not) may result in liability.</li>
          </ul>
        </div>
        <nav className="legal-toc" aria-label="Table of contents">
          <h3 className="legal-toc-title">Contents</h3>
          <ol>
            <li><a href="#dmca-scope">Scope</a></li>
            <li><a href="#dmca-agent">Designated agent</a></li>
            <li><a href="#dmca-takedown">Filing a DMCA takedown notice</a></li>
            <li><a href="#dmca-counter">Counter-notice</a></li>
            <li><a href="#dmca-repeat">Repeat infringers</a></li>
            <li><a href="#dmca-misrep">Misrepresentation</a></li>
            <li><a href="#dmca-contact">Contact</a></li>
          </ol>
        </nav>
        <h3 id="dmca-scope">1. Scope</h3>
        <p>This policy applies to all 6ure platforms, including: the 6ure website (About, Wiki, Password hub, Verify), the 6ure Requests platform (6ureleaks.com/requests), application forms, and our <strong>Discord server</strong> where we host and share <strong>presets</strong>. Content covered includes but is not limited to: presets, request submissions, comments, Wiki articles, application form responses, and materials accessible via the Password hub. For content hosted on Discord, copyright holders typically submit notices to Discord; we encourage contacting us first at <a href="mailto:contact@6ureleaks.com">contact@6ureleaks.com</a> so we can address concerns promptly.</p>
        <h3 id="dmca-agent">2. Designated agent</h3>
        <p>We have designated an agent to receive DMCA notices and counter-notices. Send all copyright-related communications to:</p>
        <ul>
          <li><strong>Email:</strong> <a href="mailto:contact@6ureleaks.com">contact@6ureleaks.com</a></li>
          <li>Use the subject line <strong>&quot;DMCA Takedown Notice&quot;</strong> or <strong>&quot;DMCA Counter-Notice&quot;</strong> so we can process your message promptly.</li>
        </ul>
        <h3 id="dmca-takedown">3. Filing a DMCA takedown notice</h3>
        <p>If you are a copyright owner (or authorised to act on their behalf) and believe that content on any 6ure platform infringes your copyright - including presets, requests, Wiki content, or other materials - please send a written notice that includes all of the following, as required by 17 U.S.C. § 512(c)(3):</p>
        <ol>
          <li><strong>Your physical or electronic signature.</strong></li>
          <li><strong>Identification of the copyrighted work</strong> you claim has been infringed (e.g. title, registration number, or description).</li>
          <li><strong>Identification of the material</strong> that you claim is infringing and that you want removed or disabled, with information reasonably sufficient to allow us to locate it (e.g. URL, screenshot, or precise description - including platform such as Discord channel, 6ureleaks.com/requests page, Wiki, or request ID).</li>
          <li><strong>Your contact information</strong> – address, telephone number, and email address.</li>
          <li><strong>A statement</strong> that you have a good-faith belief that use of the material in the manner complained of is not authorised by the copyright owner, its agent, or the law.</li>
          <li><strong>A statement</strong> that the information in the notice is accurate and, under penalty of perjury, that you are authorised to act on behalf of the copyright owner.</li>
        </ol>
        <p>Send the notice to <a href="mailto:contact@6ureleaks.com">contact@6ureleaks.com</a>. We will review it and, if it is valid and complete, we may remove or disable access to the allegedly infringing content and may notify the user who posted it. We aim to process valid notices within 24–48 hours where practicable.</p>
        <h3 id="dmca-counter">4. Counter-notice</h3>
        <p>If your content was removed or disabled as a result of a DMCA notice and you believe the removal was mistaken (e.g. you have rights to use the work, it was misidentified, or it is not infringing), you may send a counter-notice. The counter-notice must include, as required by 17 U.S.C. § 512(g)(3):</p>
        <ol>
          <li><strong>Your physical or electronic signature.</strong></li>
          <li><strong>Identification of the material</strong> that was removed or disabled and the location (e.g. URL) where it appeared before removal.</li>
          <li><strong>A statement under penalty of perjury</strong> that you have a good-faith belief that the material was removed or disabled as a result of mistake or misidentification.</li>
          <li><strong>Your name, address, and telephone number</strong>, and a statement that you consent to the jurisdiction of the federal court for the judicial district in which your address is located (or, if outside the U.S., any judicial district in which we may be found) and that you will accept service of process from the person who provided the DMCA notice or their agent.</li>
        </ol>
        <p>Send the counter-notice to <a href="mailto:contact@6ureleaks.com">contact@6ureleaks.com</a>. We may forward it to the person who submitted the original takedown notice. If that person does not file a court action against you within a period required by law (typically 10–14 business days), we may restore the content.</p>
        <h3 id="dmca-repeat">5. Repeat infringers</h3>
        <p>In appropriate circumstances we may terminate the accounts of users who are repeat infringers. We may also remove content and take other measures we deem necessary to comply with the DMCA and to protect the platform and rights holders.</p>
        <h3 id="dmca-misrep">6. Misrepresentation</h3>
        <p>Under the DMCA, anyone who knowingly materially misrepresents that material is infringing, or that material was removed or disabled by mistake or misidentification, may be liable for damages (including costs and attorneys&apos; fees). Do not submit a takedown notice or counter-notice unless you have a good-faith basis. If you are unsure, consider consulting a lawyer before sending a notice.</p>
        <h3 id="dmca-contact">7. Contact</h3>
        <p>For all DMCA-related communications (takedown notices, counter-notices, and questions), contact our designated agent at <a href="mailto:contact@6ureleaks.com">contact@6ureleaks.com</a>. For other legal matters, see our <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Terms of Service</Link>.</p>
      </>
    ),
  },
};

export function LegalPage({ type }: { type: LegalType }) {
  const page = LEGAL_PAGES[type];
  if (!page) return null;

  return (
    <main className="legal-page">
      <div className="legal-card">
        <header className="legal-hero">
          <p className="legal-updated-top">Last updated: {page.lastUpdated}</p>
          <div className="legal-badges" role="list">
            {page.badges.map((label, i) => (
              <span key={i} className="legal-badge" role="listitem">{label}</span>
            ))}
          </div>
          <h1 className="legal-hero-title">{page.title}</h1>
          <p className="legal-tagline">{page.tagline}</p>
        </header>
        <div className="legal-content">{page.content}</div>
        <section className="legal-cta-box" aria-label="Contact">
          <h3 className="legal-cta-title">{page.contactTitle}</h3>
          <p className="legal-cta-desc">Contact us for any questions or to exercise your rights.</p>
          <div className="legal-cta-links">
            <a href="mailto:contact@6ureleaks.com" className="legal-cta-btn legal-cta-email">Email</a>
            <a href="https://discord.gg/6ure" target="_blank" rel="noopener noreferrer" className="legal-cta-btn legal-cta-discord">Discord</a>
          </div>
        </section>
        <footer className="legal-meta">
          <p className="legal-effective">This policy is effective immediately and applies to all users of 6ure platforms (website, Wiki, Password hub, Verify, Requests, application forms, paid memberships, feedback forms).</p>
        </footer>
        <p className="legal-back">
          <Link href="/">← Back to Home</Link>
        </p>
      </div>
    </main>
  );
}
