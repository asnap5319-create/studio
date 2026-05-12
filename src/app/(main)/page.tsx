
import { redirect } from 'next/navigation';

/**
 * Next.js 15 Build Fix:
 * To resolve the 'page_client-reference-manifest.js' ENOENT error,
 * we handle the root path in the top-level src/app/page.tsx.
 * This file redirects to root to ensure clean manifest generation.
 */
export default function MainPageRedirect() {
  redirect('/');
}
