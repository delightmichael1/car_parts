import { ReactNode, useEffect } from "react";
import { useRouter } from "next/router";
import AuthHero from "@/components/auth/AuthHero";
import useDashboardStore from "@/stores/useDashboardStore";

type AuthLayoutProps = {
  children: ReactNode;
};

function AuthLayout({ children }: AuthLayoutProps) {
  const router = useRouter();
  const accessToken = useDashboardStore((state) => state.accessToken);

  useEffect(() => {
    if (accessToken) {
      router.replace("/");
    }
  }, [accessToken, router]);

  if (accessToken) {
    return null;
  }

  return (
    <div className="flex h-screen w-full items-stretch gap-4 overflow-hidden bg-background p-4">
      <AuthHero />
      <div className="flex min-h-0 w-full flex-1 items-center text-black justify-center overflow-y-auto rounded-3xl bg-background-2">
        <div className="w-full max-w-105 px-6 py-10">{children}</div>
      </div>
    </div>
  );
}

export default AuthLayout;
