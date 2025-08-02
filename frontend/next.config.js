/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // proxy /api/auth/* → your FastAPI auth endpoint
      {
        source: '/api/auth/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/auth/:path*`,
      },
      // proxy /api/ai/* → your FastAPI ai endpoint
      {
        source: '/api/ai/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/ai/:path*`,
      },
    ]
  },
}

module.exports = nextConfig


