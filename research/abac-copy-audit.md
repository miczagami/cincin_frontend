# Does CinCin's copy comply with ABAC and Apple's alcohol rules?

Ticket: [#30](https://github.com/miczagami/cincin_frontend/issues/30). Map: [#5](https://github.com/miczagami/cincin_frontend/issues/5).
Researched 2026-11-18 against `origin/main` of `cincin_frontend` (`a0f4350`), `cincin_backend` (`0232bae`) and `cincin_www` (`4a6a4a7`). Every file:line below is on those commits.

> **This is research, not legal advice.** The rules come from
> [australian-launch-legal.md](australian-launch-legal.md) (ABAC section and Apple 1.4.3), which this audit
> applies to the product rather than re-deriving.

> **Source limits.** This session's network blocks `abac.org.au`, so the Code PDF could not be opened.
> The current clause wording was confirmed through web-search extracts limited to `abac.org.au`
> (marked **[search]**). Check clause numbers against the
> [live Code](http://www.abac.org.au/wp-content/uploads/2023/04/Revised-ABAC-Responsible-Alcohol-Marketing-Code-28-4-2023.pdf)
> before quoting them to a sponsor.

## The answer

**Most of the product is about tasting rather than drinking, and it mostly complies.** No in-app
string tells a player to drink, sip or finish anything. The round timer times a typed guess. The
visual identity (espresso, merlot and gold, no cartoons, no people) gives minors nothing to latch on
to. The risk is concentrated in a handful of strings and two mechanics.

- **5 clear problems.** Fix all five before launch. Each one is a cheap copy or config change.
  1. The **"Iron Stomach"** season award.
  2. **"Share the results, or pour another."** on the marketing site.
  3. A **hard-coded sponsored card for a real gin brand, "Double points this weekend"**, plus mock
     "recent games" with real brands, shown on every user's home screen.
  4. The season-ending push **"Play your final games!"**
  5. Share links that point to **`https://cincin.app`**, not the age-gated `playcincin.com`.
- **11 judgment calls.** Each is defensible today but should be tightened. The big ones:
  - rounds up to 50 and a timer down to 30 s, with no "sip or spit" guidance anywhere;
  - sponsored double points, which are currently a no-op in the scoring code;
  - a season Champion decided by total score, which rewards playing more games;
  - "genuinely addictive" in a testimonial.
- **Apple 1.4.3** ("Apps that encourage consumption of ... excessive amounts of alcohol are not
  permitted") flags the same items as ABAC Part 3(a). Nothing extra turned up, but the store listing
  must never call CinCin a "drinking game".

## Rules applied

| Ref | Rule (paraphrased) | Source |
|-----|--------------------|--------|
| **3(a)(i)** | Must not show, encourage or treat as amusing alcohol consumption inconsistent with the Australian Alcohol Guidelines, e.g. excessive consumption (more than 10 standard drinks a week or 4 on any one day). | Revised Code, in force 1 Aug 2023 [search: [Q3 2023 report](http://www.abac.org.au/wp-content/uploads/2023/10/ABAC-Q3-2023-Quarterly-Report-16-Oct-2023.pdf)] |
| **3(a)(ii)** | Must not show, encourage or treat as amusing rapid alcohol consumption, misuse or abuse of alcohol. | Same [search] |
| **3(b)** | No strong or evident appeal to minors. | [Legal research §1](australian-launch-legal.md#what-abac-requires-current-code-revised-28-april-2023-in-force-from-1-august-2023) |
| **3(c)** | Must not suggest alcohol significantly changes mood (3(c)(i), applied in [115/23](https://www.abac.org.au/adjudication/115-23/)) or contributes to personal, social, sporting or other success. The revised success wording is **unverified**. | Legal research §1; [search] |
| **Placement** | Use the available age-restriction controls. A platform "primarily related to alcohol" must age-restrict the whole environment. | [Nightplan 241 & 242/21](http://www.abac.org.au/wp-content/uploads/2021/11/241-242-21-Determination-22-November-2021.pdf) |
| **Incentives** | The panel separates an incentive to *purchase* (acceptable) from an incentive to *consume quickly or immediately*, such as a happy hour (a breach risk). | [Hard Fizz 239/21](http://www.abac.org.au/wp-content/uploads/2021/11/239-21-Determination-Hard-Fizz-15-November-2021.pdf) |
| **Moderation cue** | Words that signal moderate drinking ("a couple") count in the marketer's favour. | [158/25](http://www.abac.org.au/wp-content/uploads/2025/12/158-25-FINAL-Determination-2-December-2025.pdf) [search] |
| **Apple 1.4.3** | "Apps that encourage consumption of ... excessive amounts of alcohol are not permitted. Apps that encourage minors to consume any of these substances will be rejected." | [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), via legal research |
| **ACL s18, s29(1)(h)** | No misleading conduct. No false claim of a sponsorship, approval or affiliation. These are consumer law, not ABAC; the audit cites them only where a finding also touches them. | Competition and Consumer Act 2010, Sch 2 |

A note on where the copy lives: `src/i18n/en.json` is **not imported anywhere** and is not valid
JSON (a parse error at line 99). The only strings i18next loads are the few in `src/i18n/index.js`.
Almost every visible string is hard-coded in the JSX. Copy fixes must edit the pages, and a future
copy lint has to scan JSX, backend notification strings and `cincin_www/index.html`, not only i18n.

## Clear problems

### C1. "Iron Stomach" season award

- **Where:**
  - `cincin_backend/src/services/cellarClubService.js:669,697-706` (`awards.ironStomach`, given to the player who "played every game");
  - `cincin_frontend/src/context/clubStore.js:21` (`{ emoji: '💪', label: 'Iron Stomach' }`);
  - `cincin_frontend/src/i18n/en.json:91` (unused).
- **String:** "Iron Stomach" 💪, shown on the Season Complete screen.
- **Risk:** **3(a)(i)/(ii)** and **Apple 1.4.3**. The name praises tolerance for alcohol, and the
  award rewards whoever played the most games, so it is a volume prize with a "hard drinker" label.
  The panel reads drinking-capacity humour as treating misuse as amusing.
- **Rewrite:** Rename it and change the rule. **"Steady Palate 🎯: most consistent scores across the
  season"**, using the lowest score variance with a minimum number of games. If a participation award
  is wanted, use **"Regular at the Table"**, and only on a non-volume rule such as "played in every
  week of the season". Rename the backend key too (`steadyPalate`), so the old name does not
  resurface in exports.

### C2. "Share the results, or pour another."

- **Where:** `cincin_www/index.html:743`, the "See the reveal" step of How It Works.
- **Risk:** **3(a)(i)**. It invites another drink straight after a tasting session. This is the
  plainest consumption cue on any surface.
- **Rewrite:** "Every note uncovered, with sources. Your Palate Profile updates itself. **Share the
  results, or save the bottle for next time.**"

### C3. Hard-coded sponsored card and mock games with real brands on the home screen

- **Where:** `cincin_frontend/src/pages/home/HomePage.jsx`:
  - `:74-78`: a "Sponsored" pill, "Four Pillars Rare Dry Gin", "Double points this weekend. Can you
    taste the Tasmanian pepperberry?";
  - `:13-16`: "Penfolds Bin 389 … Today" and "Stone & Wood Pacific Ale … Yesterday";
  - `:63-64`: the "Friday Night Vino · Season 2 · 2nd of 6" club card.

  All of this is static mock data, shown to every signed-in user.
- **Risk:**
  1. **ACL s29(1)(h)/s18:** the card presents a real producer as a paying sponsor without a deal.
  2. **3(a) and the incentive line:** "Double points *this weekend*" is a time-limited reward for
     consuming one brand. That is the "consume now" incentive the Hard Fizz panel distinguished from
     a purchase incentive.
  3. The fake history shows the user drinking on consecutive days ("Today", "Yesterday").
- **Rewrite:** Drive the section from `GET` discovery data (as `DiscoveryPage` does) and render
  nothing when it is empty. Drive "Recent games" and "My Cellar Club" from the user's own data, with
  empty states. For the sponsored template, see J3: **"Featured tasting · Can you find the Tasmanian
  pepperberry? Bonus points the first time you play this bottle."** It has no weekend window and no
  multiplier wording.

### C4. "Play your final games!" season-ending reminder

- **Where:** `cincin_backend/src/jobs/cronScheduler.js:338-339`. Title "{club} season ending
  tomorrow" or "in 7 days". Body "The current season ends tomorrow. **Play your final games!**" Sent
  as push and email by `sendSeasonEndingReminders`, 1 day and 7 days before the end.
- **Risk:** **3(a)(ii)** and the Hard Fizz incentive line. Season points are cumulative (see J4), so
  this nudges members to fit more tastings into the last 24 hours to climb the table. It is a
  deadline-driven prompt to consume.
- **Rewrite:** Title: "{club} season wraps up tomorrow". Body: **"Standings lock tomorrow. See where
  you finish."** For the 7-day reminder: "One week left in {club}'s season. Check the standings."
  Do not ask the member to play.

### C5. Share links go to `https://cincin.app`

- **Where:**
  - `cincin_frontend/src/pages/palate/PalateWrappedPage.jsx:296,324-325` (Web Share `url` and the
    "Copy Link" text);
  - `cincin_frontend/src/pages/clubs/SeasonEndPage.jsx:171`.

  The rendered card itself prints `playcincin.com` (`PalateWrappedPage.jsx:217`).
- **Risk:** **Placement.** Share cards are CinCin's marketing, so the link they carry must land on an
  age-gated CinCin page ([legal research §1](australian-launch-legal.md)). `cincin.app` is not the
  domain the brand uses anywhere else, and it is not known whether CinCin owns it. If CinCin does
  not, every share sends people to a third party's site.
- **Rewrite:** Use one constant, `SHARE_URL = 'https://playcincin.com'` (later an age-gated
  `/s/:id` landing page), in all share calls.

## Judgment calls

### J1. Round count and timer range, with no "sip or spit" guidance

- **Where:**
  - `cincin_frontend/src/pages/game/GameSetupPage.jsx:20-21`: `TIMER_OPTIONS = [30, 45, 60, 90, 120]`
    and `ROUND_OPTIONS = [5, 10, 15, 20, 30, 50]`, offered to Pro users;
  - `cincin_backend/src/validators/game.js:25-32`: accepts 10-300 s and 1-100 rounds;
  - defaults of 60 s and 20 rounds in `cincin_backend/src/config/index.js:77-78,96-97`;
  - the countdown pulses red at `cincin_frontend/src/pages/game/GamePlayPage.jsx:270-278`;
  - the marketing mockup shows "42s LEFT" (`cincin_www/index.html:654-655`).
- **Why it is a judgment call:** one game is one bottle, and each round is a typed guess. No copy
  says to drink per round, so on the strings alone this is not a breach. A complaint, though, would
  read "50 rounds, 30-second timer, red pulsing countdown" as a drinking-game format
  (**3(a)(ii)**, **Apple 1.4.3**). In *Nightplan* the panel held drinking-game content to be a breach.
- **Rewrite:**
  - Cap rounds at **20** in the UI and validator, and set the timer floor at **45 s**.
  - Label the control **"Guess timer"**, not "Round Timer".
  - Add one line under the timer on the setup screen: **"One small pour is all you need. Sip or spit:
    the timer is for your guess, not your glass."**
  - Show the same line on the first round of each game.

### J2. Sponsored double points

- **Where:**
  - `cincin_backend/prisma/schema.prisma:716`: `doublePoints Boolean @default(true)`;
  - `cincin_backend/src/services/commerceService.js:272` sends `doublePoints`;
  - `cincin_frontend/src/pages/commerce/DiscoveryPage.jsx:86-87` renders "{n}× Points" from
    `item.pointMultiplier`, a field the API never sends, so the pill never shows;
  - `calculatePoints` (`cincin_backend/src/utils/helpers.js:28-37`) has no multiplier, so the points
    are never actually doubled.
- **Why it is a judgment call:** a reward for choosing a brand is an incentive to purchase, which
  the Hard Fizz panel accepted. A per-guess multiplier advertised for a limited window drifts towards
  "consume this now". The legal research's rule applies: **award per bottle, not per pour or round,
  and do not stack**.
- **Rewrite:**
  - Default `doublePoints` to `false`.
  - Replace the multiplier with a **one-off flat bonus per user per sponsored bottle**, e.g. +10 on
    the first completed game.
  - Pill copy: **"Featured · Bonus points"**, never "2× Points this weekend".
  - Get each sponsor's headline and description ABAC pre-vetted (see J9).

### J3. Season Champion and weekly digest reward volume

- **Where:**
  - the Champion is the "highest total score" (`cincin_backend/src/services/cellarClubService.js:678-685`);
  - the weekly digest reads "{leader} leads with {n} pts. You're #{rank} with {n} pts"
    (`cincin_backend/src/jobs/cronScheduler.js:267-274`);
  - "{name} wins with {n} points!" (`cellarClubService.js:654`);
  - the site says "Points carry across every game" (`cincin_www/index.html:764`).
- **Why it is a judgment call:** cumulative points mean more games, and so more bottles opened, wins
  the season. Each game on its own is a palate-skill contest, which is fine under 3(c). The volume
  incentive comes from the season aggregation.
- **Rewrite:**
  - Rank the season on **average score per game with a minimum number of games**. "Sharpest Palate"
    already does this, so make it the headline award.
  - Or count only each player's **best N games per week**.
  - Change the site line to "Your best games count towards the season table."

### J4. Counting games on Wrapped, emails and the profile

- **Where:**
  - the Palate Wrapped card stat "Games" (`cincin_frontend/src/pages/palate/PalateWrappedPage.jsx:97,387-388`);
  - the share text "…accuracy across {n} games" (`:287,295,324`);
  - the Wrapped email "Games" (`cincin_backend/src/services/notificationService.js:840-841`);
  - the quarterly email "Games" (`:912-913`) and the push "You played {n} game(s) this quarter"
    (`cincin_backend/src/jobs/cronScheduler.js:218`);
  - the profile (`cincin_frontend/src/pages/profile/ProfilePage.jsx:152`).
- **Why it is a judgment call:** the ticket's own constraint is "no drink counts", and these show no
  glasses or volume. On a public share card, though, "40 games this month" reads as 40 drinking
  sessions.
- **Rewrite:** On anything shareable (the Wrapped card, share text, emails), replace "Games" with
  **"Notes found"** or **"Styles explored"**. The share text becomes "🍷 {acc}% accuracy, {n} notes
  found. Top strength: {cat}." Keep a games count only on private screens (profile, settings).

### J5. "genuinely addictive" testimonial

- **Where:** `cincin_www/index.html:862`: "The Palate Profile tracking is genuinely addictive."
- **Why it is a judgment call:** the word describes the tracking, not the drink, but on an alcohol
  site "addictive" invites a **3(a)(ii)** (misuse) reading and is the line a complainant would quote.
- **Rewrite:** "The Palate Profile tracking keeps me coming back to learn more." Confirm that the
  quote is real and that the person agreed to the edit (see Open questions).

### J6. Gambling framing in "Lock In Your Score"

- **Where:** `cincin_www/index.html:784-785`: "Bank your points any time and watch everyone else risk
  theirs. Knowing when to stop is half the game." Also "Lock in my score →" in the mockup (`:665`).
- **Why it is a judgment call:** this is not an ABAC clause, but "bank" and "risk" are wagering
  language, and alcohol plus gambling cues is a combination reviewers notice (the Apple age rating,
  Ad Standards). "Knowing when to stop" is ambiguous on an alcohol site.
- **Rewrite:** "**Lock In Your Score.** Happy with your haul? Lock it in any time, and let everyone
  else keep hunting for notes."

### J7. No responsible-consumption message anywhere

- **Where:** absent from:
  - the game setup and play screens;
  - the Wrapped card footer (`PalateWrappedPage.jsx:217-218`);
  - the email footer (`cincin_backend/src/services/notificationService.js:796-806`);
  - the site footer (`cincin_www/index.html:928`, which has only "Must be 18+ to play").
- **Why it is a judgment call:** ABAC does not require a message. It is the cheapest evidence that
  the product is about tasting, and the legal research's checklist already asks for one.
- **Rewrite:** Use one line everywhere: **"Taste responsibly · Sip or spit · 18+"**. Put it in the
  site footer, the email footer, under the Wrapped card URL and on the game setup screen (see J1).

### J8. Sponsor copy is published without review

- **Where:** the `SponsoredTasting.headline`, `description` and `badgeText` fields
  (`cincin_backend/prisma/schema.prisma:707-716`) go straight to the Discovery feed
  (`commerceService.js:262-273`). There is no review state; `isActive` defaults to `true`.
- **Why it is a judgment call:** this is a process gap, not a string. The brand is a signatory and
  usually pre-vets its own copy, but CinCin publishes it.
- **Rewrite:** Add a `reviewStatus` (`DRAFT` → `APPROVED`), default `isActive` to `false`, and record
  the ABAC pre-vetting reference before activation.

### J9. Notification send times

- **Where:** the cron jobs run at fixed server-clock times
  (`cincin_backend/src/jobs/cronScheduler.js:47,58,69,80`) with no `timezone` option. If the server
  runs in UTC (**unverified**), the daily 10:00 season reminder reaches Australian users at
  20:00-21:00.
- **Why it is a judgment call:** this is low risk on its own, but it pairs badly with "Play your
  final games!" (C4).
- **Rewrite:** Pass `{ timezone: 'Australia/Sydney' }` to `cron.schedule` and send reminders around
  midday.

### J10. Brand voice "Playful"

- **Where:** `cincin_frontend/documentation/BRAND.md:41`: "Playful, direct, social".
- **Why it is a judgment call:** the visuals pass 3(b): an espresso, merlot and gold palette, the OG
  image (`cincin_www/og-image.png`), no cartoons and no people. But "playful" is the word panels use
  when they find appeal to minors, and the voice guide has no alcohol guardrails.
- **Rewrite:** Add a "Never" list to BRAND.md (see [Patterns to avoid](#patterns-to-avoid-in-future-copy)).

### J11. Store listing (only when a store app ships)

- **Why it is a judgment call:** there is no listing yet. Apple 1.4.3 reviewers judge the
  description and screenshots.
- **Rewrite:** Describe CinCin as "a tasting game", never a "drinking game". Avoid screenshots that
  show the timer in its red warning state, and include the "Sip or spit" line in the first
  screenshot.

## Reviewed and fine

These were checked and need no change:

- "Settle it with your mates." (OG and Twitter description, `cincin_www/index.html:14,24`)
- "whose palate wins the table" (`index.html:7,608`; app `index.html:9`)
- "bragging rights" (`:712`)
- "Grab a bottle, gather your mates, and settle it once and for all." (`:895`, a purchase cue, not
  a consumption cue)
- "We used to just drink wine — now we actually pay attention to what we're tasting." (`:846`,
  which actually supports moderation)
- "weekly grudge match" (`:854`)
- "{name} won with {n} points! 🏆" (`GameResultsPage.jsx:45`, `SeasonEndPage.jsx:163,170`): winning
  is framed as palate skill, not as the drink's effect, which is fine under 3(c).
- "CinCin is for legal-age drinkers" (`src/i18n/index.js:8`)
- "Friday Night Vino" and "Friday Night Tasters" club placeholders
- 🍷🍺🥃 drink-type emoji on Wrapped
- the game and club invite share texts (`GameLobbyPage.jsx:64-65`, `ClubDetailPage.jsx:137-138`)
- the AI note prompt (`cincin_backend/src/services/scanService.js`, `buildSynthesisPrompt`): it asks
  only for flavour descriptors. Health-claim filtering is a separate FSANZ item in the legal research.

## Patterns to avoid in future copy

1. **Never tell anyone to drink, pour, refill, finish or "have another"**, in any surface: app,
   push, email, site or share text. Talk about *tasting, guessing, noticing*.
2. **No tolerance or capacity jokes:** iron stomach, hollow legs, "can handle it", hangovers.
3. **No deadline or time-window nudges to play:** "this weekend", "before midnight", "final games",
   "happy hour". Deadlines can *inform* ("standings lock tomorrow"); they must not *urge*.
4. **Never reward volume.** Don't rank, award or celebrate by number of games, bottles or sessions
   on anything shared. Rank by accuracy or average, and count *notes found* or *styles explored*.
5. **Timers time guesses.** Label them as such, keep them relaxed (45 s minimum), and cap a session
   at 20 rounds.
6. **Sponsored rewards are flat, one-off per bottle**, copy-vetted, and never multipliers, streaks
   or time-limited.
7. **No real brand in mock or placeholder data** that ships to users.
8. **Success comes from the palate, never the drink.** Nothing like "a glass makes you sharper" or
   "liquid courage", and no mood claims (3(c)(i)).
9. **Avoid addiction and gambling words:** addictive, hooked, fix, bank, bet, risk, jackpot.
10. **Every share link lands on `playcincin.com`** behind the age gate, and every surface that
    leaves the app carries "Taste responsibly · Sip or spit · 18+".

## Open questions

1. **Are the marketing site's testimonials (`index.html:846-865`) and stats counters ("12,400+
   bottles scanned", "48,200+ games played", "1,850+ Cellar Clubs", `:702-704`) real?** The site
   also says it is in closed beta. If they are not real, they are misleading under ACL s18 and must
   go before launch. ABAC does not cover this.
2. **Does CinCin own `cincin.app`?** Every Wrapped and season share links there today (C5).
3. **What is the sponsored "double points" mechanic meant to be?** It is a no-op today: there is no
   multiplier in scoring, and the UI reads a field the API never sends. Decide it (J2's flat one-off
   bonus is the recommendation) before any sponsor deal is signed, because the sponsor contract will
   describe it.
4. **Should the season be ranked by average rather than total (J3)?** This is a product decision
   with a compliance angle.
