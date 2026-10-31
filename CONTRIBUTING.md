# Contributing to A Partial Guide

Thank you for wanting to help. A Partial Guide is a text adventure of the real world, built from open data: Guide says only what the sources say, as they say it. Most of what makes it good or bad is in the data, so the most useful help often isn't code at all.

## What kind of help, and where it goes

| You noticed…                                                           | Where it goes                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A street, building, shop or name is wrong or missing                   | Fix it at its source. Most of the map is [OpenStreetMap](https://www.openstreetmap.org/), which anyone can edit; the next snapshot picks the change up. The walk never edits OpenStreetMap itself, and never repairs what it finds, so a fix here would be the wrong place. Other accounts (hygiene ratings, planning, plaques…) come from the sources credited on the site's About page. |
| Guide says something its facts don't hold, or reads too much into them | Open an issue with the **Guide says something wrong** form. The piece of prose is dropped or written again, and goes through the guards like any other.                                                                                                                                                                                                                                   |
| A source of open data worth adding                                     | Open an issue with the **A source to add** form, before any code: its licence decides whether it can be used.                                                                                                                                                                                                                                                                             |
| An area you'd like opened, or would sponsor                            | Open an issue with the **An area to open** form.                                                                                                                                                                                                                                                                                                                                          |
| A bug or an improvement in the code                                    | Open an issue, or a pull request for something small and clear.                                                                                                                                                                                                                                                                                                                           |

## The rules the code keeps

These are the project's hard rules (they are spelt out in [CLAUDE.md](CLAUDE.md)); a pull request that breaks one won't be merged.

- Never invent a fact. Every noun, name, number and date Guide says comes from a source's facts, with its provenance.
- Never repair data. Broken values are spoken as found.
- Guide never names a source; the About page credits them.
- Never edit OpenStreetMap, and never ask its APIs from the app.
- Never ask for, or use, the reader's own position.
- Test fixtures are invented places, never real data posing as such.

## How to work

1. **Write the failing test first.** Unit tests sit beside the code (`*.test.ts`, Vitest); acceptance scenarios are Gherkin in `features/`. Write the test, see it fail for the right reason, then write the code.
2. Run what CI runs:

   ```sh
   npm ci
   npm run lint
   npm run check
   npm test
   npm run test:count
   ```

   `test:count` fails on any test skipped, left to do or run alone, and on fewer tests than the branch you are merging into.

3. Keep a pull request to one change, and say in it what you tried and how.

## Sign off your commits

Contributions are accepted under the [Developer Certificate of Origin](DCO): by signing off a commit you certify that you wrote it, or otherwise have the right to submit it under this project's licence. Add a sign-off line to every commit:

```
Signed-off-by: Your Name <you@example.com>
```

`git commit -s` adds it for you, from your `user.name` and `user.email`. To sign off commits you've already made on your branch, `git rebase --signoff main` and push again. A check on every pull request from a fork looks for the line on each commit.

## Licence

The code is under the [GNU Affero General Public License, version 3 or later](LICENSE). If you run a changed copy as a website, you must offer its source to the people who use it. Guide's prose, written ahead of time in `data/narration/`, is under [CC BY-SA 4.0](data/narration/LICENSE.md); prose you contribute is given under the same licence. The data in `data/` keeps its sources' own licences (the map is © OpenStreetMap contributors, under the Open Database Licence), as the About page lists, and the type in `static/fonts` is under the SIL Open Font License.

## Conduct

Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
