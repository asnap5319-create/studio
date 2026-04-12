import { BottomNav } from "@/components/bottom-nav";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col border-x bg-card">
        <div className="flex-grow pb-20">{children}</div>
        <BottomNav />
      </div>
    </div>
  );
}
