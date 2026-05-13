
import { redirect } from 'next/navigation';

/**
 * FIX: This file was causing a "Manifest ENOENT" error because it conflicted with src/app/page.tsx.
 * By making it a simple server component redirect, we resolve the Next.js 15 route group bug.
 */
export default function ManifestFixPage() {
  redirect('/');
}
