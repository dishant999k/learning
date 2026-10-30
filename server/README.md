# HomeStock API

See the project [README](../README.md) for setup instructions.

The API listens on `http://localhost:5000`. It requires `MONGO_URI` and `JWT_SECRET` in `server/.env` and will not start if MongoDB cannot connect. Passwords are hashed with bcrypt and access tokens expire after one day.

Routes:

- `POST /api/auth/register`, `POST /api/auth/login`, `GET|PATCH|DELETE /api/auth/profile`, `PATCH /api/auth/password`
- `GET|POST /api/inventory`, `PATCH /api/inventory/:id`, `PATCH /api/inventory/:id/stock`, `DELETE /api/inventory/:id`
- `GET|POST /api/locations`, `DELETE /api/locations/:id`
- `GET|POST /api/categories`, `DELETE /api/categories/:id`
- `GET /api/notifications`

Inventory, location, and category records are scoped to the authenticated user. Notification read state and alert preferences are stored in that user's browser. Email delivery and password recovery require an email provider; production hosting and domain configuration are also owner-managed.