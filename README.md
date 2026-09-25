# CML Result Portal

A modern web application for festival event management, candidate registrations, and live results leaderboard with rankings for **Mekhalas** and **Sakhas**.

Built with **Next.js (App Router)**, **React**, **MongoDB & Mongoose** (Database: `CMLResult`), and a custom **Vanilla CSS Design System**.

---

## ✨ Features

### 1. 🏆 Live Dashboard Screen (`/`)
- **Real-Time Standings**: Overview stats (Total Candidates, Completed Events, Leading Mekhala, Leading Sakha).
- **Top Mekhala Leaderboard**: Interactive podium (Champion, Runner-up, Third) + comprehensive table showing total points, medals (1st, 2nd, 3rd), and Grade counts (A, B, C).
- **Top Sakha Leaderboard**: Sakha championship standings with podium and parent Mekhala association.
- **Results by Event**: Card-based event view with status badge, point scheme legend, and 1st, 2nd, 3rd place winners with grades and points.
- **Candidate Search**: Fast search by candidate name or chest number (e.g., `CML-101`) to inspect individual scorecards.

### 2. 📝 Candidate Registration Portal (`/register`)
- **Candidate Fields**:
  - Name
  - House Name
  - Date of Birth (DOB)
  - Mekhala (dropdown populated from database)
  - Sakha (dynamically filtered based on selected Mekhala)
  - Section (Sub-Junior, Junior, Senior, Super Senior, General)
  - Sex (Male, Female, Other)
  - Event (dropdown populated from active events)
- **Auto-generated Chest Numbers**: e.g., `CML-101`, `CML-102`.
- **Registration Badge & Print View**: Printable receipt and badge upon registration.

### 3. ⚙️ Admin Section (`/admin`)
- **Password Protected**: Configured via `ADMIN_PASSWORD` (default: `admin123`).
- **Result Entry & Scoring**:
  - Select any event.
  - Set candidate Position (**1st**, **2nd**, **3rd**, **None**) and Grade (**A**, **B**, **C**, **None**).
  - Points automatically recalculate in real-time.
  - Toggle event status (**Upcoming**, **In Progress**, **Completed**).
- **Manage Events**:
  - Add new events with customizable points:
    - Default: 5 pts for 1st / Grade A, 3 pts for 2nd / Grade B, 1 pt for 3rd / Grade C.
    - Customizable per event as requested!
  - Delete events.
- **Manage Candidates**:
  - View all registered candidates, search and filter.
  - Edit candidate details (Name, House Name, DOB, Mekhala, Sakha, Section, Sex, Event).
  - Delete candidate.
- **Manage Mekhalas**:
  - Add new Mekhalas with short codes.
  - View candidate counts and delete.
- **Manage Sakhas**:
  - Add new Sakhas assigned to a parent Mekhala.
  - View candidate counts and delete.

---

## 🗄️ MongoDB Atlas Configuration

The application stores data in a MongoDB cluster inside a database named **`CMLResult`**.

### Connecting your MongoDB Cluster:
1. Open [.env.local](file:///Users/mr.naveenjoshy/Brototype/WebApps/CMLResult/.env.local).
2. Set your MongoDB Atlas connection string:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/CMLResult?retryWrites=true&w=majority
   MONGODB_DB=CMLResult
   ADMIN_PASSWORD=admin123
   ```
3. Restart or reload the server. The navbar status indicator will turn green: `DB: CMLResult`.

*Note: If no connection string is provided, the application runs seamlessly in local memory fallback mode with starter seed data so you can test all features immediately.*

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open in browser
http://localhost:3000
```
