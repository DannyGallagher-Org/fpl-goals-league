# FPL Goals League

A small unofficial Fantasy Premier League website that ranks hardcoded FPL team IDs using **only points earned from goals**.

It includes:

- Season-long standings
- A Season / Gameweek toggle
- A selectable individual-gameweek leaderboard
- A gameweek tracker with Goals and Points columns for every team
- Captain and Triple Captain multipliers
- FPL automatic substitutions through the official final pick multiplier
- Five-minute server caching and a manual refresh button

## Scoring

Only goals count:

| Position | Points per goal |
|---|---:|
| Goalkeeper | 10 |
| Defender | 6 |
| Midfielder | 5 |
| Forward | 4 |

A normal captain doubles those goal points. Triple Captain triples them. Goals are counted once in the `Goals` column, even when captaincy multiplies the points.

No points are awarded here for appearances, assists, clean sheets, saves, defensive contributions, bonus points, cards or anything else.

## 1. Install Node.js

Install the current **LTS** version of Node.js from the official Node.js website. Once installed, open Terminal (macOS) or PowerShell (Windows) and check:

```bash
node --version
npm --version
```

Both commands should print a version number.

## 2. Add your FPL team IDs

Open:

```text
lib/teamIds.ts
```

Change it to something like:

```ts
export const TEAM_IDS: number[] = [
  123456,
  234567,
  345678,
];
```

To find an ID, open a manager's Gameweek History / Points page on the FPL website. In a URL such as:

```text
https://fantasy.premierleague.com/entry/123456/event/1
```

`123456` is the team ID.

## 3. Run it on your computer

In Terminal or PowerShell, move into this project folder and run:

```bash
npm install
npm run dev
```

Then visit:

```text
http://localhost:3000
```

Stop the local server with `Ctrl + C`.

## 4. Put the project on GitHub

1. Create a free GitHub account if needed.
2. On GitHub, select **New repository**.
3. Call it `fpl-goals-league`.
4. Keep it private or public; either works with Vercel.
5. Do not add a README or `.gitignore` on GitHub because this folder already contains them.
6. In this project folder, run the commands GitHub displays under **…or push an existing repository from the command line**.

They will look similar to:

```bash
git init
git add .
git commit -m "Initial FPL goals league"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/fpl-goals-league.git
git push -u origin main
```

If `git` is not recognised, install Git first from the official Git website.

## 5. Deploy free with Vercel

1. Create a Vercel account and sign in using GitHub.
2. Select **Add New → Project**.
3. Import the `fpl-goals-league` GitHub repository.
4. Vercel should automatically recognise **Next.js**.
5. Leave the default build settings unchanged.
6. Select **Deploy**.
7. After the build, Vercel gives you a public address ending in `.vercel.app`.

No API key or environment variables are needed.

## 6. Make later changes

Edit the files locally, test with `npm run dev`, and then run:

```bash
git add .
git commit -m "Describe the change"
git push
```

Vercel automatically builds and publishes the new version after every push.

## Main files

```text
app/page.tsx              Website interface
app/globals.css           Styling
app/api/league/route.ts   Server endpoint used by the interface
lib/fpl.ts                FPL requests and goal-points calculation
lib/teamIds.ts            Your hardcoded FPL team IDs
```

## Notes and limitations

- This uses public, undocumented FPL JSON endpoints. The Premier League may change them in the future.
- The first season load makes one picks request per team per started gameweek, so it may take several seconds. Later requests are cached for five minutes.
- During live matches, FPL values and substitutions can remain provisional until the gameweek is finalised.
- A very large number of team IDs could exceed a hosting function's execution limit. This design is intended for a small private mini-league.
- At the start of a new FPL season, the public API normally switches to the new season; this app displays whichever season the official API currently serves.

## Local production check

Before deploying, you can verify that the production build compiles:

```bash
npm run build
npm start
```
