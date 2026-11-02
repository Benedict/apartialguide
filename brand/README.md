# A Partial Guide: the brand

The mark is a junction of three streets and a gap, the map's own drawing of a stop, turned until two streets make the prompt's `>`. The name beside it is traced from Commit Mono, the site's type, so it needs no font. Everything here is drawn from `src/lib/site/brand.ts` by `npm run brand:kit`. Change the brand there and draw again; never edit these files by hand.

## Logo (`logo/<colourway>/`)

Six colourways:

- `paper`, `green`, `amber`, `red`: the page's four colours, light on dark.
- `black`: dark on white, for print and light backgrounds.
- `white`: white on black.

| File                                              | What                                                                          |
| ------------------------------------------------- | ----------------------------------------------------------------------------- |
| `mark.svg`, `mark-1024.png`                       | The mark alone, on nothing (transparent)                                      |
| `mark-on-paper.svg`, `mark-on-paper-1024.png`     | The mark on its colourway's background, square: a profile picture or app icon |
| `lockup.svg`, `lockup-2400.png`                   | The mark and name, on nothing                                                 |
| `lockup-on-paper.svg`, `lockup-on-paper-2400.png` | The mark and name on the colourway's background                               |

Use the SVGs wherever a vector is taken. Use the transparent PNGs only on a background that suits them: the light-on-dark colourways need a dark one, and `black` a light one.

## Headers (`headers/`)

In each of the page's four colours (`headers/<colour>/`), with the mark and name in the middle, where a profile picture laid over a corner doesn't reach:

| File                               | For                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `substack-header-1500x500.png`     | The mailing list's header image                                                |
| `substack-cover-1200x630.png`      | The mailing list's social preview, and anywhere a 1.91:1 image is shown        |
| `substack-logo-1024.png`           | The mailing list's square logo                                                 |
| `linkedin-banner-1584x396.png`     | A LinkedIn profile's background                                                |
| `linkedin-page-cover-1128x191.png` | A LinkedIn page's cover                                                        |
| `linkedin-square-1200x1200.png`    | A square LinkedIn image: the logo, the line beneath it in two, and the address |
| `x-header-1500x500.png`            | An X header                                                                    |
| `bluesky-banner-3000x1000.png`     | A Bluesky banner                                                               |

`headers/substack-wordmark-black-1200x300.png` and `-white-` are the name for the mailing list's header bar, on nothing: black for its usual white bar, white for a dark one.

The sizes are the ones each place asked for when these were drawn. Check them against the place's current guidance before uploading.

## Licence

The mark and these pictures are part of A Partial Guide (GNU AGPL, version 3 or later). The letters are traced from Commit Mono by Eigil Nikolajsen, under the SIL Open Font License (`static/fonts/OFL.txt`).

## Social pictures (`social/`)

Drawn by `npm run social`: every word Guide says in them is the walk's own, as it played.

| File                                       | For                                                      |
| ------------------------------------------ | -------------------------------------------------------- |
| `profile.png`, `profile-paper.png`         | A profile picture: the mark, centred to survive a circle |
| `linkedin-green.png`                       | The logo in green, 1200×627                              |
| `linkedin-green-square.png`                | The logo in green, 1200×1200                             |
| `post-1-hello.png` to `post-6-sources.png` | Portrait posts at 1080×1350, for Instagram               |
