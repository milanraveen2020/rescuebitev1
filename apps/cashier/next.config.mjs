/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Shared workspace packages ship TS source, not prebuilt JS.
  transpilePackages: ['@rescuebite/types'],
};

export default nextConfig;
