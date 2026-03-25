/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  basePath: "/split",
  serverExternalPackages: ['better-sqlite3'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};
export default nextConfig;
