import { redirect } from 'next/navigation';

/**
 * Next.js 15 routing fix.
 * Redirects the route group root back to the application root to avoid manifest conflicts.
 */
export default function ManifestFixPage() {
  redirect('/');
}
