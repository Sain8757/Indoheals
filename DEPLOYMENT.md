# Deployment

## Backend: Render

1. Create a MongoDB database and copy the connection string.
2. Create a Render Blueprint from this GitHub repository. Render will read `render.yaml`, use `backend` as the root directory, run `npm install`, and start the API with `npm start`.
3. The default service name is `indoheals`, so the expected backend URL is:

```text
https://indoheals.onrender.com
```

If Render gives you a different URL, update `PRODUCTION_API_BASE` in `frontend/script.js` and `frontend/admin.js`.

4. Set the backend environment variables from `backend/.env.example`.
5. Set `BACKEND_PUBLIC_URL` to the Render service URL.
6. After Vercel deployment, set `FRONTEND_URL` and `CORS_ORIGIN` to the Vercel frontend URL.
7. The Render health check path is already configured as:

```text
/api/health
```

8. In Razorpay, set the webhook URL to:

```text
https://your-render-service.onrender.com/api/orders/webhook/razorpay
```

Use the same value for Razorpay's webhook secret and `RAZORPAY_WEBHOOK_SECRET`.

## Frontend: Vercel

Import the same GitHub repository in Vercel and set:

- Framework Preset: `Other`
- Root Directory: `frontend`
- Build Command: leave empty
- Output Directory: leave empty

`frontend/vercel.json` rewrites `/admin` to `admin.html` and all other paths to `index.html`.

The frontend now calls the Render backend URL in production:

```text
https://indoheals.onrender.com/api
```

If your Render URL is different, update:

```js
const PRODUCTION_API_BASE = "https://your-render-service.onrender.com/api";
```

Do not upload `backend/.env`, `backend/node_modules`, or paid files from `backend/secure-files`.

## Frontend: Netlify

For Netlify Git deploy, keep `netlify.toml` in the repository root. It publishes the `frontend` directory and maps `/admin` to `admin.html`.

For Netlify manual drag-and-drop upload, upload the contents of the `frontend` folder, not the whole project folder. The uploaded zip/folder must contain `index.html` at its top level.

## Secure Digital Files

Do not place paid files in `frontend` or any public static folder. Upload them to the backend host or mounted storage inside `SECURE_DOWNLOAD_DIR`, then attach the relative path with:

```http
PUT /api/admin/products/breathe-classic/digital-file
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "storagePath": "breathe-classic.zip",
  "originalName": "Breathe Classic.zip",
  "mimeType": "application/zip",
  "size": 123456
}
```

Paid orders generate expiring links that verify the buyer, order status, product, and token before streaming the file.
