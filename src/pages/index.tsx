import { useEffect } from "react";
import { useRouter } from "next/router";
import useUserStore from "@/stores/userStore";
import DashboardLayout from "@/layout/DashboardLayout";
import DashboardHome from "@/components/dashboard/DashboardHome";

function Home() {
  const router = useRouter();
  const adminRoles = ["admin", "super_admin"];
  const role = useUserStore((state) => state.role);

  useEffect(() => {
    if (
      role &&
      role?.permissions &&
      !adminRoles.some((perm) => role?.permissions?.includes(perm))
    )
      router.replace("/pos");
  }, [role]);

  return (
    <DashboardLayout>
      {adminRoles.some((perm) => role?.permissions?.includes(perm)) && (
        <DashboardHome />
      )}
    </DashboardLayout>
  );
}

export default Home;
