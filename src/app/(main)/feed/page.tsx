import { redirect } from 'next/navigation';

/**
 * Next.js 15 Fix: Converted to Server Component to resolve build errors.
 * Legacy feed route redirecting to root.
 */
export default function FeedRedirect() {
  redirect('/');
}
