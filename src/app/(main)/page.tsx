import { redirect } from 'next/navigation';

/**
 * Next.js 15 Fix: Converted to Server Component to resolve client manifest ENOENT errors.
 * Redirects the root of the (main) group to the absolute root feed.
 */
export default function MainRedirectPage() {
  redirect('/');
}
