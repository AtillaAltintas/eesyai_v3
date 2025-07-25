// next.config.ts
import { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // if you want to hit your Render/production backend:
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
        // or if you were testing everything on localhost:
        // destination: `http://localhost:8000/api/:path*`,
      },
    ]
  },
}

export default nextConfig


