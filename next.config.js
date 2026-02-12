/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase body size limit for file uploads
  // Vercel serverless functions have a 4.5MB limit, but we can configure Next.js to handle up to that
  experimental: {
    serverActions: {
      bodySizeLimit: '4.5mb',
    },
  },
}

module.exports = nextConfig

