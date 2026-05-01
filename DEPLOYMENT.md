# Deployment

## Backend: Render

1. Create a MongoDB database and copy the connection string.
2. Create a Render web service from this repository using `render.yaml`.
3. Set the backend environment variables from `backend/.env.example`.
4. Set `BACKEND_PUBLIC_URL` to the Render service URL.
5. Set `FRONTEND_URL` and `CORS_ORIGIN` to the Vercel frontend URL.
6. In Razorpay, set the webhook URL to:

```text
https://your-render-service.onrender.com/api/orders/webhook/razorpay
```

Use the same value for Razorpay's webhook secret and `RAZORPAY_WEBHOOK_SECRET`.

## Frontend: Vercel

Deploy the `frontend` directory as a static site.

The frontend looks for `window.INDO_HEALS_API` first. For production, add a small runtime config before `script.js` if the backend is hosted on another domain:

```html
<script>
  window.INDO_HEALS_API = "https://your-render-service.onrender.com/api";
</script>
```

The existing UI files do not need redesigning for deployment.

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
