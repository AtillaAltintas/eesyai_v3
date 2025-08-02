/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL + '/auth/:path*',
      },
      {
        source: '/api/ai/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL + '/api/ai/:path*',
      },
    ]
  },
}

module.exports = nextConfig

