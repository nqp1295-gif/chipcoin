/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiTarget = process.env.API_INTERNAL_URL || (process.env.NODE_ENV === 'production' ? 'http://api:8080' : 'http://127.0.0.1:8080');
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiTarget}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
