import { CreatePostForm } from "@/components/create-post-form";

export default function CreatePage() {
  return (
    <div>
      <header className="sticky top-0 z-10 flex h-14 items-center justify-center border-b bg-background px-4">
        <h1 className="text-lg font-semibold font-headline">Create New Post</h1>
      </header>
      <main className="p-4">
        <CreatePostForm />
      </main>
    </div>
  );
}
