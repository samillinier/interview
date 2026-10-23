/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase body size limit for file uploads
  // Note: Vercel Blob storage handles large files directly, so this limit mainly affects form data
  experimental: {
    // pdf-parse v1 is server-only (btrExpiry); avoid bundling its embedded PDF.js
    // firebase-admin is server-only and should not be bundled into the serverless function
    // pdf-to-img + pdfjs-dist + @napi-rs/canvas rasterize scanned PDFs for Auto Verify
    // (native canvas binary + pdfjs data files must stay external to the serverless bundle)
    serverComponentsExternalPackages: [
      'pdf-parse',
      'firebase-admin',
      'playwright-core',
      '@sparticuz/chromium',
      'pdf-to-img',
      'pdfjs-dist',
      '@napi-rs/canvas',
    ],
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
      '/api/admin/marketing/search': [
        './node_modules/@sparticuz/chromium/**',
        './node_modules/playwright-core/**',
      ],
      '/api/admin/change-requests/[id]/auto-verify': [
        './node_modules/@napi-rs/**',
        './node_modules/pdfjs-dist/standard_fonts/**',
        './node_modules/pdfjs-dist/cmaps/**',
        './node_modules/@sparticuz/chromium/**',
        './node_modules/playwright-core/**',
      ],
      '/api/installers/[id]/documents/auto-verify': [
        './node_modules/@napi-rs/**',
        './node_modules/pdfjs-dist/standard_fonts/**',
        './node_modules/pdfjs-dist/cmaps/**',
        './node_modules/@sparticuz/chromium/**',
        './node_modules/playwright-core/**',
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
        hostname: 'assetly.ordermygear.com',
      },
      {
        protocol: 'https',
        hostname: 'www.apparelgiant.com',
      },
      {
        protocol: 'https',
        hostname: 'graph.microsoft.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/.well-known/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
      {
        source: '/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
      {
        source: '/.well-known/assetlinks.json',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ]
  },
}

module.exports = nextConfig

