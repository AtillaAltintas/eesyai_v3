/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // proxy /api/auth/* → your Render backend
      {
        source: '/api/auth/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/auth/:path*`,
      },
      // proxy /api/ai/* → your Render backend
      {
        source: '/api/ai/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/ai/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

