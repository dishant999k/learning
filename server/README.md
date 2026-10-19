# HomeStock API Setup

## Requirements

- Node.js 20 or later
- A MongoDB database, either local or MongoDB Atlas

## Configure the API

1. In MongoDB Atlas, create a cluster, a database user, and allow your development IP in Network Access. Do not commit or share the database password.
2. Copy `.env.example` to `.env` inside this `server` directory.
3. Replace `MONGO_URI` with the connection string from Atlas. URL-encode special characters in the database password. Replace the placeholders with your own values.
4. Generate a JWT secret locally with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and put the result in `JWT_SECRET`.
5. From this directory, run `npm install` and then `npm run dev`.

The API listens on `http://localhost:5000`. It refuses to start if MongoDB cannot connect or either required secret is missing. Passwords are hashed with bcrypt before storage; JWTs expire after one day.

## Frontend

Open the project through VS Code Live Server (or another static web server) and use `register.html` to create an account. The frontend expects the API at `http://localhost:5000/api`. To use another API URL, define `window.HOMESTOCK_API_URL` before the page loads its JavaScript (`javascript/login.js`, `javascript/register.js`, or `javascript/app.js`).

## API routes

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/profile`
- `GET|POST /api/inventory`, `PATCH /api/inventory/:id`, `PATCH /api/inventory/:id/stock`, `DELETE /api/inventory/:id`
- `GET|POST /api/locations`, `DELETE /api/locations/:id`
- `GET /api/notifications`

Inventory and location records are scoped to the authenticated user. Notifications are generated from low-stock thresholds and expiry/warranty dates; read state is kept in that user's browser. Email, push notifications, password recovery delivery, and production hosting still require provider accounts and credentials that must be configured by the project owner.