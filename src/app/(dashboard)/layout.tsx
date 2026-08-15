import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { AiAssistant } from "@/components/dashboard/AiAssistant";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <Navbar />
        <main className="flex-1 bg-background p-4 sm:p-6">{children}</main>
      </div>
      <AiAssistant result={null} />
    </div>
  );
}
