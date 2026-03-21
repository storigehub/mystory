/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Cloudinary 등 Node.js 전용 패키지를 서버 컴포넌트에서 번들링하지 않도록 설정
  serverExternalPackages: ['cloudinary'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};
module.exports = nextConfig;
