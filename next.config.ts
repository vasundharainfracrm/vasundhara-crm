import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent the page from being embedded in an iframe (clickjacking protection)
  { key: "X-Frame-Options", value: "DENY" },
  // Stop browsers from MIME-sniffing the content-type (prevents script injection via file upload)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Only send the origin (not the full URL) as the Referer header to external sites
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser features the CRM doesn't need
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Disable DNS prefetching to reduce info leakage
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Tell browsers to always use HTTPS (only meaningful once deployed with TLS)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseapp.com https://*.googleapis.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com data:; " +
      "connect-src 'self' https://*.googleapis.com https://*.firebase.com https://*.firebaseapp.com https://*.firebaseio.com wss://*.firebaseio.com; " +
      "img-src 'self' data: blob: https://*.googleapis.com https://*.googleusercontent.com; " +
      "frame-src 'self' https://*.firebaseapp.com https://*.google.com https://*.googleapis.com; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        // Apply security headers to every route
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
