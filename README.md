# Reality Engine X

A responsive React diet intelligence dashboard that combines physiological data, behavioral signals, analytics, recommendations, and failure-risk prediction.

## Run

```bash
npm install
npm run dev:all

```

## Host the Backend

Recommended: Railway, because this API is a long-running Node/Express service and it needs MySQL.

1. Push this repo to GitHub.
2. In Railway, create a new project from the GitHub repo.
3. Add a MySQL database service to the same Railway project.
4. For the backend service, set these variables:

```bash
OPENROUTER_API_KEY=your_openrouter_api_key
AI_MODEL=your_ai_model
EMAIL_USER=you@example.com
EMAIL_PASS=your_email_app_password
EMAIL_NAME=Reality Engine X
```

Railway's MySQL variables (`MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`) are supported automatically by the server.

The deploy start command is configured in `railway.json`:

```bash
npm run api
```

After deployment, test:

```bash
https://your-backend-url.up.railway.app/health
```

## Structure

This project follows the requested feature-based structure: `app`, `components`, `features`, `services`, `store`, `hooks`, `utils`, `config`, `styles`, and `data`.
