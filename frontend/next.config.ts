//next.config.ts
import { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // proxy all /api/auth/* 
      {
        source: '/api/auth/:path*',
        destination: ${process.env.NEXT_PUBLIC_API_URL}/auth/:path*,
      },
      // proxy all /api/ai/*  
      {
        source: '/api/ai/:path*',
        destination: ${process.env.NEXT_PUBLIC_API_URL}/api/ai/:path*,
      },
    ]
  },
}

export default nextConfig

