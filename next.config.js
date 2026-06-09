/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase body size limit for file uploads
  // Note: Vercel Blob storage handles large files directly, so this limit mainly affects form data
  experimental: {
    // pdf-parse v1 is server-only (btrExpiry); avoid bundling its embedded PDF.js
    serverComponentsExternalPackages: ['pdf-parse'],
    optimizePackageImports: ['lucide-react', 'framer-motion', 'date-fns'],
    serverActions: {
      bodySizeLimit: '10mb',
    },
    outputFileTracingIncludes: {
      '/api/installers/[id]/documents/[documentId]': [
        './node_modules/@tesseract.js-data/eng/4.0.0/**',
        './node_modules/tesseract.js/src/worker-script/node/**',
        './node_modules/tesseract.js-core/**',
      ],
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
      {
        protocol: 'https',
        hostname: 'floorinteriorservices.com',
      },
      {
        protocol: 'https',
        hostname: 'graph.microsoft.com',
      },
    ],
  },
}

module.exports = nextConfig

