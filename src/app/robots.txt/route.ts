
import { NextResponse } from 'next/server';

/**
 * Dynamic robots.txt to help Google index your social platform properly.
 */
export async function GET() {
  const content = `
User-agent: *
Allow: /
Disallow: /admin
Disallow: /messages

Sitemap: https://asnap.vercel.app/sitemap.xml
  `.trim();

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
