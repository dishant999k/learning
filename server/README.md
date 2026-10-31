# HomeStock API

See the project [README](../README.md) for the MongoDB Atlas and frontend setup walkthrough.

The API listens on port `5001` by default because macOS services may already use port `5000`. It requires `MONGO_URI` and `JWT_SECRET` in `server/.env` and only starts listening after connecting to MongoDB. Configure `CORS_ORIGINS` as a comma-separated list of exact frontend origins; local defaults allow the usual `localhost:5500` and `127.0.0.1:5500` Live Server origins. Restart the API after changing environment settings.

Passwords are hashed with bcryptjs. Access tokens expire after one day and protected routes require an `Authorization: Bearer <token>` header.

Routes:

- `POST /api/auth/register`, `POST /api/auth/login`, `GET|PATCH|DELETE /api/auth/profile`, `PATCH /api/auth/password`
- `GET|POST /api/inventory`, `PATCH /api/inventory/:id`, `PATCH /api/inventory/:id/stock`, `DELETE /api/inventory/:id`
- `GET|POST /api/locations`, `DELETE /api/locations/:id`
- `GET|POST /api/categories`, `DELETE /api/categories/:id`
- `GET /api/notifications`
- `GET /` and `GET /health` for API status

Inventory, location, and category records are scoped to the authenticated user. Notification read state and alert preferences are stored in that user's browser. Email delivery and password recovery require an email provider; production hosting and domain configuration are owner-managed.