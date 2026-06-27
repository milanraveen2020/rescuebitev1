/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile shared workspace packages (they ship TS source, not prebuilt JS).
  transpilePackages: ['@rescuebite/ui', '@rescuebite/types', '@rescuebite/api-client'],
};

export default nextConfig;
