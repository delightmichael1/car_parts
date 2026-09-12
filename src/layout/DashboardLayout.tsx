import { ReactNode } from "react";
import useAuth from "@/hooks/useAuth";
import { cn, toast } from "@heroui/react";
import { useAxios } from "@/hooks/useAxios";
import useUserStore from "@/stores/userStore";
import { apiErrorDetails } from "@/lib/errors";
import PreLoader from "@/components/Preloader";
import TopBar from "@/components/navigation/TopNav";
import useSocketState from "@/hooks/useSocketState";
import React, { useCallback, useState } from "react";
import useDeviceStore from "@/stores/useDeviceStore";
import SideBar from "@/components/navigation/Sidebar";
import useSessionTokens from "@/hooks/useSessionTokens";
import useDashboardStore from "@/stores/useDashboardStore";
import { MobileBottomNav } from "@/components/navigation/Sidebar";

type DashboardLayoutProps = {
  children: ReactNode;
};

function DashboardLayout({ children }: DashboardLayoutProps) {
  const { secureAxios } = useAxios();
  const { removeTokens } = useSessionTokens();
  const { signout, getAuthStatus } = useAuth();
  const device = useDeviceStore((state) => state.device);
  const deviceId = device?.id;
  const { isSideBarOpen, isSideBarCompact } = useDashboardStore();

  const [, setError] = useState<string | null>(null);
  const disconnectSocket = useSocketState.getState().disconnect;
  const connectToServer = useSocketState.getState().connectToServer;
  const hasFetchedUser = useDashboardStore((state) => state.hasFetchedUser);

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [, setIsFetchingUser] = useState(true);

  const fetchUser = useCallback(async () => {
    setIsPageLoading(true);
    setIsFetchingUser(true);
    try {
      const response = await secureAxios.get("/user");
      disconnectSocket();
      connectToServer(response.data.user.id, deviceId ?? "");
      useUserStore.setState({
        ...response.data.user,
        role: response.data.role,
      });
      useDashboardStore.setState({ hasFetchedUser: true });
    } catch (error: unknown) {
      const { code, status, message } = apiErrorDetails(error);
      if (code === "ERR_NETWORK") {
        toast.danger("Error", {
          description: message || "Network error",
        });
      } else if (status === 451) {
        setError(message ?? "Subscription expired");
      } else {
        toast.danger("Error", {
          description: message || "Something went wrong",
        });
        await removeTokens();
      }
    } finally {
      setIsFetchingUser(false);
      setIsPageLoading(false);
    }
  }, [deviceId]);

  React.useEffect(() => {
    (async () => {
      await getAuthStatus()
        .then((authcookie) => {
          if (authcookie && deviceId && !hasFetchedUser) {
            fetchUser();
          }
          if (hasFetchedUser) {
            setIsPageLoading(false);
            setIsFetchingUser(false);
          }
          if (!authcookie) signout();
        })
        .finally(() => {
          setIsPageLoading(false);
        });
    })();
  }, [deviceId, hasFetchedUser]);

  if (isPageLoading) {
    return <PreLoader />;
  }

  console.log(isSideBarCompact, isSideBarOpen);

  return (
    <div className="h-dvh w-full overflow-hidden bg-background p-2 md:p-4">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full h-full gap-2 md:gap-4">
        <aside
          className={cn(
            "shrink-0 overflow-hidden md:flex duration-300",
            isSideBarOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0",
          )}
        >
          <SideBar />
        </aside>
        <div
          className={cn(
            "flex flex-1 min-w-full md:min-w-0 w-full h-full flex-col duration-300 rounded-[28px] border border-black/5 bg-background-2 shadow-[0_30px_100px_rgba(8,15,23,0.12)]",
            !isSideBarOpen && "-translate-x-20.5  md:translate-x-0",
            !isSideBarCompact &&
              !isSideBarOpen &&
              "-translate-x-46 md:translate-x-0",
          )}
        >
          <div className="px-3 pt-3 md:px-5 md:pt-4">
            <TopBar />
          </div>
          <main className="min-h-0 flex-1  overflow-y-auto pb-20 pt-1 md:pb-10 md:pt-0 w-full h-full">
            {children}
          </main>
        </div>
      </div>
      <div
        className={cn(
          "fixed inset-x-3 bottom-3 z-30 md:hidden duration-300",
          isSideBarOpen && "opacity-0",
        )}
      >
        <MobileBottomNav />
      </div>
    </div>
  );
}

export default DashboardLayout;
