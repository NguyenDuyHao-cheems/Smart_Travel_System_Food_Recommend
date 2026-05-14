/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for Docker multi-stage build
  turbopack: {}, // Suppresses the warning about custom webpack configs in Turbopack mode
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mms.img.susercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        // Exclude unnecessary files and large directories from webpack watcher
        ignored: ['**/node_modules', '**/.git', '**/test_out.txt', '**/__tests__/**', '**/.next/**'],
      };
    }
    return config;
  },
};
export default nextConfig;
