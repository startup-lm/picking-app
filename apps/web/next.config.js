/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbopackPluginRuntimeStrategy: 'workerThreads',
  },
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
};
module.exports = nextConfig;
