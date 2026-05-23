
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'A.snap - Premium Video Sharing',
    short_name: 'A.snap',
    description: 'Share your world through premium short videos and real-time visual chat.',
    start_url: '/',
    display: 'standalone',
    background_color: '#16a34a',
    theme_color: '#16a34a',
    categories: ['social', 'entertainment', 'video'],
    orientation: 'portrait',
    icons: [
      {
        src: '/logo.svg?v=3',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any'
      },
      {
        src: '/logo.svg?v=3',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable'
      },
      {
        src: '/logo.svg?v=3',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any'
      }
    ],
  }
}
