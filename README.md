# Reality Engine X

A responsive React diet intelligence dashboard that combines physiological data, behavioral signals, analytics, recommendations, and failure-risk prediction.

## Run

```bash
npm install
npm run dev:all

```

## Host the Backend

Recommended: Railway, because this API is a long-running Node/Express service and it needs MySQL.

Backend entry file:

```bash
backend/server.js
```

Recommended Railway Root Directory:

```bash
backend
```

The backend has its own `backend/package.json` with:

```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

1. Push this repo to GitHub.
2. In Railway, create a new project from the GitHub repo.
3. Set the service Root Directory to `backend`.
4. Add a MySQL database service to the same Railway project.
5. For the backend service, set these variables:

```bash
MYSQLHOST=${{MySQL.MYSQLHOST}}
MYSQLPORT=${{MySQL.MYSQLPORT}}
MYSQLUSER=${{MySQL.MYSQLUSER}}
MYSQLPASSWORD=${{MySQL.MYSQLPASSWORD}}
MYSQLDATABASE=${{MySQL.MYSQLDATABASE}}
OPENROUTER_API_KEY=your_openrouter_api_key
AI_MODEL=your_ai_model
EMAIL_USER=you@example.com
EMAIL_PASS=your_email_app_password
EMAIL_NAME=Reality Engine X
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@realityenginex.local
ADMIN_PASSWORD=choose_a_secure_admin_password
```

If Railway names your database service something other than `MySQL`, replace `MySQL` in the variable references with the exact Railway service name.

When `ADMIN_PASSWORD` is configured, the backend creates or updates the admin account on startup.

The backend deploy start command is configured in `backend/railway.json`:

```bash
npm start
```

After deployment, test:

```bash
https://your-backend-url.up.railway.app/health
```

## Structure

This project follows the requested feature-based structure: `app`, `components`, `features`, `services`, `store`, `hooks`, `utils`, `config`, `styles`, and `data`.
