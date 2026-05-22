
import { NextResponse } from 'next/server';

/**
 * Dynamic SVG Route to ensure the A.snap logo is always available
 * even if the static public file is cached or missing.
 */
export async function GET() {
  const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="128" fill="#16a34a"/>
    <path 
      d="M150 400 L256 100 L362 400 M210 320 L302 320" 
      stroke="#ff3366" 
      stroke-width="64" 
      fill="none" 
      stroke-linecap="round" 
      stroke-linejoin="round" 
    />
    <circle cx="390" cy="120" r="42" fill="#ff3366" />
  </svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
