/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase body size limit for file uploads
  // Note: Vercel Blob storage handles large files directly, so this limit mainly affects form data
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: '**.blob.core.windows.net',
      },
      {
        protocol: 'https',
        hostname: '**.blob.vercel-storage.com',
      },
    ],
  },
}

module.exports = nextConfig

