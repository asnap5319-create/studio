import { redirect } from 'next/navigation';

export default function UserProfileRedirect({ params }: { params: { userId: string } }) {
  redirect(`/profile/${params.userId}`);
}
