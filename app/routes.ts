import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [index("routes/home.tsx"), route("checkout", "routes/checkout.tsx"), route("admin", "routes/admin.tsx"), route("admin/health", "routes/admin.health.tsx")] satisfies RouteConfig;
