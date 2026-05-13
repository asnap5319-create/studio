
import { redirect } from 'next/navigation';

/**
 * Redirects legacy /feed route back to the main home feed.
 */
export default function FeedRedirect() {
  redirect('/');
}
