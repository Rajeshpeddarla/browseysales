import { DashSidebar } from "@/components/dashboard/Sidebar";
import { SidebarProvider } from "@/components/dashboard/SidebarContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-bg">
        <div className="flex">
          <DashSidebar />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </SidebarProvider>
  );
}
