/**
 * The root `/` route is fully handled by the proxy (src/proxy.ts):
 *   - Authenticated user   → /dashboard
 *   - Authenticated admin  → /admin
 *   - Unauthenticated      → /login
 *
 * Returning null here avoids the Next.js 16 Turbopack race condition
 * ("Router action dispatched before initialization") that occurred when
 * a Server Component called redirect() on the initial render.
 */
export default function HomePage() {
  return null;
}
