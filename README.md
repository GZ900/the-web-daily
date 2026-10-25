# The Web Daily

A university web application for publishing news, managing editorial review, and measuring article readership. Guests read approved stories and comment; Reporters write and revise stories; Editors review submissions and manage the newsroom.

## Stack and structure

Node.js, Express, EJS, MongoDB/Mongoose, and Vanilla JavaScript with AJAX. Analytics uses Chart.js from a CDN.

The application follows MVC:

- `models/`: users, articles, comments, and time-bucketed view statistics.
- `controllers/`: public feed, authentication, Reporter workflow, Editor management, and Analytics.
- `routes/` and `middleware/`: routes, sessions, roles, and device identification.
- `views/`: server-rendered EJS pages and shared partials.
- `public/`: styles, browser scripts, and local assets.
- `services/`: password hashing, sessions, Analytics, and cached weather.
- `config/`: database connection; `scripts/`: demo data generation.
- `server.js`: application entry point.

## Prerequisites

- Node.js 20.19 or newer and npm (validated with Node.js 26).
- A running local MongoDB server (validated with MongoDB 8).
- Network access to Open-Meteo for weather, externally hosted article images, and the Chart.js CDN for Analytics.

Install dependencies from the lockfile:

```sh
npm ci
```

## Database and safe demo setup

The application defaults to `mongodb://127.0.0.1:27017/the-web-daily`. Set `MONGODB_URI` to use another database. No `.env` loader is installed; export variables in the shell that starts the application.

**Seeding replaces all users, articles, comments, and view statistics in its target database.** Use a dedicated, disposable demo database. Back up any data you want to retain. The seed has no default target: both the explicit URI and an exact database-name confirmation are required before any connection or deletion.

For example, in a fresh terminal:

```sh
export MONGODB_URI='mongodb://127.0.0.1:27017/the-web-daily-demo'
export SEED_CONFIRM_DATABASE='the-web-daily-demo'
npm run seed
unset SEED_CONFIRM_DATABASE
npm start
```

Check both values before running the seed. Do not point this example at an existing working database. Keep `MONGODB_URI` set when starting the app so it uses the database you just seeded.

The seed generates 520 articles across eight categories, six staff accounts (one Editor and five Reporters), comments, public revision examples, publication markers, and historical view statistics. Fresh random demo passwords are printed in the seed terminal. Retain them privately for the demonstration; reseeding replaces the accounts and generates new passwords. Existing installations require their existing credentials. Passwords are hashed in MongoDB; this repository does not supply fixed passwords or a password-recovery mechanism.

## Run

```sh
npm start
# or, for development with automatic restart:
npm run dev
```

Default URL: **http://localhost:3001**. `PORT` can select another port. MongoDB must be available before startup. Stop the server with Ctrl+C.

## Features and roles

- **Guest:** editorial Home with Top Stories, Most Read, category sections, and All Stories. AJAX search, category/history filters, newest/popular sorting, and infinite loading in batches of 20. Viewed/Not Viewed uses this browser's reading history. Article text is present in the initial server-rendered HTML. Comments submit through AJAX, with guest rate limiting of three comments per rolling minute per device.
- **Reporter:** own-story dashboard, creation, automatic MongoDB-backed saving, submission for review, returned-story feedback, and revisions to published stories. Autosave coalesces edits and flushes small pending changes during page exit. A temporary per-tab session-storage handoff covers refresh races until the save is confirmed; MongoDB provides persistence across computers. Very large unsaved stories may trigger the browser's leave confirmation because keepalive requests have a size limit; wait for the saved indicator before leaving. A newer save from another page is protected by a version check; reload if a save conflict is reported.
- **Editor:** review, edit pending submissions, approve/publish, return with feedback, delete stories, and manage users, comments, and view statistics. Analytics supports article/Reporter selection, time ranges, custom ranges, and publication/update markers.
- **Shared:** responsive desktop/tablet/mobile layouts, light/dark themes, accessible custom dropdowns, Login modal and `/login` fallback, hashed passwords, persistent sessions, and server-side role/ownership checks.

An article's `workingVersion` is private editorial work. Its `publishedVersion` is the last approved public snapshot. Readers continue to see that snapshot while a new revision is drafted, pending, or returned. Approval replaces the public snapshot and adds a publication-history marker.

Weather uses Open-Meteo for Tel Aviv, with server-side caching and shared refresh requests. Both cache age and observation age are limited to fifteen minutes; provider failures, stale observations, or a five-second timeout produce the existing unavailable state.

## Suggested evaluator walkthrough

1. Start against a dedicated seeded demo database. Open Home, explore the editorial sections, search/filter/sort All Stories, and scroll through 20 → 40 → 60 items.
2. Read an article, inspect its initial HTML, submit a comment, and compare Viewed/Not Viewed results.
3. Log in as a generated Reporter. Create a disposable story, edit it, wait for the saved indicator, and refresh or reopen it to confirm persistence. Complete the required fields and submit for review.
4. Log in as the Editor. Open the pending story, review it, return it with feedback or approve it. Revise an approved story as its Reporter and confirm readers still see the old approved version until another approval.
5. Open Users, Comments, Review, and Analytics. Select an article with multiple publication-history events. Use a suitable **90-day or custom range** to show seeded historical publication/update markers and compare views before/after an update.
6. Check mobile layout, both themes, Login modal/fallback, and the weather availability state.

Use disposable demo content for destructive demonstrations. Keep database backups, credentials, dependency folders, and Git internals outside any source-only submission archive.
