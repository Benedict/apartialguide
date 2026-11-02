# To do (Benedict)

Things only you can do. Claude can't change repository settings, sign up for services or make these decisions for you. Features and ideas for later are in `BACKLOG.md`, the roadmap.

Repository settings are under **Settings → Secrets and variables → Actions** on GitHub. A **variable** can be public; a **secret** stays hidden.

## Soon: these finish the site

- [ ] **Keep the map up to date: cadence and key.** A scheduled refresh (Geofabrik's latest London and Surrey extracts, cut to the borough, the records fetched again) would arrive as a pull request with a report of what changed and which stops lose their prose, never straight onto the site. Say how often: quarterly is the suggestion, as each refresh means writing prose again where the map changed. With the secret `ANTHROPIC_API_KEY` (a paid Anthropic API key), the Narrate workflow can write that prose unattended; without it, it is written in a session.
- [ ] **Read the site on your phone**: the privacy page and About in particular. Tell Claude anything you'd put differently.

## Decisions

- [ ] **Sponsoring an area.** What does a sponsor get (a credit on About, or on the area's "not open yet" note)? How do they pay? Can a sponsor's name appear in the walk at all? (Guide itself never names anyone, so a credit would be the page's, not Guide's.)
- [ ] **Keep the site free to use.** Digital Britannia's terms (© Mike Haken 2026, CC BY-NC 4.0, used for the Roman roads and sites) forbid its use in any site that charges a fee. Asking for voluntary support doesn't charge a fee. If you offer sponsorship with a credit in return, ask Mike Haken first. Bomb Sight isn't used; writing to Croydon Archives for the borough's air raid records is the better route.
- [ ] **Sources to leave out.** If any source shouldn't be used, list it on `LEAVE_OUT=` in `data/records/use.env`.
- [ ] **The drawn route ("Auster step 3").** Answer the open questions in its brief so it can be built.
- [ ] **A few lines about you** for the About page, and a link if you want one.
- [ ] **"lived" or "loved"** in Guide's introduction: say which.

## Keys (optional)

- [ ] **Comparing narrator models.** Create a key at <https://openrouter.ai/>, add a little credit, and add the secret `OPENROUTER_API_KEY`. Then Actions → Compare models → Run workflow.

## Letters and permissions (optional)

- [ ] **The Blitz bomb census.** Bomb Sight's terms allow only non-commercial _individual, academic and research_ use, and forbid commercial exploitation. Showing its bombs to everyone in a public walk isn't clearly any of those, so it needs their written permission. Two routes: send the drafted letter (`letters/bomb-sight.md` in the private `apartialguide-data` repository; check Dr Kate Jones is still the right person), or write to Croydon Archives for the borough's own air raid records (`letters/croydon-archives.md` there; check their current enquiries address). Also look at Surrey History Centre's Surrey WW2 Bomb Map (launched June 2026). Its 1945 Surrey most likely covers the old Coulsdon and Purley Urban District (Coulsdon, Purley, Kenley, Sanderstead, probably Selsdon) but not the County Borough of Croydon, which was outside Surrey County Council's area. Its terms aren't known. Either allow `www.exploringsurreyspast.org.uk` in this environment's network settings so Claude can read them, or ask Claude to draft an enquiry to Surrey History Centre.
- [ ] **Slow Ways** (walking routes between towns and villages). Their terms allow the routes only for personal, non-commercial use (© Crown Copyright / Ordnance Survey); use elsewhere needs Slow Ways CIC's permission. Ask whether the free walk may show Croydon's eight Slow Ways, credited on About, or whether their planned open licence (CC BY-SA 4.0) is out yet. Claude can draft the email.
- [ ] **Civilian war dead.** The CWGC's records need a written licence. Write to them if you want them told.
