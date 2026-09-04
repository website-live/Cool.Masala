import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [index("routes/home.tsx"), route("checkout", "routes/checkout.tsx"), route("admin", "routes/admin.tsx"), route("admin/health", "routes/admin.health.tsx"), route("api/send-otp", "routes/api.send-otp.ts"), route("api/verify-otp", "routes/api.verify-otp.ts"), route("api/user/me", "routes/api.user.me.ts"), route("api/cart", "routes/api.cart.ts"), route("api/checkout-intent", "routes/api.checkout-intent.ts"), route("orders/:id", "routes/order-confirmation.tsx")] satisfies RouteConfig;
