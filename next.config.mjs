/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mongoose'],
  // Lets a production build run next to `next dev` without both writing to .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
