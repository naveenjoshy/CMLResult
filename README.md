# CML Result Portal

A festival management portal for candidate registration, event operations, scoring, and live results for Mekhalas and Parishes.

Built with **Next.js 15 (App Router)**, **React 19**, **MongoDB/Mongoose**, and a custom CSS design system.

## Features

### Public results dashboard (`/`)

- Overview of registered candidates, event progress, and leading Mekhala and Parish.
- Ongoing-event section with stage, section, eligibility, and participant details.
- Results by event shows only events with published results. Each event includes a detailed-results toggle listing every candidate, chest number, Mekhala, Parish, position, grade, and points.
- Mekhala and Parish leaderboards show a three-place podium and complete points-descending lists. Entities tied on points share the same dense rank and are grouped together on the podium.
- Filter events by name, section, candidate, or chest number; search candidate scorecards by name, chest number, house, Parish, or Mekhala.
- Results refresh automatically every 15 seconds.

### Candidate registration (`/register`)

- Public registration form for candidate name, house name, date of birth, 10-digit contact phone, Mekhala, Parish, section, sex, and event. Candidate and house names are saved in title case.
- Dates are entered and displayed as `DD-MM-YYYY`.
- Parish choices filter to the selected Mekhala. Event choices update to match the candidate's section and sex.
- Section is selected automatically from the configured date-of-birth rules; administrators can configure the rules and test them with the DOB simulator.
- Group-event registration accepts one candidate per registration; date of birth is optional for group events.
- Registration deadline can be configured with `REGISTRATION_END_DATE`. The portal shows the deadline and prevents public submissions after it passes. Admins can still add candidates from the admin portal.
- Successful registrations show a confirmation card and printable registration details. Chest numbers are issued separately by an administrator; they are not assigned by public registration.

### Admin portal (`/admin`)

- Password gate backed by a signed, HTTP-only, 12-hour session cookie. Configure a unique `ADMIN_PASSWORD` with at least 16 characters.
- **Results and scoring:** stage candidate positions and grades, then publish all changes for the selected event together. Publishing recalculates candidate, Mekhala, and Parish points. Update event status between Upcoming, In Progress, and Completed.
- **Event management:** add, edit, and delete events; configure eligible sections, gender, description, stage details, status, and placement/grade point values. Choose combined male/female eligibility or create separate Male and Female events, with candidates shown only the matching event. Create separate events per selected section or combine sections into one event.
- **Candidate management:** search, add, edit, and delete candidates. Admin registration bypasses the public registration deadline. Issue sequential `CML-101`-style chest numbers to candidates who do not have one, or edit a candidate's number directly.
- **Mekhala and Parish management:** add, edit, and delete Mekhalas and Parishes, assign Parishes to a parent Mekhala, and view candidate counts. Deletion is blocked while dependent Parishes or candidates exist.
- **Section and DOB rules:** add, edit, and delete sections; configure DOB ranges, descriptions, and display order; preview the section assigned to a test DOB.
- **Print documents:** print A4 stage call sheets and official result sheets in landscape, and Mekhala/Parish candidate lists in portrait. Stage sheets sort by chest number, with Mekhala/name ordering when no chest number is assigned; result sheets sort by points descending. Missing chest numbers print blank.
- **Certificates:** design and print certificates in A4 landscape. Logo, main banner, and secondary banner are optional and unchecked by default.
- **Winner posters:** generate downloadable, high-resolution result posters in portrait post, story, or square formats; copy a prepared social caption and use the available share action.
- Database connection status is displayed in the admin navigation.
- The shared title banner and secondary banner appear across the portal and print headers; the crest is used as the site icon.

## Requirements

- Node.js compatible with Next.js 15
- npm
- MongoDB Atlas or another MongoDB deployment

## Setup

```bash
npm install
```

Create `.env.local` in the project root and configure the required database connection:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=CMLResult
ADMIN_PASSWORD=replace-with-a-strong-password
REGISTRATION_END_DATE=2026-10-01T23:59:00
```

`MONGODB_DB` defaults to `CMLResult`. `ADMIN_PASSWORD` is required for admin login and must be a unique password of at least 16 characters; there is no default password. `REGISTRATION_END_DATE` is optional; when unset or invalid, public registration remains open. Set it to a date/time accepted by JavaScript's `Date` parser.

MongoDB is required for all application data. If it is unconfigured or unavailable, API requests fail and the admin navigation shows `DB: Offline`; the app does not switch to local sample data.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To create a production build and run it locally:

```bash
npm run build
npm run start
```

## Database initialization

With `MONGODB_URI` configured, the initializer creates any missing application collections and ensures the unique indexes for categories, certificate designs, Mekhalas, and Parishes. It does not insert, update, or delete documents:

```bash
node scripts/init-db.mjs
```

The initializer is optional; the application can create and manage its data through the admin portal. It is the only database initialization script; data migrations and one-off data changes should be handled separately.

## Vercel deployment

Connect the GitHub repository to Vercel with the project root set to `.` and the Next.js framework preset. Add these environment variables to the Vercel project before deploying:

- `MONGODB_URI` (required)
- `MONGODB_DB` (optional; defaults to `CMLResult`)
- `ADMIN_PASSWORD` (required; at least 16 characters)
- `REGISTRATION_END_DATE` (optional)

Deployments use `npm run build`. Never commit `.env.local` or production credentials; configure environment values in Vercel's project settings.