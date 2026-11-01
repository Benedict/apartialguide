# To do (Benedict)

Things only you can do. Claude can't change repository settings, sign up for services or make these decisions for you. Features and ideas for later are in `BACKLOG.md`, the roadmap.

Repository settings are under **Settings → Secrets and variables → Actions** on GitHub. A **variable** can be public; a **secret** stays hidden.

## Soon: these finish the site

- [ ] **Mailing list.** At the edge of an area not open yet, the walk can link to a sign-up. Sign up with a provider (Buttondown is the suggestion: it gives you a sign-up page and can send without tracking), turn off open and click tracking, and add the sign-up page's address as the variable `SIGNUP_URL`. Tell Claude which provider, so the privacy page can name it.
- [ ] **Contact email.** Add the variable `CONTACT_EMAIL`: an address you're happy to make public. The privacy page shows it, as the UK GDPR expects.
- [ ] **Private security reports.** Settings → Code security → Private vulnerability reporting → Enable. `SECURITY.md` and the Code of Conduct send reports there.
- [ ] **Rename the repository** to `apartialguide`: Settings → General → Repository name. Then tell Claude, who will update the links on the site.
- [ ] **Delete the `CROYDON_WALK` variable**, if it's still there. Nothing uses it now.
- [ ] **Read the site on your phone**: the privacy page and About in particular. Tell Claude anything you'd put differently.

## Decisions

- [ ] **Sponsoring an area.** What does a sponsor get (a credit on About, or on the area's "not open yet" note)? How do they pay? Can a sponsor's name appear in the walk at all? (Guide itself never names anyone, so a credit would be the page's, not Guide's.)
- [ ] **Keep the site free to use.** Digital Britannia's terms (below) forbid its use in any site that charges a fee. Asking for voluntary support doesn't charge a fee. If you offer sponsorship with a credit in return, ask Mike Haken first. Bomb Sight isn't used; writing to Croydon Archives for the borough's air raid records is the better route.
- [ ] **Geograph photographs.** Their licence asks for each photographer's name. Name them where a photograph is mentioned, or leave Geograph out?
- [ ] **Sources to leave out.** If any source shouldn't be used, list it on `LEAVE_OUT=` in `data/records/use.env`.
- [ ] **The drawn route ("Auster step 3").** Answer the open questions in its brief so it can be built.
- [ ] **A few lines about you** for the About page, and a link if you want one.
- [ ] **Count visits, or not.** With the variable `GA_MEASUREMENT_ID` (a Google Analytics measurement ID), the site counts visits once a reader says yes, and never what they type; without it nothing is counted. The roadmap's next phase is chosen by what readers do, so without counting it is chosen blind.
- [ ] **"lived" or "loved"** in Guide's introduction: say which.

## Keys, for more sources (optional)

- [ ] **Energy certificates.** Register at <https://epc.opendatacommunities.org/>, then add the secrets `EPC_EMAIL` and `EPC_API_KEY`.
- [ ] **Geograph photographs.** Register at <https://www.geograph.org.uk/>, ask for an API key, and add the secret `GEOGRAPH_API_KEY`.
- [ ] Once either is in, tell Claude, who will fetch them.
- [ ] **Comparing narrator models.** Create a key at <https://openrouter.ai/>, add a little credit, and add the secret `OPENROUTER_API_KEY`. Then Actions → Compare models → Run workflow.

## Letters and permissions (optional)

- [ ] **The Blitz bomb census.** Bomb Sight's terms allow only non-commercial _individual, academic and research_ use, and forbid commercial exploitation. Showing its bombs to everyone in a public walk isn't clearly any of those, so it needs their written permission. Two routes: send the drafted letter (`docs/letters/bomb-sight.md`; check Dr Kate Jones is still the right person), or write to Croydon Archives for the borough's own air raid records (`docs/letters/croydon-archives.md`; check their current enquiries address). Also look at Surrey History Centre's Surrey WW2 Bomb Map, launched in June 2026, which is said to include Croydon: check its terms, and whether it covers Croydon as published. If its terms allow reuse, it may be the best source of all.
- [ ] **Digital Britannia** (Roman roads and sites). The licence is confirmed: © Mike Haken 2026, CC BY-NC 4.0, always credited, and never in a site, app or print publication that charges a fee without his written consent. This site is free, so it can be used. Download the GeoJSON layers (roads, settlements, military sites, camps, milestones) in longitude and latitude from <https://roadsofromanbritain.org/digital-britannia/downloads.html>, put them in a folder, and tell Claude where they are. If they come only in British National Grid, say so; they need converting first.
- [ ] **Civilian war dead.** The CWGC's records need a written licence. Write to them if you want them told.
