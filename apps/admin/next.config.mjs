/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@rescuebite/ui', '@rescuebite/types', '@rescuebite/api-client'],
};

export default nextConfig;
