
import { NextResponse } from 'next/server';

/**
 * ads.txt route for Ad network verification (AdMob/Adsterra)
 * This is essential for monetization.
 */
export async function GET() {
  // Add your specific publisher IDs here when you get them
  const content = `
# Adsterra Ads
# Replace the line below with your actual Adsterra/AdMob data
# google.com, pub-xxxxxxxxxxxxxxxx, DIRECT, f08c47fec0942fa0
  `.trim();

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
