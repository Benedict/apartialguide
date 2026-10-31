# To do (Benedict)

Things only you can do. Claude can't change repository settings, sign up for services or make these decisions for you. Ideas for later are in `BACKLOG.md`.

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
- [ ] **Non-commercial for good?** Bomb Sight and Digital Britannia both forbid commercial use. A paid exhibition, a sale or a commission would rule both out.
- [ ] **Geograph photographs.** Their licence asks for each photographer's name. Name them where a photograph is mentioned, or leave Geograph out?
- [ ] **Sources to leave out.** If any source shouldn't be used, list it on `LEAVE_OUT=` in `data/records/use.env`.
- [ ] **The drawn route ("Auster step 3").** Answer the open questions in its brief so it can be built.
- [ ] **A few lines about you** for the About page, and a link if you want one.

## Keys, for more sources (optional)

- [ ] **Energy certificates.** Register at <https://epc.opendatacommunities.org/>, then add the secrets `EPC_EMAIL` and `EPC_API_KEY`.
- [ ] **Geograph photographs.** Register at <https://www.geograph.org.uk/>, ask for an API key, and add the secret `GEOGRAPH_API_KEY`.
- [ ] Once either is in, tell Claude, who will fetch them.
- [ ] **Comparing narrator models.** Create a key at <https://openrouter.ai/>, add a little credit, and add the secret `OPENROUTER_API_KEY`. Then Actions → Compare models → Run workflow.

## Letters and permissions (optional)

- [ ] **Bomb Sight** (the Blitz bomb census). The letter is drafted in `docs/letters/bomb-sight.md`. Check that Dr Kate Jones is still the right person before sending. Or let Claude look first: add `blitzbombcensusmaps.wordpress.com` and `bombsight.org` to the cloud environment's allowed domains.
- [ ] **Digital Britannia** (Roman roads and sites). Open <https://roadsofromanbritain.org/digital-britannia/downloads.html> and check the licence. If it's CC BY-NC, download the GeoJSON layers in longitude and latitude and tell Claude where they are.
- [ ] **Civilian war dead.** The CWGC's records need a written licence. Write to them if you want them told.
