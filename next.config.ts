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
