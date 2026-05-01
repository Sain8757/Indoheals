# Indo Heals API

Base URL: `/api`

## Authentication

- `POST /auth/signup` - create account. Body: `name`, `email`, `password`.
- `POST /auth/login` - login. Body: `email`, `password`.
- `POST /auth/forgot-password` - sends reset link when SMTP is configured.
- `POST /auth/reset-password` - body: `email`, `token`, `password`.
- `GET /auth/me` - current user. Requires `Authorization: Bearer <token>`.
- `PUT /auth/me` - update `name`, `email`, or password with `currentPassword` and `newPassword`.

## Products

- `GET /products` - public active products.
- `GET /products/:idOrSlug` - public single product.

## Cart

All cart routes require a bearer token.

- `GET /cart`
- `POST /cart/items` - body: `productId`, `quantity`.
- `PUT /cart/items/:productId` - body: `quantity`.
- `DELETE /cart/items/:productId`
- `DELETE /cart`

## Orders And Payments

All order routes require a bearer token, except the webhook.

- `POST /orders` - create pending order and Razorpay order. Body: `items: [{ productId, quantity }]`.
- `POST /orders/:id/confirm-payment` - verify Razorpay checkout response and mark paid.
- `POST /orders/webhook/razorpay` - Razorpay webhook endpoint. Configure the same `RAZORPAY_WEBHOOK_SECRET`.
- `GET /orders/my` - current user's orders.
- `GET /orders` - admin only.

## Downloads

- `GET /downloads/:orderId/:productId?token=<token>` - protected expiring download link. User must own a paid order and the file must be configured on the product.

Digital files must live outside the public frontend, inside `SECURE_DOWNLOAD_DIR`.

## Admin

Admin access is controlled by user `role: "admin"`. New users whose email matches `ADMIN_EMAIL` are created as admins.

- `GET /admin/users`
- `GET /admin/orders`
- `GET /admin/products`
- `POST /admin/products`
- `PUT /admin/products/:idOrSlug`
- `DELETE /admin/products/:idOrSlug` - soft deletes by setting `isActive: false`.
- `PUT /admin/products/:idOrSlug/digital-file` - body: `storagePath`, optional `originalName`, `mimeType`, `size`.

The public product CRUD aliases also exist at `/products` for admin tokens.
