import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { AutoSyncHeartbeat } from "@/components/synology/auto-sync-heartbeat";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as any;

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-tx">
      <AutoSyncHeartbeat />
      <Sidebar userRole={user.role} userName={user.name || user.email || ""} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
