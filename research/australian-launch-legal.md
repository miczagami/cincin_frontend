# Which Australian laws and platform rules apply to CinCin at launch?

Resolves miczagami/cincin_frontend#11 (map: #5). Researched 18 November 2026.

> **This is research, not legal advice.** It maps which rules apply and what each one
> asks of the product, so the team can scope the work and brief a lawyer. Every item marked
> **Lawyer** in [Questions for a lawyer](#questions-for-a-lawyer) needs a qualified Australian
> lawyer before launch, and the expansion notes need local advice in each market.

## How this was researched, and how far to trust it

- The question was checked against primary sources: the Federal Register of Legislation,
  OAIC, ACMA, ACCC, ATO, Treasury, the Parliament of Australia, the ABAC Scheme, eSafety,
  state government sites, Stripe, Apple and Google, plus the NZ, UK and US regulators.
- **This session's network blocks direct fetches of almost all of those sites** (only
  developer.apple.com was reachable). Apple's guidelines were read in full. Everything
  else was confirmed through web-search excerpts restricted to the owning primary domain,
  and each claim cites the primary URL it came from. Excerpts can lose context, so a
  claim tagged **(verify)** below is either thinly sourced or from background knowledge
  not confirmed in this session.
- Product facts come from the three repos as they stand at
  `origin/claude/sharp-gauss-5tdzpq` (frontend), backend `main` and `cincin_www`.

## The answer in one table

CinCin does not sell or supply alcohol. That one fact decides most of this: liquor
licensing law does not bite on CinCin itself. The rules that do bite are federal
consumer, privacy and spam law; the alcohol industry's marketing code (ABAC), which
reaches CinCin in practice even though it never signed it; and the platform rules of
Stripe, Apple and Google.

| # | Rule | Kind | Applies to CinCin at launch? | What it needs in the product |
|---|------|------|------------------------------|------------------------------|
| 1 | ABAC Responsible Alcohol Marketing Code | Industry code (quasi-regulatory) | **In practice yes.** The ABAC panel rules on complaints against non-signatories and has ruled against an alcohol-focused platform that sells no alcohol. Sponsors and affiliate retailers are bound by it and will require it. | Age-restrict the whole site and app; no excessive or rapid drinking cues in game copy, share cards or marketing; no appeal to minors; nobody under 25 in imagery; no "alcohol makes you win" messaging |
| 2 | State liquor Acts (sale, supply, licensee promotions) | Law (state) | **Not directly**, because CinCin neither sells nor supplies liquor. Becomes live if CinCin ever gives alcohol as prizes, runs events or sells bottles | Keep affiliate links as links (the retailer sells); never take payment for alcohol |
| 3 | Secondary supply laws (adults giving alcohol to under-18s at home) | Law (state) | Indirectly: guest players at a host's table are not age-checked | Host confirms every guest is 18+ before adding guests |
| 4 | Minimum age | Law (state) + ABAC | **18 in every state and territory** | Age gate at 18 for AU |
| 5 | ID-based age verification | **Not legally required** for a product that does not sell alcohol | Best practice and commercial choice (already decided: Onfido) | Treat as a privacy-heavy feature: consent, retention, overseas disclosure |
| 6 | Privacy Act 1988 and the APPs | Law (federal) | **Probably**, and CinCin should act as if it does (see the small-business question) | Privacy policy, collection notices, sensitive-info consent for the ID check, overseas disclosure, deletion, breach plan; automated-decision disclosure from 10 Dec 2026 |
| 7 | Statutory tort for serious invasions of privacy | Law (federal) | Yes, no small-business exemption **(verify)** | Same controls as #6; reason enough not to lean on the exemption |
| 8 | Spam Act 2003 | Law (federal) | Yes, for marketing email and SMS | Unticked opt-in at sign-up, sender ID, one-click unsubscribe honoured within 5 business days |
| 9 | Australian Consumer Law (today) | Law (federal, applied in each state) | Yes | Clear trial and renewal terms, total price incl. GST as prominent as any per-month figure, no "no refunds" wording, fair terms, honest AI claims |
| 10 | Unfair Trading Practices Act 2026 (subscription traps) | Law (federal), **starts 1 July 2027** | Not at launch, but within year one | Point-of-sale key terms, trial-end and renewal notices, online cancellation as easy as sign-up |
| 11 | GST | Law (federal) | Once GST turnover reaches A$75,000 (current or projected) | Show GST-inclusive prices; tax invoices; Stripe Tax set up |
| 12 | Stripe restricted businesses | Platform rule | Low risk: CinCin sells software, not alcohol | Describe the business accurately to Stripe; never route alcohol sales through Stripe; get written comfort |
| 13 | Apple App Store / Google Play | Platform rule | **Only when CinCin ships a store app.** The PWA is outside both today | Nothing to encourage excessive drinking; in-app account deletion; store billing for subscriptions |
| 14 | Online safety (social media minimum age, age-restricted material codes) | Law (federal) + registered codes | Probably not | Recheck if clubs grow chat or posting features |
| 15 | Children's Online Privacy Code | Registered code under the Privacy Act (due by 10 Dec 2026) | Unlikely for an 18+ ID-verified service | Keep the service clearly adult-only |
| 16 | FSANZ Food Standards Code, Standard 1.2.7 (health claims) | Law (food standard) **(verify)** | Edge case: applies to advertising of alcoholic drinks | AI tasting notes and sponsored copy must not make health claims ("antioxidants", "good for your heart") |

## Product facts this research leans on

From the repos (read only):

- **No alcohol is sold.** Commerce is `AffiliateLink` (e.g. "Dan Murphy's", "Vivino") with
  click tracking, and `SponsoredTasting` (brand-paid placements with a "Sponsored" badge and
  `doublePoints: true`) in `cincin_backend/prisma/schema.prisma`.
- **Game mechanics:** timed rounds (`roundTimerSecs: 60`), up to 20 rounds
  (`cincin_backend/src/config/index.js`), multiplayer at a table, with **guest players** who
  have only a display name and no age check (`GuestPlayer` model).
- **Age verification:** `cincin_backend/src/services/ageVerifyService.js` uses Onfido and
  stores only pass/fail plus verified date of birth; drinking age table AU/NZ/UK 18, US 21.
  The app tells users "Your ID data is handled by our verification partner and is not
  stored by CinCin" (`cincin_frontend/src/i18n/index.js`).
- **Overseas processors:** Anthropic, OpenAI and Google Vision (bottle-label images and
  tasting text), Stripe, Onfido, Firebase (push), email (SendGrid per the ticket), error
  monitoring.
- **Data:** soft delete (`deletedAt`), CSV data export, and a **B2B data opt-in**
  (`updateB2BConsent`, Pro only) in `cincin_backend/src/services/userService.js`.
- **Billing:** Stripe Checkout, 7-day free trial after the first game,
  cancel-at-period-end (`cincin_backend/src/services/subscriptionService.js`).
- **Sign-up consent** is a passive line: "By signing up you agree to our Terms of Service and
  Privacy Policy". There is no marketing-consent checkbox.
