# HomeStock

HomeStock is a household inventory app. It includes a static HTML/CSS/JavaScript frontend and an Express API backed by MongoDB.

## Requirements

- Node.js 20 or newer
- MongoDB running locally, or a MongoDB Atlas database
- A static web server for the frontend (VS Code Live Server works)

## Run locally

1. In a terminal, create the API environment file:

   ```sh
   cp server/.env.example server/.env
   ```

2. Edit `server/.env`:
   - Set `MONGO_URI` to your local MongoDB or Atlas connection string.
   - Generate a private JWT secret with:

     ```sh
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```

     Put the generated value in `JWT_SECRET`. Do not commit `server/.env`.

3. Install API dependencies and start the backend:

   ```sh
   cd server
   npm install
   npm run dev
   ```

   The API should respond at `http://localhost:5000/health`.

4. In a second terminal, start VS Code Live Server from the project root and open `index.html`. Register at `register.html`, then sign in. The frontend uses `http://localhost:5000/api` by default.

To use a different API URL, define `window.HOMESTOCK_API_URL` (including `/api`) before the frontend scripts load.

## Features

- User registration, login, profile editing, password change, and account deletion
- User-specific inventory CRUD, quantity adjustments, filters, and CSV export
- Categories and storage locations
- Expiry and warranty tracking with low-stock, expiry, and warranty notifications
- CSV and print-to-PDF reports

## Before deployment or pushing credentials

- Never commit `.env` files, MongoDB credentials, or real JWT secrets. The checked-in `server/.env.example` contains placeholders only.
- If a real secret has ever been committed or pushed, rotate it with its provider. Removing the file in a later commit does not erase it from Git history.
- Configure MongoDB Atlas network access, production hosting, HTTPS, and allowed origins for your deployment.
- Email delivery/password-recovery email and item photo uploads are not configured in this version. The password recovery page explains the available account recovery path.
