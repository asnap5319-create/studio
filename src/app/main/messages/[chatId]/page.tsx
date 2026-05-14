import { redirect } from 'next/navigation';

export default function ChatRedirect({ params }: { params: { chatId: string } }) {
  redirect(`/messages/${params.chatId}`);
}
