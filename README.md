# HomeStock

HomeStock is a household inventory app. It includes a static HTML/CSS/JavaScript frontend and an Express API backed by MongoDB.

## Requirements

- Node.js 20 or newer
- MongoDB running locally, or a MongoDB Atlas database
- A static web server for the frontend (VS Code Live Server works)

## Connect MongoDB Atlas and run locally

### 1. Create an Atlas database user and allow your IP

1. In MongoDB Atlas, create a project and cluster if you do not already have them.
2. Under **Database Access**, create a database user and save its username and password. These are database credentials, not your Atlas website sign-in.
3. Under **Network Access**, add the current public IP address of the computer running the API. Avoid allowing access from every IP except for a temporary, deliberate test.
4. Open **Connect → Drivers**, select Node.js, and copy the connection string for the cluster.

### 2. Configure the API

The local `server/.env` file is ignored by Git. If it does not exist yet, create it from the example:

```sh
cp -n server/.env.example server/.env
```

Edit `server/.env` and set:

```dotenv
PORT=5001
MONGO_URI=mongodb+srv://<database-user>:<url-encoded-password>@<cluster-host>/homestock?retryWrites=true&w=majority
JWT_SECRET=<a-long-random-secret>
CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
```

- Replace the URI username, password, and cluster host with the values from Atlas. URL-encode special characters in the database password (for example, `@` becomes `%40`). Keep the `/homestock` database name in the URI, or replace it with a database name you choose.
- Generate a JWT secret locally with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and paste the output into `JWT_SECRET`.
- `CORS_ORIGINS` must contain the exact browser origin that serves the frontend. The example covers the common VS Code Live Server addresses on port 5500. If Live Server shows another port, add that exact origin to this comma-separated list.
- Keep `server/.env` private. Do not paste credentials into source files, screenshots, chat, or commits.

### 3. Start the API

From the project root:

```sh
cd server
npm install
npm run dev
```

Leave this terminal running. On success, the terminal reports the MongoDB database/host and the API address. Check `http://localhost:5001/health`; it should return `{"status":"ok"}`. Startup fails if the environment variables are missing or MongoDB cannot be reached.

### 4. Start and configure the frontend

In a second terminal, from the project root, start VS Code Live Server and open `index.html`. The frontend defaults to `http://localhost:5001/api`; the shared setting is in [`javascript/config.js`](./javascript/config.js). Port 5000 is used by a macOS system service on some computers, so HomeStock uses 5001 by default. If the API is hosted elsewhere, update `window.HOMESTOCK_API_URL` there to the API URL including `/api`, then add the frontend's exact origin to `CORS_ORIGINS` in `server/.env` and restart the API.

Register at `register.html`, sign in at `login.html`, and add an inventory item. The browser sends the request to the API; the API validates the JWT and reads/writes the corresponding user's records in MongoDB.

### Troubleshooting

- **MongoDB connection fails:** verify the cluster host and database-user credentials in `MONGO_URI`, confirm your current IP is allowed in Atlas Network Access, and URL-encode special characters in the password.
- **The API does not start:** confirm `server/.env` exists and contains `MONGO_URI` and `JWT_SECRET`; restart `npm run dev` after editing it.
- **The browser reports a network/CORS error:** verify the API is running, confirm [`javascript/config.js`](./javascript/config.js) points to the right API, and add the exact Live Server origin (including `localhost` versus `127.0.0.1` and its port) to `CORS_ORIGINS`.
- **Registration succeeds but sign-in fails:** use the same email and password that were registered against the running database; check the API terminal for database errors.

## Features

- User registration, login, profile editing, password change, and account deletion
- User-specific inventory CRUD, quantity adjustments, filters, and CSV export
- Categories and storage locations
- Expiry and warranty tracking with low-stock, expiry, and warranty notifications
- CSV and print-to-PDF reports

## Before deployment or pushing credentials

- Never commit `.env` files, MongoDB credentials, or real JWT secrets. The checked-in `server/.env.example` contains placeholders only.
- If a real secret has ever been committed or pushed, rotate it with its provider. Removing the file in a later commit does not erase it from Git history.
- For deployment, use a managed secret store, restrict Atlas network access and CORS to the production API/frontend, enable HTTPS, and configure hosting and backups.
- Email delivery/password-recovery email and item photo uploads are not configured in this version. The password recovery page explains the available account recovery path.
