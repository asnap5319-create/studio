
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'A.snap',
    short_name: 'A.snap',
    description: 'Premium Short Video Sharing Platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#16a34a',
    theme_color: '#16a34a',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
