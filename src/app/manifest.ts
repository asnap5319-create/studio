
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'A.snap - Premium Video Sharing',
    short_name: 'A.snap',
    description: 'Share your world through premium short videos and real-time visual chat.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    categories: ['social', 'entertainment', 'video'],
    orientation: 'portrait',
    icons: [
      {
        src: '/logo.svg?v=10',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any'
      },
      {
        src: '/logo.svg?v=10',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable'
      },
      {
        src: '/logo.svg?v=10',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any'
      }
    ],
  }
}
