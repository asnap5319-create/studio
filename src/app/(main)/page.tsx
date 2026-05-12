
import { redirect } from 'next/navigation';

/**
 * Redirects the route group root to the actual root feed.
 * This prevents conflicts between src/app/page.tsx and src/app/(main)/page.tsx
 */
export default function RootRedirect() {
  redirect('/');
}
