import { useRouter } from "next/router";
import PreLoader from "@/components/Preloader";
import AuthHero from "@/components/auth/AuthHero";
import useDeviceInfo from "@/hooks/useDeviceInfo";
import { useSearchParams } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import usePreferenceStorage from "@/hooks/usePreferenceStorage";

type AuthLayoutProps = {
  children: ReactNode;
};

function AuthLayout({ children }: AuthLayoutProps) {
  const router = useRouter();
  const params = useSearchParams();
  const { getDeviceInfo } = useDeviceInfo();
  const { getPreference } = usePreferenceStorage();
  const [isPageLoading, setIsPageLoading] = useState(false);

  const fp = params.get("fp");
  const redirectPath = fp ? `/${fp.replace(/^\/+/, "")}` : "/";

  useEffect(() => {
    (async () => {
      await getDeviceInfo();
      setIsPageLoading(true);
      await getPreference("X-SIG")
        .then((auth) => {
          if (auth || auth !== null) router.replace(redirectPath);
        })
        .finally(() => {
          setIsPageLoading(false);
        });
    })();
  }, [redirectPath]);

  if (isPageLoading) {
    return <PreLoader />;
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
