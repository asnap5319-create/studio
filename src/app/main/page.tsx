import { redirect } from 'next/navigation';

/**
 * Redirects legacy /main route back to the root to avoid Route Conflict in Next.js 15.
 */
export default function MainFixPage() {
  redirect('/');
}
