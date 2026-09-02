import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Toast } from "@heroui/react";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Toast.Provider />
      <Component {...pageProps} />
    </>
  );
}
