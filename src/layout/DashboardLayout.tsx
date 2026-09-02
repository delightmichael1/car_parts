import { ReactNode, useEffect } from "react";
import { useRouter } from "next/router";
import TopBar from "@/components/navigation/TopNav";
import SideBar from "@/components/navigation/Sidebar";
import useDashboardStore from "@/stores/useDashboardStore";
import useSessionTokens from "@/hooks/useSessionTokens";

type DashboardLayoutProps = {
  children: ReactNode;
};

function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const accessToken = useDashboardStore((state) => state.accessToken);
  const { removeTokens } = useSessionTokens();

  useEffect(() => {
    if (!accessToken) {
      void removeTokens();
      router.replace("/auth/signin");
    }
  }, [accessToken, removeTokens, router]);

  if (!accessToken) {
    return null;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background p-4">
      <aside className="h-full shrink-0 overflow-hidden">
        <SideBar />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col px-4 bg-background-2 rounded-3xl text-black ">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;
