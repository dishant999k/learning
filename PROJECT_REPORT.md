# HomeStock — Project Overview

## Executive summary

HomeStock is a web application for tracking household belongings and supplies in one place. A user can record what they own, how many they have, where items are stored, and relevant purchase, expiry, and warranty dates. The application uses those records to highlight low stock and upcoming or expired dates, and provides reports for reviewing or exporting the information.

The project is implemented as a static, multi-page HTML/CSS/JavaScript frontend backed by a Node.js/Express API and MongoDB. It is designed for individual accounts, with inventory and supporting records scoped to the signed-in user.

## Problem and intended users

Households often track groceries, medicine, appliances, and other belongings across memory or separate lists. HomeStock provides a shared personal inventory view to help an individual or household:

- Find items and see their quantities and storage locations.
- Notice when supplies reach a chosen minimum stock level.
- Keep expiry and warranty dates visible.
- Review inventory summaries and download or print reports.

## Main capabilities

### Accounts and profile

- Register and sign in with an email address and password.
- Keep a session token in browser storage, with the sign-in page offering a “remember me” choice.
- View and update profile name, change password, sign out, or delete the account.
- Require the current password for password changes and account deletion.

### Inventory management

- Create, edit, and delete inventory records.
- Store item name, category, location, quantity, minimum-stock threshold, purchase date, expiry date, warranty date, and notes.
- Search and filter inventory by name, category, location, and stock status.
- Adjust quantities from the stock-management and expiry pages.
- Export the inventory list as CSV.

### Organization and alerts

- Create categories and storage locations, and view how many inventory records use them.
- Prevent deletion of a saved category or location while it is still used by an item.
- See a dashboard with inventory totals, low-stock items, recent additions, and items expiring soon.
- Review low-stock, expiry, and warranty notifications. Expiry reminders are generated for the next 7 days and warranty reminders for the next 30 days.
- Track expiry and warranty dates on dedicated pages. The expiry page also supports recording use or disposal by reducing item quantity.
- Store alert preferences and notification read state in the browser, separately for each user on that browser.

### Reports

The reports page offers inventory summary, current-month purchases, items expiring within 30 days, low-stock items, warranty status, and a location breakdown. The spreadsheet-style export is a CSV file. The PDF action opens a printable report in a new browser window, which can be printed or saved as PDF through the browser.

## Typical user journey

1. Start the API and open the frontend through a local static web server.
2. Register and sign in.
3. Add categories or locations as needed, then create inventory records.
4. Use the dashboard and stock, expiry, warranty, and notification pages to monitor records.
5. Export inventory data or print one of the reports.

## Technical overview

| Area | Implementation |
|---|---|
| Frontend | Static HTML pages, CSS, and browser JavaScript; no frontend framework or build step is required. |
| Backend | Node.js with Express, organized into route, middleware, controller, model, and database-connection files. |
| Database | MongoDB accessed through Mongoose schemas. |
| Authentication | JSON Web Tokens (JWT); passwords are hashed with `bcryptjs`. API tokens expire after one day. |
| API format | JSON over HTTP, with authenticated endpoints using JWT authorization headers. |
| Frontend/API connection | Defaults to `http://localhost:5001/api`; can be overridden with `window.HOMESTOCK_API_URL` before frontend scripts load. |

### Data model

- **User:** first name, last name, email, and hashed password.
- **Inventory item:** owner, name, category and location names, quantity and minimum stock, relevant dates, and notes.
- **Category:** owner, name, normalized name key, icon, and description.
- **Location:** owner, name, and icon.

Inventory, categories, and locations include timestamps. Categories and locations are associated with their owning user; category names and location names have per-user uniqueness constraints.

### API surface

- `/api/auth`: registration, login, profile retrieval and update, password change, and account deletion.
- `/api/inventory`: list, create, update, delete, and adjust item stock.
- `/api/categories`: list, create, and delete categories.
- `/api/locations`: list, create, and delete locations.
- `/api/notifications`: retrieve generated alerts.
- `/health`: API health response.

## Running locally

Requirements are Node.js 20 or newer, MongoDB (local or Atlas), and a static web server for the frontend.

1. Copy `server/.env.example` to `server/.env`.
2. Set `MONGO_URI` and a private, randomly generated `JWT_SECRET` in `server/.env`.
3. From the `server` directory, install dependencies and start the API:

   ```sh
   npm install
   npm run dev
   ```

4. From the project root, start a static server such as VS Code Live Server and open `index.html`. The root page redirects to the dashboard; register first, then sign in.
5. Confirm the API is available at `http://localhost:5001/health`.

The API will not start without both environment variables or if MongoDB cannot be reached. Do not commit `server/.env` or real credentials.

## Scope and current limitations

- Self-service password recovery is not available. The recovery page directs signed-in users to change their password in the profile and others to contact the installation administrator.
- Email delivery is not configured. The email-notification control is a saved preference only; notifications are shown in the application.
- Item photo uploads are not configured.
- The repository documents local setup but does not include production hosting, domain, HTTPS, or deployment configuration.
- Alert read state and alert preferences are browser-local rather than synchronized across devices.

## Project structure

- Root-level `.html` pages define registration, login, dashboard, inventory, stock, categories, locations, expiry, warranty, notifications, reports, and profile screens.
- `css/` contains shared, authentication, and dashboard styling.
- `javascript/` contains shared app behavior, authentication/profile flows, and page-specific dashboard/report logic.
- `server/` contains the Express API, MongoDB connection, Mongoose models, middleware, and routes.

## Source documentation

- [Project README](./README.md) — prerequisites, local setup, and deployment cautions.
- [API README](./server/README.md) — API routes, authentication, and data-scope notes.
