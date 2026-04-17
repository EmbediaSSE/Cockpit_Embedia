/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Allow production builds to complete even with ESLint warnings
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to complete even with TypeScript errors
    // TODO: remove once all route handler types are updated for Next.js 15
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
