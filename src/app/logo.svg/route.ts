
import { NextResponse } from 'next/server';

/**
 * Dynamic SVG Route for A.snap logo.
 * Updated: Increased pattern opacity and contrast for better visibility on Home Screen.
 */
export async function GET() {
  const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="moneyPattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
        <text x="15" y="55" fill="rgba(255,255,255,0.25)" font-family="Arial, sans-serif" font-size="40" font-weight="900">₹</text>
        <text x="60" y="85" fill="rgba(255,255,255,0.15)" font-family="Arial, sans-serif" font-size="30" font-weight="900">$</text>
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
      filter="drop-shadow(0px 4px 10px rgba(0,0,0,0.3))"
    />
    <circle cx="390" cy="120" r="42" fill="#ff3366" filter="drop-shadow(0px 4px 10px rgba(0,0,0,0.3))" />
  </svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
