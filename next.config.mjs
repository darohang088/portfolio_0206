/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Build a fully static site into `out/` so it can be hosted on Cloudflare.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
