import Head from "next/head";
import "@/styles/globals.css";
import { Toast } from "@heroui/react";
import type { AppProps } from "next/app";
import { usePathname } from "next/navigation";
import OfflineBanner from "@/components/OfflineBanner";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export default function App({ Component, pageProps }: AppProps) {
  const pathname = usePathname();
  const { syncQueue } = useOfflineSync();

  return (
    <>
      <Toast.Provider />
      <Head>
        <title>Automotive Parts</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/images/logo.jpg" />
        <meta name="description" content="Automotive Parts Management App" />
      </Head>
      <Component {...pageProps} />
      {!pathname?.includes("/auth/") && <OfflineBanner onSync={syncQueue} />}
    </>
  );
}