- **Legal pages are missing.** `cincin_www/index.html` and `sitemap.xml` link `/privacy` and
  `/terms`, but no such pages exist in `cincin_www`, so both links 404 today.
- **Marketing site** says "Must be 18+ to play" but has no age gate; Open Graph share image
  and copy ("Settle it with your mates").

## 1. Alcohol marketing: ABAC and state rules

### Does ABAC apply to an app that sells no alcohol?

ABAC is a voluntary, industry-funded, quasi-regulatory code. Signatories are alcohol
producers, distributors and retailers. CinCin is not one, but three things bring it in:

1. **The panel rules on non-signatories.** Since 2004 the panel has decided "all complaints
   irrespective of the membership status of the advertiser". A non-signatory is "not
   contractually bound" to comply, but determinations are published and sent to Ad
   Standards, and where a non-signatory refuses to act, complaints have been **referred to
   the state liquor regulator** under ABAC's Rules & Procedures.
   ([Determination 30/22](http://www.abac.org.au/wp-content/uploads/2022/05/30-22-Determination-40-20-Beer-17-May-2022.pdf), [Annual Report 2023](https://www.abac.org.au/wp-content/uploads/2024/04/ABAC-Annual-Report-2023-FINAL.pdf), [Determination 184/25](http://www.abac.org.au/wp-content/uploads/2026/01/184-25-FINAL-Determination-12-January-2026-1.pdf))
2. **The closest precedent is a platform like CinCin.** In *Nightplan* (Determinations 241 &
   242/21) the panel ruled on a platform that "is not a producer, distributor or retailer of
   alcohol products". It found drinking-game posts encouraged excessive consumption, and held
   Nightplan to be "a third party platform that is primarily related to alcohol" for the
   Available Age Restriction Controls definition, so its whole account had to be
   age-restricted. Contrast Pedestrian.TV (22/20), which was not primarily about alcohol and
   so only had to age-restrict individual alcohol posts.
   ([241 & 242/21](http://www.abac.org.au/wp-content/uploads/2021/11/241-242-21-Determination-22-November-2021.pdf), [22/20](http://www.abac.org.au/wp-content/uploads/2020/03/22-20-Determination-BWS-25-March-2020.pdf))
3. **Sponsors and affiliates are signatories.** A `SponsoredTasting` is the brand's marketing
   communication, and affiliate placements promote a retailer. Brands will contractually
   require ABAC compliance and usually ABAC pre-vetting of copy.

**Conclusion:** treat CinCin's site, app, social accounts, share cards, emails and push
copy as alcohol marketing that must meet ABAC. CinCin is "primarily related to alcohol",
so the **whole environment should be age-restricted**, not just individual posts.

### What ABAC requires (current Code revised 28 April 2023, in force from 1 August 2023)

Code text: [Revised ABAC Code 28-4-2023](http://www.abac.org.au/wp-content/uploads/2023/04/Revised-ABAC-Responsible-Alcohol-Marketing-Code-28-4-2023.pdf); guidance: [Guidance Notes 28-4-2023](http://www.abac.org.au/wp-content/uploads/2023/04/ABAC-Guidance-Notes-28-4-2023.pdf).
Check the live code on abac.org.au before relying on clause numbers **(verify)**.

| Standard | Rule (paraphrased) | What it means for CinCin |
|----------|--------------------|--------------------------|
| Part 3(a) responsible consumption | Must not show or encourage excessive or rapid consumption, or treat misuse or irresponsible behaviour as amusing. The panel has applied this to drinking games. | The game must be about **tasting, not drinking**. No copy like "drink up", "shots", "finish your glass before the timer", "loser drinks". The 60-second round timer must time the *guess*, never the *drink*. Share cards and Palate Wrapped must not count drinks or volume ("40 glasses this month"); count bottles explored or notes guessed. Twenty rounds in one session needs visible "sip or spit, pour small" guidance. |
| Part 3(b) minors | No "strong or evident appeal to minors" (five tests: strong appeal, targeting, particular attractiveness, imagery like confectionery or soft drinks or cartoons, merchandise for minors). No one who is or looks under 18. No adult under 25 unless narrow exceptions apply. | Brand and share-card art: avoid cartoon, candy-like or childish styling; panels cite "bright, playful colours" and cartoon imagery as risk factors. No people under 25, or who look it, in marketing or testimonials imagery. |
| Part 3(c) mood and success | Must not suggest alcohol causes a significant change in mood or contributes to personal, social, sporting, sexual or other success. | Careful: the product *is* a competition. Frame winning as palate skill, never as the drink's effect. Avoid "the more you drink, the better you score" or "liquid courage" style copy. |
| Part 3(d) safety | No drinking before or during activities needing alertness (driving, sport, water, skiing). | Marketing imagery: no drinks near cars, boats, pools, sport. |
| Placement rules / Available Age Restriction Controls | Use available age-restriction, targeting or affirmation tools to keep marketing to adults (18+). Where no tools exist, the audience must be reasonably expected to be 80%+ adult. | Age gate on playcincin.com (date-of-birth affirmation is the usual tool). Age-restrict CinCin's Instagram, Facebook, TikTok and YouTube accounts to 18+ ([ABAC note on Facebook/Instagram controls](http://www.abac.org.au/wp-content/uploads/2022/09/Available-age-restriction-controls-on-FacebookInstagram-1-9-22.pdf)). Target paid ads 18+. |

Other panel lines that matter:

- **Competitions and points.** A tipping competition run by an alcohol marketer did not breach
  the Code; the panel said it "can be run by an alcohol marketer" and alcohol prizes are not
  prohibited ([66/23](http://www.abac.org.au/wp-content/uploads/2023/05/66-23-FINAL-Determination-29-May-2023.pdf)).
  In *Hard Fizz* the panel distinguished "the encouragement of consumption rather than the
  encouragement of the purchase of alcohol" ([239/21](http://www.abac.org.au/wp-content/uploads/2021/11/239-21-Determination-Hard-Fizz-15-November-2021.pdf)).
  **Double points for sponsored tastings** rewards consuming a specific brand. Award the
  points per bottle tasted, not per pour or per round, and do not stack them.
- **Age gating is not a complete defence.** In a children's-game placement the panel said
  "reliance on age gating alone will not generally support a no fault finding"
  ([117/17](http://www.abac.org.au/wp-content/uploads/2018/01/117-17-Determination-4-1-18.pdf)).
  The content must also be responsible.
- **Share cards** are generated by CinCin, carry CinCin branding and drive acquisition, so
  they are CinCin's marketing even when a user posts them. They must pass Part 3, and the
  link they carry should land on an age-gated page.

### Other advertising codes

- **AANA Code of Ethics** (Ad Standards) applies to all advertisers, signatory or not, and
  covers health and safety and community standards. Complaints about alcohol ads can go to
  both Ad Standards and ABAC **(verify)**.
- **FSANZ Standard 1.2.7** prohibits health claims (and most nutrition content claims) about
  beverages over 1.15% ABV, on labels and in advertising **(verify)**. Filter AI tasting
  notes and sponsored copy for health claims such as "antioxidants", "good for the heart" or
  "aids digestion".
- **DrinkWise** responsible-drinking messaging is voluntary industry practice, not law. A
  "Taste responsibly, pour small, sip or spit" line in the app and footer helps the ABAC
  posture cheaply.

### State liquor rules on marketing

State and territory liquor Acts (NSW *Liquor Act 2007*, Vic *Liquor Control Reform Act
1998*, Qld *Liquor Act 1992*, WA *Liquor Control Act 1988*, SA *Liquor Licensing Act
1997*, Tas *Liquor Licensing Act 1990*, ACT *Liquor Act 2010*, NT *Liquor Act 2019*)
license the **sale and supply** of liquor and let regulators restrict **licensees'**
promotions. CinCin is not a licensee and does not sell or supply, so they do not apply
directly **(verify)**. Three ways they could start to apply:

1. CinCin gives **alcohol as prizes** (e.g. season prizes) or runs **in-person events**
   where alcohol is served.
2. CinCin **takes payment for bottles** instead of linking to a retailer.
3. A **retailer partner** (a licensee) runs promotions through CinCin. The retailer's
   licence conditions and state promotion guidelines then bind the content. ABAC's route
   for non-compliant non-signatories also ends at the state regulator.

Trade promotions: skill-only leaderboards and seasons need no permit. A **prize draw or any
chance element** can need a permit in some jurisdictions (historically the ACT, and
others above prize thresholds), and alcohol prizes carry extra state limits **(verify,
Lawyer)**.

## 2. Age verification and minimum age

**Minimum age: 18 everywhere in Australia.** ABAC defines an Adult as 18+. All states
and territories prohibit supplying alcohol to under-18s, apart from secondary-supply
exceptions ([health.gov.au: Alcohol laws in Australia](https://www.health.gov.au/topics/alcohol/about-alcohol/alcohol-laws-in-australia)).

**ID-based checking is not legally required** for CinCin:

- Liquor law's age checks fall on **sellers and suppliers** (licensees, online retailers at
  delivery). CinCin is neither.
- The **Social Media Minimum Age** (under-16 account ban, from 10 December 2025) excludes
  services whose sole or primary purpose is "to enable end-users to play online games with
  other end-users". CinCin's clubs and activity features should be watched: eSafety warns
  that a game service with messaging can come within scope if its primary purpose shifts
  ([eSafety assessment guidance](https://www.esafety.gov.au/about-us/industry-regulation/social-media-age-restrictions/assessment), [FAQs](https://www.esafety.gov.au/about-us/industry-regulation/social-media-age-restrictions/faqs)).
- The **Age-Restricted Material Codes** (Phase 2) target class 1C and class 2 material
  (pornography, high-impact violence, R18+ games and the like). No source found puts
  alcohol-themed content in scope ([eSafety on the codes](https://www.esafety.gov.au/newsroom/media-releases/online-safety-codes-introduce-real-world-protections-for-children-online)) **(verify)**.

**Why ID checking is still a sensible choice (already decided):**

- ABAC accepts date-of-birth **affirmation** as an "available age restriction control", so a
  self-declared DOB gate is the floor. ID verification goes well beyond it.
- Brand sponsors and retailers will be more comfortable placing content in a verified-adult
  environment.
- It supports an 18+ App Store or Play rating later and keeps CinCin clearly outside the
  Children's Online Privacy Code.

**The cost is privacy.** A selfie or face match used for automated verification is
**biometric "sensitive information"** under the Privacy Act, which needs **consent**
(APP 3.3). It also triggers US biometric laws later. See [Privacy](#3-privacy-privacy-act-1988-and-the-apps).

**Guests and secondary supply.** Supplying alcohol to an under-18 in a private home is
illegal unless the supplier is the parent or guardian (NT, QLD), or has parental permission
(ACT, NSW, SA, TAS, VIC, WA), and in every case only with responsible supervision
([Vic](https://www.vic.gov.au/underage-drinking-in-private-homes), [Qld](https://www.qld.gov.au/law/crime-and-police/types-of-crime/supply-alcohol-under-18s), [ADF summary](https://adf.org.au/insights/understanding-secondary-supply/)).
CinCin does not supply alcohol, but its game puts guest players at a host's table with no
age check. The product needs:

- **Host attestation** when adding guests: "Everyone playing is 18 or over."
- No guest-facing marketing.
- Terms that make the host responsible for who drinks at their table.

## 3. Privacy: Privacy Act 1988 and the APPs

### Is CinCin covered?

- The **small business exemption** removes businesses with annual turnover of A$3 million or
  less from the Act (s 6D) ([OAIC APP guidelines](https://www.oaic.gov.au/__data/assets/pdf_file/0032/263777/12-May-Consolidated-APP-Guidelines-Updated-Chapter-3.pdf)).
- **Exceptions to the exemption** include businesses that "disclose personal information
  about another individual for a benefit, service or advantage", **unless** done with the
  individual's consent or as authorised by law. CinCin's **B2B data opt-in** is exactly this
  kind of disclosure. It is consent-based, which may keep the exemption, but only if consent
  is truly obtained from every affected individual (s 6D(7)-(8)) **(Lawyer)**.
- The **statutory tort for serious invasions of privacy** (Privacy and Other Legislation
  Amendment Act 2024, Schedule 2) applies regardless of the small business exemption
  **(verify)**.
- Stripe, Onfido, the app stores and every brand partner will require a compliant privacy
  policy and data handling anyway. An exempt business can also opt in under s 6EA
  **(verify)**.

**Recommendation:** build to full APP compliance from day one. The work is the same, and it
removes a fragile legal argument.

### What each principle requires of the product

| APP | Requirement | CinCin work |
|-----|-------------|-------------|
| APP 1 | Clearly expressed, up-to-date **privacy policy**: kinds of information, how collected, purposes, access and correction, complaints, **whether information goes overseas and to which countries**. | Publish `/privacy` (currently a 404) on playcincin.com and link it in the app, at sign-up and at the age check. |
| APP 1 (new, **from 10 Dec 2026**) | If a computer program makes, or substantially contributes to, decisions that **significantly affect** an individual's rights or interests, the privacy policy must say what information is used and what decisions are made ([OAIC](https://www.oaic.gov.au/news/media-centre/new-resources-on-transparency-for-use-of-ai-and-automated-decision-making), [ADM issues paper](https://www.oaic.gov.au/__data/assets/pdf_file/0027/263925/ADM-Issues-Paper.pdf)). | The **automated Onfido pass/fail that locks an account** very likely qualifies. Disclose it, and offer a manual review path for false rejections. AI scoring of guesses is probably not "significant" **(Lawyer)**. Launch falls after 10 Dec 2026, so this applies on day one. |
| APP 3 | Collect only what is reasonably necessary. **Sensitive information** (incl. biometric information used for automated verification, and biometric templates) needs **consent**. | Explicit consent screen before the Onfido flow: what is captured (ID image, selfie or face scan), by whom (Onfido / Entrust), where (region), for how long, and why. Not a pre-ticked box. |
| APP 5 | **Collection notice** at or before collection. | Short notices at sign-up, at the age check, at bottle-label scan (photos may capture people and backgrounds) and at push opt-in. |
| APP 6 | Use or disclose only for the primary purpose unless consent or another exception applies. | B2B data sharing stays **opt-in, unticked, separable**, with a plain list of who receives what. Don't feed user data to sponsors without it. |
| APP 7 | Direct marketing: simple opt-out; the Spam Act governs email and SMS. | Marketing preferences in Settings. |
| APP 8 + s 16C | Before disclosing personal information **overseas**, take reasonable steps (normally contractual) to ensure the recipient won't breach the APPs. CinCin stays **accountable** for the recipient's breaches ([OAIC APP 8 guidelines v1.3, Oct 2025](https://www.oaic.gov.au/__data/assets/pdf_file/0036/256959/APP-Guidelines-Chapter-8-Cross-border-disclosure-of-personal-information-October-2025-v1.3.PDF), [Sending personal information overseas](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/handling-personal-information/sending-personal-information-overseas)). | Data processing agreements with each vendor (table below). Name the countries in the privacy policy. |
| APP 11 | Reasonable **security**; **destroy or de-identify** personal information once no longer needed. | Turn soft delete into real deletion after a set retention window. Configure Onfido to delete images after the check. Keep Stripe records only as tax law needs (5 years for ATO records). |
| APP 12/13 | Access and correction on request, within a reasonable time (OAIC treats 30 days as reasonable for organisations) **(verify)**. | The CSV export exists; add a way to request correction. |
| NDB scheme (Part IIIC) | Notify the OAIC and affected people of eligible data breaches. | A breach response plan. ID-verification data is the highest-harm category CinCin touches. |

### Overseas disclosure by vendor

| Vendor | What it receives | Where | Note |
|--------|------------------|-------|------|
| Onfido (now Entrust) | ID document images, selfie or video, name, email, DOB | **EU (Ireland, Germany backup) by default**; US and Canada regions available ([Onfido API docs](https://documentation.onfido.com/v2/), [Entrust quick start](https://documentation.identity.entrust.com/getting-started/quick-start-guide/)) | Biometric = sensitive information. Choose the region deliberately. Set retention. The current app copy "not stored by CinCin" is accurate for CinCin but should also say Onfido stores it, where and for how long. |
| Anthropic / OpenAI / Google Vision | Bottle-label photos, tasting text, possibly user text | US | Use API terms with no training on inputs and short retention. A label photo can contain faces. |
| Stripe | Name, email, card, billing country | US (and AU) | Standard DPA. |
| SendGrid (Twilio) | Email address, name, message content | US | Standard DPA. |
| Firebase (Google) | Push tokens, device info | US | Standard DPA. |
| Error monitoring | Can capture request bodies, emails, IPs | Vendor region | Scrub PII before sending. |

### Deletion requests

- Australia has **no general right to erasure** today. The tranche 2 exposure draft
  (*Privacy Amendment (Personal Data Protection) Bill 2026*, released 31 August 2026)
  proposes a "fair and reasonable" test and an erasure right **limited to large digital
  platforms**. It is not law ([AG press conference 31 Aug 2026](https://ministers.ag.gov.au/media-centre/transcripts/press-conference-blue-room-31-08-2026), [exposure draft](https://consultations.ag.gov.au/rights-and-protections/privacy-reform/user_uploads/exposure-draft-bill-2026.pdf)).
- The duties that bite now are **APP 11.2** (destroy or de-identify when no longer needed)
  and, for any future store app, **Apple's in-app account deletion rule** (5.1.1(v)).
- **Build:** a "Delete my account" flow that hard-deletes or de-identifies after a short
  grace period and propagates to Onfido (delete applicant), Firebase (tokens), SendGrid
  (contact), and AI-provider logs where possible. Stripe and tax records are kept for the
  statutory period, and the privacy policy should say so.

### Children's Online Privacy Code

Due to be registered by **10 December 2026**. It covers social media, relevant electronic
and designated internet services "likely to be accessed by children". That test is
undefined and contested in submissions
([OAIC code page](https://www.oaic.gov.au/privacy/privacy-registers/privacy-codes/childrens-online-privacy-code), [exposure draft](https://www.oaic.gov.au/__data/assets/pdf_file/0020/262631/Exposure-Draft-Childrens-Online-Privacy-Code.pdf)).
An 18+, ID-verified, alcohol-themed service is unlikely to be "likely to be accessed by
children", but the **public marketing site** is open to anyone. The registered text and
its commencement date were not confirmed **(verify)**.

## 4. Email and push: Spam Act 2003

Applies to **commercial electronic messages**: email, SMS, MMS and instant messages that
advertise or promote goods or services ([ACMA: Avoid sending spam](https://www.acma.gov.au/avoid-sending-spam)).

| Requirement | Detail | CinCin work |
|-------------|--------|-------------|
| **Consent** | Express (ticking a box, filling in a form) or narrowly inferred from an ongoing relationship. You cannot ask for consent by email, because that request is itself a marketing message. The sender must be able to **prove** consent ([ACMA](https://www.acma.gov.au/avoid-sending-spam), [consent expectations](https://www.acma.gov.au/articles/2024-06/consent-expectations-businesses-using-direct-marketing)). | An **unticked** "Send me tips, new features and offers" checkbox at sign-up, separate from accepting the terms. Store the timestamp, wording version and source. |
| **Identify the sender** | Accurate sender name and contact details in every message. | Footer with legal entity name, ABN and contact address. |
| **Functional unsubscribe** | Every commercial message. Honour within **5 business days**; no fee; working for at least 30 days after sending; no login or extra personal data required ([ACMA unsubscribe fact sheet](https://www.acma.gov.au/sites/default/files/2024-05/Fact%20sheet%20-%20email%20and%20SMS%20unsubscribe%20rules.pdf); Spam Act Sch 2 cl 6). | One-click unsubscribe link (SendGrid suppression groups), wired back to the user's preferences. |
| **Transactional messages** | Purely factual messages (receipts, password reset, email verification, renewal notices) are not "commercial" but must still identify the sender. Adding promotion makes them commercial. | Keep receipts and the trial and renewal notices free of upsell. |
| **Push notifications** | Not confirmed whether a push to a device token is an "electronic message" to an "electronic address" under the Act ([Spam Act text](https://www.legislation.gov.au/C2004A01214/2016-03-10/2016-03-10/text/original/epub/OEBPS/document_1/document_1.html)) **(Lawyer)**. | Treat promotional pushes like email: an in-app marketing-push toggle (off by default), separate from game-invite pushes, plus OS permission. |
| **Invites to non-users** | If CinCin sends email or SMS invites to people who aren't users ("invite your mates"), ACMA treats the business as the sender. | Prefer share links the user sends themselves over CinCin-sent invite emails **(verify)**. |

## 5. Subscriptions: Australian Consumer Law and GST

### Law at launch (ACL, Schedule 2 to the Competition and Consumer Act 2010)

| Rule | What it requires | CinCin work |
|------|------------------|-------------|
| Misleading or deceptive conduct (s 18); false representations (s 29) | Trial, renewal, price and cancellation terms must be clear before the card is taken. The ACCC is suing Microsoft over subscriber communications about price rises and plan options ([ACCC v Microsoft concise statement, Oct 2025](https://www.accc.gov.au/system/files/accc-v-microsoft-concise-statement-27-october-2025.pdf)). | Checkout says: "7 days free, then A$12.99/month (incl. GST) from [date], renews monthly until you cancel. Cancel anytime in Settings." |
| Component pricing (s 48) | Total price, including GST and mandatory fees, as a single figure **at least as prominent** as any part price ([ACCC component pricing](https://www.accc.gov.au/publications/advertising-selling/advertising-and-selling-guide/pricing/component-pricing)). | The annual plan must show **A$119.88 billed yearly** at least as prominently as "A$9.99/month". Wherever "$9.99/mo" appears (site, app, ads, share cards), "billed annually at $119.88" sits next to it. |
| Consumer guarantees for services (ss 60-62) | Due care and skill, fit for purpose, reasonable time. They **cannot be excluded**. "No refunds" statements are unlawful. On cancellation for failure, a refund is due for the unconsumed part ([ACCC consumer guarantees guide](https://www.accc.gov.au/system/files/Consumer%20guarantees%20-%20A%20guide%20for%20businesses%20and%20legal%20practitioners.pdf), [not receiving services](https://www.accc.gov.au/consumers/buying-products-and-services/not-receiving-products-or-services-that-are-paid-for)). | The refund policy says: change-of-mind cancellation stops the next renewal; major failures (long outages, features removed) get pro-rata refunds. Never write "non-refundable" without the ACL carve-out. |
| Unfair contract terms (ss 23-25; civil penalties since 9 Nov 2023) | Standard-form terms that are unfair are void. Typical risks: unilateral price or feature changes without a right to exit, broad liability exclusions, auto-renew traps. The ACCC alleges Amazon Prime terms allowing adverse changes without refunds are unfair ([ACCC v Amazon concise statement](https://www.accc.gov.au/system/files/ACCC%20v%20Amazon%20-%20concise%20statement_0.pdf)). | Terms: notice of price changes (e.g. 30 days) with a right to cancel before they take effect; pro-rata refund on the annual plan if CinCin materially cuts features. |
| ACCC enforcement priority | 2025-26 and 2026-27 priorities include harmful cancellation practices: auto-renewals, early termination fees, non-cancellation clauses ([2026-27 priorities](https://www.accc.gov.au/about-us/news/speeches/acccs-compliance-and-enforcement-priorities-update-2026-27-address)). | No retention mazes in the cancel flow. |
| AI claims | Claims about AI accuracy ("identifies any bottle", "every note, with sources") are representations under s 18. | Keep marketing claims supportable. |

### Coming 1 July 2027: subscription-trap ban

The **Competition and Consumer Amendment (Unfair Trading Practices) Act 2026** (Act No. 64
of 2026; passed 2 July 2026, assent 6 July 2026) starts on **1 July 2027**
([Bill homepage](https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/Bills_Search_Results/Result?bId=r7468), [Bills Digest](https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/bd/bd2526/26bd058), [Treasury consultation](https://consult.treasury.gov.au/c2026-739506), [Minister: tricks and traps to be banned](https://ministers.treasury.gov.au/ministers/andrew-leigh-2025/media-releases/unfair-trading-tricks-and-traps-be-banned)):

- a general prohibition on **unfair trading practices**;
- **subscriptions:** key terms disclosed **at the point of sale**; **notices at set points**
  (e.g. before a free trial ends, before renewal, on price changes), with content and timing
  set by **regulations not yet confirmed**; cancellation that is easy and straightforward,
  with an **online way to cancel** where the subscriber signed up online (s 48F);
- **drip pricing:** mandatory per-transaction fees shown upfront.

**Build this before launch** (it is roughly a year out, and cheap now):

- a trial-ending email (e.g. 3 days before);
- an annual-renewal reminder email (e.g. 30 days and 7 days before);
- a price-change notice;
- one-screen cancel in Settings (Stripe customer portal or the existing
  `cancel_at_period_end`) with no forced retention offer.

### GST

- **Registration** is required once **GST turnover** (current month plus the previous 11, or
  projected next 12) reaches **A$75,000**. Below it, registration is voluntary
  ([ATO: Registering for GST](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/registering-for-gst)).
- If the selling entity is **not Australian**, the offshore-supplier rules apply to the
  same threshold: GST on digital services to Australian consumers, and the supplier
  registers ([ATO: How Australian GST works](https://www.ato.gov.au/businesses-and-organisations/international-tax-for-business/gst-for-non-resident-businesses/how-australian-gst-works)).
- **Prices shown to consumers must include GST** ([ACCC: include GST in advertised prices](https://www.accc.gov.au/media-release/accc-warns-service-sector-to-include-gst-in-advertised-prices)).
  At 10%, A$12.99 contains A$1.18 GST and A$119.88 contains A$10.90.
- **Decision for the team:** register voluntarily from launch and price GST-inclusive, or
  stay unregistered until the threshold. If prices stay at $12.99 either way, registration
  costs 1/11 of revenue. Set up Stripe Tax and invoices showing ABN and GST.
- Keep records for 5 years.

## 6. Platforms

### Stripe

Stripe's [Prohibited and Restricted Businesses](https://stripe.com/legal/restricted-businesses)
list is country-specific. It restricts "age restricted goods or services" in some
countries, and the support FAQ says Stripe "does not currently support the sale of
regulated or age-restricted items" (examples given are tobacco and vape products)
([FAQ](https://support.stripe.com/questions/prohibited-and-restricted-businesses-list-faqs)).
Alcohol is listed as restricted or prohibited in some countries (e.g. Canada restricted;
India, Thailand prohibited). Afterpay/Clearpay via Stripe prohibits alcoholic beverages
([terms](https://stripe.com/legal/afterpay-clearpay)).

CinCin sells **software subscriptions, not alcohol**, so it should not be a restricted
business. Stripe's automated review may still flag the alcohol theme.

**Do this:**

- describe the business as "subscription social tasting game (software)";
- do not enable Afterpay;
- never take payment for bottles;
- ask Stripe support for written confirmation before launch.

### Apple App Store (only if a native or wrapped app ships)

Read directly from [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/):

- **1.4.3:** "Apps that encourage consumption of ... excessive amounts of alcohol are not
  permitted. Apps that encourage minors to consume any of these substances will be rejected."
  Same design implication as ABAC 3(a): tasting, not drinking.
- **3.1.1:** subscriptions that unlock features must use **in-app purchase**. This would
  change Stripe billing and the pricing maths (commission) for store installs.
- **5.1.1(v):** apps with account creation must offer **account deletion in the app**.
- The age-rating questionnaire (alcohol references) will rate it 18+ **(verify the current
  rating tiers)**.

### Google Play (only if a Play or TWA app ships)

Play's Inappropriate Content policy bars portraying excessive drinking favourably. Its
Illegal Activities policy bars depicting or encouraging alcohol use by minors. Families
policies bar glamorising alcohol. Play Billing applies to digital subscriptions
([Developer Program Policy](https://support.google.com/googleplay/android-developer/answer/17517561?hl=en), [Inappropriate Content](https://support.google.com/googleplay/android-developer/answer/9878810?hl=en), [Illegal Activities](https://support.google.com/googleplay/android-developer/answer/9878877)).

### Ad platforms

Meta, Google Ads and TikTok each have alcohol-ad policies requiring 18+ targeting in AU
(and some ban alcohol-related ads in some markets). Not verified in this session
**(verify before the first paid campaign)**.

## State and territory variations (summary)

| Area | Varies by state? | Detail |
|------|------------------|--------|
| Minimum purchase / drinking age | No | 18 everywhere |
| Secondary supply to under-18s at home | **Yes** | Parent/guardian only: NT, QLD. Parent/guardian or with their permission: ACT, NSW, SA, TAS, VIC, WA. Responsible supervision required everywhere. Penalties differ (e.g. Qld max A$13,816 from 1 July 2026; Vic over A$22,000) |
| Liquor licensing and licensee promotion rules | **Yes**, separate Acts and regulators | Only bites if CinCin sells or supplies, gives alcohol prizes, runs events, or carries licensee promotions |
| Trade promotion permits | **Yes** | Only for chance-based prizes; skill games are exempt **(Lawyer)** |
| ACL | No (uniform federal law, also enforced by state fair trading agencies) | — |
| Privacy Act, Spam Act, GST, online safety | No (federal) | State privacy laws cover the public sector only |
| ABAC | No (national code) | Escalation for non-compliance goes to the state liquor regulator |

## Product checklist before soft launch

Pages and copy:
- [ ] `/privacy` and `/terms` live on playcincin.com (both 404 today), linked from the app
- [ ] Privacy policy covers: overseas countries per vendor; Onfido biometrics; B2B sharing;
      automated age decision (APP 1 ADM, in force 10 Dec 2026); retention; deletion; complaints
- [ ] Terms cover: 18+, host responsibility for guests, trial, auto-renewal, cancellation,
      refunds with the ACL carve-out, price-change notice and exit right
- [ ] "Taste responsibly, sip or spit, pour small" in the game setup, footer and share-card
      landing page

Consent and gates:
- [ ] Age-affirmation gate on playcincin.com (DOB), plus Onfido in the app before play
- [ ] Sign-up: Terms and Privacy acceptance (checkbox or clear clickwrap), plus an
      **unticked** marketing-email checkbox, stored with timestamp and wording version
- [ ] Explicit biometric/ID consent screen before Onfido (APP 3.3)
- [ ] Manual review route for failed age checks
- [ ] Host attests "everyone playing is 18+" before adding guests
- [ ] Push: game-invite and marketing pushes as separate toggles; marketing off by default

Email:
- [ ] Sender identity footer (entity, ABN, address); one-click unsubscribe processed well
      within 5 business days
- [ ] Transactional emails free of promotional content

Billing:
- [ ] Checkout shows the post-trial price, date, renewal cadence and how to cancel
- [ ] Annual plan shows A$119.88 billed yearly at least as prominently as A$9.99/month
- [ ] Trial-ending and renewal reminder emails; one-screen cancel in Settings
- [ ] GST registration decision; Stripe Tax; tax invoices with ABN

Content limits (game, share cards, marketing, AI output):
- [ ] No drink counts, volume or speed; the timer times guesses, not drinking
- [ ] No "drink to win", no mood or success claims, no cartoon or candy styling, nobody
      under 25 or who looks it
- [ ] Sponsored double points awarded per bottle, not per pour or round
- [ ] AI tasting notes filtered for health claims
- [ ] Social accounts age-restricted to 18+; ads targeted 18+

Data:
- [ ] DPAs with Onfido, Stripe, SendGrid, Firebase, AI providers, error monitoring
- [ ] Onfido region chosen and retention configured
- [ ] Account deletion propagates to processors; soft-deleted rows purged on a schedule
- [ ] Breach response plan (NDB scheme)

## What changes for NZ, then the UK, then the US

### New Zealand

| Area | What changes |
|------|--------------|
| Age | 18 (Sale and Supply of Alcohol Act 2012). No change to the age gate. |
| Alcohol marketing | **ASA Alcohol Advertising and Promotion Code** replaces ABAC. Use age-restriction tools; else 80%+ adult audience. Visually prominent adults must be **25+ and look it** (influencers included). No minors or visibly pregnant people. No out-of-home ads within a 300 m sightline of a school entrance ([ASA NZ code](https://asa.co.nz/codes/codes/alcohol-advertising-and-promotion-code/), [key rules](https://asa.co.nz/2023/03/01/alcohol-advertising-key-rules-for-marketers/)). |
| Privacy | **Privacy Act 2020**. IPP 12 for cross-border disclosure (comparable safeguards). **IPP 3A** (from 1 May 2026) requires notifying people when their information is collected **indirectly** (e.g. guest names entered by a host; data from Onfido) ([Privacy Amendment Act 2025](https://www.legislation.govt.nz/act/public/2025/53/en/latest/), [OPC IPP 3A guidance](https://www.privacy.org.nz/assets/DOCUMENTS/20251216-IPP3A-guidance-finalised-for-web-A1135067.pdf)). No small business exemption. |
| Email | Unsolicited Electronic Messages Act 2007: consent, sender ID, functional unsubscribe honoured within 5 working days **(verify)**. |
| Consumer | Fair Trading Act 1986 (misleading conduct, unfair contract terms) and Consumer Guarantees Act 1993. No subscription-trap law confirmed **(verify)**. |
| Tax | GST **15%**. Offshore suppliers of remote services register above NZ$60,000 **(verify)**. Prices in NZD incl. GST. |

### United Kingdom

| Area | What changes |
|------|--------------|
| Age | 18 (Licensing Act 2003). |
| Alcohol marketing | **CAP Code Section 18** (ASA). Marketing must not be directed at under-18s through media or context; **no medium with more than 25% under-18 audience**; nothing likely to "appeal particularly" to under-18s or reflect youth culture; animation or animals are high-risk. The ASA says people featured in alcohol ads must be and look 25+ (the code text found ties 25+ explicitly to alcohol-alternatives rules, so **verify**) ([CAP s18](https://www.asa.org.uk/type/non_broadcast/code_section/18.html), [ASA alcohol topic](https://www.asa.org.uk/topic/alcohol.html)). Also the Portman Group Code for drinks producers. |
| Privacy | **UK GDPR and DPA 2018**. A lawful basis per purpose. Biometric data for identification is **special category**, so **explicit consent** and likely a **DPIA**. International transfer tools for transfers to the US and Australia (the UK has no adequacy finding for Australia **(verify)**). Data subject rights incl. **erasure** within 1 month. A UK representative may be needed if there is no UK establishment. |
| Email | PECR: consent, or the "soft opt-in" for existing customers with an opt-out at every message. |
| Subscriptions | **DMCCA 2024 subscription regime**, via the *Consumer Subscription Contracts (Cancellation and Information) Regulations 2026*. Pre-contract information; reminder notices (about every 6 months for monthly plans; two notices before the first renewal of a 12-month plan; before a free trial ends); **14-day cooling-off** at sign-up and again after a trial converts or an annual plan renews; easy exit. Start date: draft guidance says contracts from 1 January 2027, the government response says spring 2027 (**verify**) ([regulations](https://www.legislation.gov.uk/ukdsi/2026/9780348287912), [draft guidance](https://assets.publishing.service.gov.uk/media/6acf97da2de3184ccf8b814e/subscription-contracts-rules-guidance.pdf), [government response](https://www.gov.uk/government/consultations/consultation-on-the-implementation-of-the-new-subscription-contracts-regime/outcome/government-response-to-consultation-on-the-implementation-of-the-new-subscription-contracts-regime-web-accessible-version)). Also Consumer Rights Act 2015 (digital content and services). |
| Online safety | If clubs let users share content with each other, the **Online Safety Act 2023** user-to-user duties apply, including a children's access assessment and highly effective age assurance where needed. ICO Age Appropriate Design Code if likely to be accessed by children **(verify)**. |
| Tax | **VAT 20%** on digital services to UK consumers; a non-UK established business registers from the first sale **(verify)**. |

### United States

| Area | What changes |
|------|--------------|
| Age | **21** (the backend already maps US to 21). |
| Alcohol marketing | Industry codes: **DISCUS** Code of Responsible Practices (**73.8%** of the audience reasonably expected to be 21+), Beer Institute and Wine Institute codes ([DISCUS code 2023](https://distilledspirits.org/wp-content/uploads/2023/05/DISCUS_CodeofResponsiblePractices_2023.pdf)). Plus TTB and state alcohol-advertising rules that bind licensees. |
| Biometrics | **Illinois BIPA**: written notice of purpose and retention, **written release** before collecting face geometry, a published retention schedule (destroy within 3 years of last interaction or when the purpose is met), and a private right of action ([740 ILCS 14](https://www.ilga.gov/Legislation/ILCS/Articles?ActID=3004&ChapterID=57&Print=True)). Texas CUBI and Washington's biometric law too. Onfido's US terms put the consent duty on the customer and provide a consent flow ([Onfido US biometric notices](https://documentation.identity.entrust.com/guide/onfido-privacy-notices-and-consent)). **Highest-risk item in the US expansion.** |
| Privacy | State comprehensive privacy laws (California CCPA/CPRA and many others): notices, opt-outs of "sale/sharing" (the B2B opt-in matters), sensitive-data consent. COPPA if under-13s ever reach it. |
| Subscriptions | **FTC Act s 5 and ROSCA**, actively enforced against free-trial and cancellation practices. The 2024 "click-to-cancel" rule was vacated by the Eighth Circuit (2025), and the FTC opened new rulemaking with an ANPRM on 13 March 2026 ([FTC Negative Option Rule page](https://www.ftc.gov/legal-library/browse/rules/negative-option-rule), [2026 testimony](https://www.ftc.gov/system/files/ftc_gov/pdf/p994811-ftc-oversight-testimony-senate-commerce-committee-2026.pdf)). **State automatic-renewal laws** (California's is strictest: affirmative consent, acknowledgement, online cancellation, renewal and price-change notices) **(verify)**. |
| Email and SMS | CAN-SPAM (opt-out honoured within 10 business days); TCPA for SMS (prior express written consent). |
| Tax | State sales tax on digital products and SaaS varies by state, with economic-nexus thresholds. |

## Questions for a lawyer

1. **Privacy Act coverage.** Is CinCin's operating entity a small business operator under
   s 6D? Does the consent-based B2B data opt-in keep the exemption, or make CinCin an
   organisation? If exempt, should it opt in under s 6EA?
2. **Automated decision-making (APP 1, from 10 Dec 2026).** Is an automated Onfido
   pass/fail that blocks play a decision that "significantly affects" rights or interests?
   What exactly must the privacy policy say, and is a human-review path needed?
3. **Biometric consent.** Is the Onfido selfie or face match "sensitive information"
   collected *by CinCin* (SDK in our app) or by Onfido? What consent wording and retention
   satisfy APP 3.3 and APP 11, and later BIPA and UK GDPR Article 9?
4. **Push notifications.** Is a promotional push notification a "commercial electronic
   message" under the Spam Act?
5. **ABAC exposure.** Should CinCin sign up to ABAC or use its pre-vetting service, given
   sponsored tastings? Do sponsored double points, timed rounds and 20-round sessions risk
   a Part 3(a) finding? Who is the "marketer" of a sponsored tasting?
6. **Liquor law.** Confirm that affiliate links to licensed retailers (with click tracking
   and price display) do not make CinCin a seller, supplier or agent under any state Act.
   Any issue if CinCin earns commission per sale?
7. **Guests and secondary supply.** Is a host attestation enough to manage CinCin's
   exposure where under-18 guests join a game in a private home?
8. **Prizes.** If seasons or sponsored tastings ever award prizes (especially alcohol), which
   states need trade-promotion permits, and what alcohol-prize limits apply?
9. **Refunds on the annual plan.** What is the right pro-rata refund position for change of
   mind versus service failure? Are the draft terms' price-change and feature-change
   clauses fair under the UCT regime?
10. **Unfair Trading Practices Act 2026.** Once the regulations are made, what are the
    required notice contents and timings for trials and renewals, and do transitional rules
    cover subscriptions sold before 1 July 2027?
11. **GST.** Which entity sells (Australian or offshore)? Register from launch or at the
    threshold? Is the A$12.99 price GST-inclusive from day one?
12. **FSANZ 1.2.7.** Does the health-claims prohibition reach AI-generated tasting notes
    shown in-app, or only advertising by the drink's supplier?
13. **Online safety.** If clubs gain chat or posting, does CinCin risk becoming an
    age-restricted social media platform (under-16 ban), or a UK OSA user-to-user service?

## Sources

Primary sources consulted (via domain-restricted search excerpts unless marked *read*):

- Federal Register of Legislation: [Spam Act 2003](https://www.legislation.gov.au/C2004A01214/2016-03-10/2016-03-10/text/original/epub/OEBPS/document_1/document_1.html); [Privacy Act 1988 compilation](https://www.legislation.gov.au/C2004A03712/2024-12-11/2024-12-11/text/original/pdf)
- OAIC: [APP guidelines (consolidated, May 2026)](https://www.oaic.gov.au/__data/assets/pdf_file/0032/263777/12-May-Consolidated-APP-Guidelines-Updated-Chapter-3.pdf); [APP 8 guidelines v1.3](https://www.oaic.gov.au/__data/assets/pdf_file/0036/256959/APP-Guidelines-Chapter-8-Cross-border-disclosure-of-personal-information-October-2025-v1.3.PDF); [Sending personal information overseas](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/handling-personal-information/sending-personal-information-overseas); [ADM transparency resources](https://www.oaic.gov.au/news/media-centre/new-resources-on-transparency-for-use-of-ai-and-automated-decision-making); [ADM issues paper](https://www.oaic.gov.au/__data/assets/pdf_file/0027/263925/ADM-Issues-Paper.pdf); [Children's Online Privacy Code](https://www.oaic.gov.au/privacy/privacy-registers/privacy-codes/childrens-online-privacy-code)
- Attorney-General's Department: [Privacy Amendment (Personal Data Protection) Bill 2026 exposure draft](https://consultations.ag.gov.au/rights-and-protections/privacy-reform/user_uploads/exposure-draft-bill-2026.pdf); [press conference 31 Aug 2026](https://ministers.ag.gov.au/media-centre/transcripts/press-conference-blue-room-31-08-2026)
- ACMA: [Avoid sending spam](https://www.acma.gov.au/avoid-sending-spam); [Unsubscribe rules fact sheet](https://www.acma.gov.au/sites/default/files/2024-05/Fact%20sheet%20-%20email%20and%20SMS%20unsubscribe%20rules.pdf); [Consent expectations](https://www.acma.gov.au/articles/2024-06/consent-expectations-businesses-using-direct-marketing)
- ACCC: [Component pricing](https://www.accc.gov.au/publications/advertising-selling/advertising-and-selling-guide/pricing/component-pricing); [GST in advertised prices](https://www.accc.gov.au/media-release/accc-warns-service-sector-to-include-gst-in-advertised-prices); [Consumer guarantees guide](https://www.accc.gov.au/system/files/Consumer%20guarantees%20-%20A%20guide%20for%20businesses%20and%20legal%20practitioners.pdf); [Enforcement priorities 2026-27](https://www.accc.gov.au/about-us/news/speeches/acccs-compliance-and-enforcement-priorities-update-2026-27-address); [ACCC v Microsoft](https://www.accc.gov.au/system/files/accc-v-microsoft-concise-statement-27-october-2025.pdf); [ACCC v Amazon](https://www.accc.gov.au/system/files/ACCC%20v%20Amazon%20-%20concise%20statement_0.pdf)
- Parliament and Treasury: [Unfair Trading Practices Bill 2026 homepage](https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/Bills_Search_Results/Result?bId=r7468); [Bills Digest](https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/bd/bd2526/26bd058); [Treasury consultation](https://consult.treasury.gov.au/c2026-739506); [Decision RIS](https://treasury.gov.au/sites/default/files/2025-12/p2025-723145-dris-unfair-trading-practices.pdf)
- ATO: [Registering for GST](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/registering-for-gst); [How Australian GST works (non-residents)](https://www.ato.gov.au/businesses-and-organisations/international-tax-for-business/gst-for-non-resident-businesses/how-australian-gst-works)
- ABAC Scheme: [Revised Code 28-4-2023](http://www.abac.org.au/wp-content/uploads/2023/04/Revised-ABAC-Responsible-Alcohol-Marketing-Code-28-4-2023.pdf); [Guidance Notes 2023](http://www.abac.org.au/wp-content/uploads/2023/04/ABAC-Guidance-Notes-28-4-2023.pdf); determinations [241 & 242/21 Nightplan](http://www.abac.org.au/wp-content/uploads/2021/11/241-242-21-Determination-22-November-2021.pdf), [22/20](http://www.abac.org.au/wp-content/uploads/2020/03/22-20-Determination-BWS-25-March-2020.pdf), [66/23](http://www.abac.org.au/wp-content/uploads/2023/05/66-23-FINAL-Determination-29-May-2023.pdf), [239/21](http://www.abac.org.au/wp-content/uploads/2021/11/239-21-Determination-Hard-Fizz-15-November-2021.pdf), [117/17](http://www.abac.org.au/wp-content/uploads/2018/01/117-17-Determination-4-1-18.pdf), [30/22](http://www.abac.org.au/wp-content/uploads/2022/05/30-22-Determination-40-20-Beer-17-May-2022.pdf); [Annual Report 2023](https://www.abac.org.au/wp-content/uploads/2024/04/ABAC-Annual-Report-2023-FINAL.pdf)
- eSafety: [Social media age restriction assessment](https://www.esafety.gov.au/about-us/industry-regulation/social-media-age-restrictions/assessment); [Online safety codes](https://www.esafety.gov.au/newsroom/media-releases/online-safety-codes-introduce-real-world-protections-for-children-online)
- States: [health.gov.au alcohol laws](https://www.health.gov.au/topics/alcohol/about-alcohol/alcohol-laws-in-australia); [Vic underage drinking in private homes](https://www.vic.gov.au/underage-drinking-in-private-homes); [Qld supplying alcohol to under 18s](https://www.qld.gov.au/law/crime-and-police/types-of-crime/supply-alcohol-under-18s)
- Platforms: Apple [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (*read*); Stripe [Restricted Businesses](https://stripe.com/legal/restricted-businesses), [FAQ](https://support.stripe.com/questions/prohibited-and-restricted-businesses-list-faqs); Google Play [Developer Program Policy](https://support.google.com/googleplay/android-developer/answer/17517561?hl=en)
- Onfido/Entrust: [API docs (regions)](https://documentation.onfido.com/v2/); [US biometric notices and consent](https://documentation.identity.entrust.com/guide/onfido-privacy-notices-and-consent)
- NZ: [Privacy Amendment Act 2025](https://www.legislation.govt.nz/act/public/2025/53/en/latest/); [OPC IPP 3A guidance](https://www.privacy.org.nz/assets/DOCUMENTS/20251216-IPP3A-guidance-finalised-for-web-A1135067.pdf); [ASA Alcohol Advertising and Promotion Code](https://asa.co.nz/codes/codes/alcohol-advertising-and-promotion-code/)
- UK: [CAP Code s18](https://www.asa.org.uk/type/non_broadcast/code_section/18.html); [Consumer Subscription Contracts Regulations 2026](https://www.legislation.gov.uk/ukdsi/2026/9780348287912); [Government response](https://www.gov.uk/government/consultations/consultation-on-the-implementation-of-the-new-subscription-contracts-regime/outcome/government-response-to-consultation-on-the-implementation-of-the-new-subscription-contracts-regime-web-accessible-version)
- US: [FTC Negative Option Rule](https://www.ftc.gov/legal-library/browse/rules/negative-option-rule); [Illinois BIPA](https://www.ilga.gov/Legislation/ILCS/Articles?ActID=3004&ChapterID=57&Print=True); [DISCUS Code](https://distilledspirits.org/wp-content/uploads/2023/05/DISCUS_CodeofResponsiblePractices_2023.pdf)
