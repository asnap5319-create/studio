
import { NextResponse } from 'next/server';

/**
 * Dynamic SVG Route for A.snap logo.
 * Updated: Increased pattern size and visibility specifically for Home Screen icons.
 */
export async function GET() {
  const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="moneyPattern" x="0" y="0" width="128" height="128" patternUnits="userSpaceOnUse">
        <!-- Bolder Rupee and Dollar signs for icon visibility -->
        <text x="20" y="70" fill="rgba(255,255,255,0.35)" font-family="Arial, sans-serif" font-size="60" font-weight="900">₹</text>
        <text x="80" y="110" fill="rgba(255,255,255,0.2)" font-family="Arial, sans-serif" font-size="45" font-weight="900">$</text>
      </pattern>
    </defs>
    
    <!-- Background with High-Contrast Money Pattern -->
    <rect width="512" height="512" rx="128" fill="#16a34a"/>
    <rect width="512" height="512" rx="128" fill="url(#moneyPattern)"/>
    
    <!-- The Main 'A' Logo in Pink with shadow -->
    <path 
      d="M150 400 L256 100 L362 400 M210 320 L302 320" 
      stroke="#ff3366" 
      stroke-width="64" 
      fill="none" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      filter="drop-shadow(0px 6px 12px rgba(0,0,0,0.4))"
    />
    <circle cx="390" cy="120" r="42" fill="#ff3366" filter="drop-shadow(0px 6px 12px rgba(0,0,0,0.4))" />
  </svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
