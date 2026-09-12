import { useState } from "react";
import { useRouter } from "next/router";
import useUserStore from "@/stores/userStore";
import LogoutDialog from "../modals/LogoutModal";
import { BiLogOut, BiMenu } from "react-icons/bi";
import useDashboardStore from "@/stores/useDashboardStore";
import { MdSearch, MdAddCircleOutline } from "react-icons/md";
import { cn } from "@heroui/styles";

function TopBar() {
  const router = useRouter();
  const user = useUserStore();
  const isSideBarOpen = useDashboardStore((state) => state.isSideBarOpen);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  return (
    <div className="flex items-start justify-between gap-4 md:items-center">
      <div className="flex min-w-0 items-center gap-3 md:hidden">
        <button
          onClick={() =>
            useDashboardStore.setState((state) => {
              state.isSideBarOpen = !state.isSideBarOpen;
            })
          }
          className="flex flex-col h-10 w-10 shrink-0 p-2.5 items-center justify-between rounded-full bg-secondary text-sm font-semibold text-white shadow-sm"
        >
          <div
            className={cn(
              "w-full h-0.5 duration-300 rounded-full bg-white",
              isSideBarOpen && "rotate-45 translate-y-2 translate-x-0",
            )}
          />
          <div
            className={cn(
              "w-full h-0.5 rounded-full duration-300 bg-white",
              isSideBarOpen && "opacity-0",
            )}
          />
          <div
            className={cn(
              "w-full h-0.5 duration-300 rounded-full bg-white",
              isSideBarOpen && "-rotate-45 -translate-y-2.5",
            )}
          />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-black">
            {user.first_name ?? "Dashboard"} {user.last_name}
          </h1>
          <p className="truncate text-[11px] text-black/45">
            {user.email ?? "A Signature Experience in Luxury Grooming"}
          </p>
        </div>
      </div>

      <div className="hidden min-w-0 md:block">
        <h1 className="text-[18px] font-semibold text-secondary lg:text-[20px]">
          {user.first_name ?? "Dashboard"} {user.last_name}
        </h1>
        <p className="text-[11px] text-secondary/45 lg:text-xs">
          {user.email ?? "A Signature Experience in Luxury Grooming"}
        </p>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <button
          type="button"
          onClick={() => router.push("/products/new")}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-primary text-secondary transition hover:brightness-95"
        >
          <MdAddCircleOutline className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => router.push("/search")}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-card text-secondary transition hover:bg-card-2"
        >
          <MdSearch className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setShowLogoutDialog(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-card text-secondary transition hover:bg-card-2"
        >
          <BiLogOut className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={() => router.push("/search")}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-card text-secondary transition hover:bg-card-2"
        >
          <MdSearch className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setShowLogoutDialog(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-secondary text-white transition hover:brightness-110"
        >
          <BiLogOut className="h-5 w-5" />
        </button>
      </div>
      <LogoutDialog
        isOpen={showLogoutDialog}
        onOpenChange={() => setShowLogoutDialog(false)}
      />
    </div>
  );
}

export default TopBar;
