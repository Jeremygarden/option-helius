/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Proxy /api/* requests to the backend service when inside Docker
  // NEXT_PUBLIC_API_URL is set to http://backend:8000 in docker-compose
  // But browser-side fetch can't resolve 'backend' hostname.
  // Solution: use Next.js rewrites so API calls go through the Next.js server.
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
