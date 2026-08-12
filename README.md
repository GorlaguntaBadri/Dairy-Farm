# SA Dairy Farm — Production Setup

## What this version adds

- MongoDB Atlas database
- Secure admin login using an HTTP-only cookie
- Admin order dashboard
- Order status management
- Server-side validation
- Helmet security headers
- Login rate limiting
- Environment variables for secrets
- Render deployment configuration
- Same-origin production API
- WhatsApp order message after an order is saved

## Local setup

Install Node.js 20+.

```bash
cd backend
npm install
```

Create `.env` from `.env.example` and fill in:

```env
MONGODB_URI=your-mongodb-atlas-connection-string
MONGODB_DB=sa_dairy_farm
JWT_SECRET=a-long-random-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-admin-password
```

Start:

```bash
npm start
```

Open:

```text
http://localhost:10000
```

Admin:

```text
http://localhost:10000/admin
```

## MongoDB Atlas

Create an Atlas cluster and database user, then copy the Node.js driver connection string into `MONGODB_URI`.

Atlas requires a database user and network access configuration before the application can connect.

## Deploy to Render

1. Put this folder in a GitHub repository.
2. Create a Render Web Service connected to that repository.
3. Render can use the included `render.yaml`, or configure:
   - Build command: `cd backend && npm install`
   - Start command: `cd backend && npm start`
4. Add these environment variables in Render:
   - `MONGODB_URI`
   - `MONGODB_DB`
   - `JWT_SECRET`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `NODE_ENV=production`
5. Deploy.
6. Your public website will be available on the Render URL.
7. Admin dashboard: `https://YOUR-RENDER-DOMAIN/admin`

## Important

Do not put `.env` or passwords in GitHub.

This project does not process card payments. If online payment is required, integrate a payment gateway such as Razorpay separately and verify payment status on the server before confirming an order.

For a custom domain such as `sadairyfarm.in`, add the domain in your hosting provider after the application is working.

## Business details currently configured

Farm: SA Dairy Farm
Price: ₹50/litre
Service area: Palamaner only
WhatsApp/phone: 7989844899
