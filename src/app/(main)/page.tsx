
import { redirect } from 'next/navigation';

/**
 * Redirects legacy route group page to the root Home feed.
 * This fixes the Next.js 15 routing conflict that causes manifest errors.
 */
export default function LegacyMainPage() {
  redirect('/');
}
