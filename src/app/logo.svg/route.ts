
import { NextResponse } from 'next/server';

/**
 * Dynamic SVG Route to ensure the A.snap logo is always available.
 * Updated to include the Money Pattern (Rupee symbol) for the PWA icon.
 */
export async function GET() {
  const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="moneyPattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
        <text x="10" y="45" fill="rgba(255,255,255,0.15)" font-family="Arial" font-size="30" font-weight="bold">₹</text>
        <text x="45" y="65" fill="rgba(255,255,255,0.08)" font-family="Arial" font-size="24" font-weight="bold">$</text>
      </pattern>
    </defs>
    
    <!-- Background with Money Pattern -->
    <rect width="512" height="512" rx="128" fill="#16a34a"/>
    <rect width="512" height="512" rx="128" fill="url(#moneyPattern)"/>
    
    <!-- The Main 'A' Logo in Pink -->
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
