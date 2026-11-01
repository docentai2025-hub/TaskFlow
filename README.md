# TaskFlow — Student Task Management System

A simple, working **full-stack web development project** suitable for demonstrating frontend development, backend APIs, database operations, and authentication in a college internship report.

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (Fetch API) |
| Backend | Node.js (built-in `node:http` module) |
| Database | SQLite (`node:sqlite` module) |
| Authentication | Server-side sessions, HTTP-only session cookies, scrypt-hashed passwords |

**No `npm install` is required.** The project relies only on built-in Node.js modules. Requires **Node.js 22.13.0 or newer** (SQLite may print an experimental warning on some Node 22 versions; it still works).

## Run locally

1. Install Node.js 22.13+ from https://nodejs.org/ if necessary.
2. Extract this project ZIP.
3. Choose any of these ways to run:
   - **Windows:** Double-click [`start.bat`](start.bat) or run `.\start.bat` in terminal.
   - **macOS / Linux:** Run `./start.sh` or `npm start`.
   - **Any terminal:** Run `npm start` or `node server.js`.
4. Open the displayed URL in your browser (defaults to **http://localhost:3000**, or **http://localhost:3001** if 3000 is occupied).
5. Click **Create account**, register, and start adding tasks.

*Tip: You can also generate an HTML / printable PDF version of the report at any time by running `npm run report`.*

## Main features

- Student account registration and login
- Password hashing and login sessions
- Task creation, viewing, editing, and deletion (CRUD)
- Priority selection: Low, Medium, High
- Task status: Pending, In progress, Completed
- Task due dates, overdue indicators, search and filters
- Dashboard with live task summary counts
- Mobile-friendly responsive interface
- Persistent per-user SQLite data

## Folder structure

```text
taskflow-internship-project/
├── server.js              # HTTP server, APIs, login and SQLite code
├── package.json           # Project metadata / npm start script
├── public/
│   ├── index.html         # Page structure
│   ├── style.css          # Responsive UI styles
│   └── app.js             # Frontend interactivity + API requests
├── data/                  # SQLite file is created here when run
├── internship-report.md   # Report-ready project write-up
└── README.md
```

## API endpoints

| HTTP method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Log in |
| GET | `/api/auth/me` | Check current session |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/tasks` | List user's tasks |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| GET | `/api/health` | Server health |

Task JSON example:

```json
{
  "title": "Complete web development assignment",
  "description": "Finish backend and frontend integration",
  "priority": "high",
  "status": "in_progress",
  "due_date": "2026-11-10"
}
```

## Screenshots to include in your internship report

1. Login page
2. Registration page
3. Dashboard with at least four sample tasks
4. Add Task form
5. Edit Task form
6. Filtered completed tasks
7. Database table/schema (optional)

These should be captured after you actually run the project. The application initially has no tasks; register and create some examples.

## Note about deployment/security

This is an **educational local development project**, not a production-hardened public website. Before a public launch, add HTTPS, request-rate limiting, CSRF defenses, session cleanup, security headers, and more rigorous tests. Do not commit `data/taskflow.db` (it is ignored by Git).
