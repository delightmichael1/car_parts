import { useEffect } from "react";
import { toast } from "@heroui/react";
import UseDeviceInfo from "./useDeviceInfo";
import { useRouter } from "next/navigation";
import useUserStore from "@/stores/userStore";
import useSessionTokens from "./useSessionTokens";
import useDeviceStore from "@/stores/useDeviceStore";
import useOfflineStore from "@/stores/useOfflineStore";
import useDashboardStore from "@/stores/useDashboardStore";
import { default as axiosInstance, CreateAxiosDefaults } from "axios";
import { cacheGetResponse, getCachedResponse } from "@/lib/offlineCache";
import { enqueueOfflineRequest, getOfflineQueue } from "@/lib/offlineQueue";

export const useAxios = () => {
  const router = useRouter();
  const { getDeviceInfo } = UseDeviceInfo();
  const device = useDeviceStore((state) => state.device);
  const { addTokens, getRefreshToken, removeTokens } = useSessionTokens();

  useEffect(() => {
    getDeviceInfo();
  }, []);

  const xPlatform = "client";

  const options: CreateAxiosDefaults = {
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
      "X-Platform": xPlatform,
      "X-Device-Id": device?.id,
      "X-Device-Model": device?.model,
      "X-Device-OS": device?.operatingSystem,
      "X-Device-Name": device?.deviceName,
      "X-Device-Platform": device?.platform,
      "ngrok-skip-browser-warning": "true",
    },
  };

  const axios = axiosInstance.create(options);
  const secureAxios = axiosInstance.create(options);

  secureAxios.interceptors.request.use(
    async (config) => {
      const accessToken = useDashboardStore.getState().accessToken;
      config.headers["Authorization"] = `Bearer ${accessToken}`;
      return config;
    },
    (error) => Promise.reject(error),
  );

  // Cache key scoped per signed-in user so a different account never reads
  // another user's cached data.
  const cacheKey = (url: string) =>
    `${useUserStore.getState().id ?? "anon"}|${url}`;

  const isCacheable = (url: string, data: unknown) =>
    !url.includes("/user/refresh") &&
    typeof data === "object" &&
    data !== null &&
    !(data instanceof Blob) &&
    !(data instanceof ArrayBuffer);

  secureAxios.interceptors.response.use(
    (response) => {
      const method = (response.config?.method ?? "get").toUpperCase();
      if (method === "GET" && response.config?.url) {
        const url = response.config.url as string;
        if (isCacheable(url, response.data)) {
          cacheGetResponse(cacheKey(url), response.data);
        }
      }
      // Any successful round-trip proves we are online again.
      useOfflineStore.getState().setOnline(true);
      return response;
    },
    async (error) => {
      const prevRequest = error?.config;

      // Offline detection driven by real request failures (navigator.onLine
      // is unreliable). GETs fall back to the local cache; mutations are
      // queued for background sync instead of being lost.
      const method = (prevRequest?.method ?? "get").toUpperCase();
      const isNetworkFailure = !error?.response && !!error?.request;
      if (isNetworkFailure) {
        useOfflineStore.getState().setOnline(false);
        if (method === "GET" && prevRequest?.url) {
          const cached = await getCachedResponse(
            cacheKey(prevRequest.url as string),
          );
          if (cached !== null) {
            return {
              data: cached,
              status: 200,
              statusText: "OK",
              headers: {},
              config: prevRequest,
              fromCache: true,
            };
          }
        } else {
          try {
            await enqueueOfflineRequest({
              method: method as "POST" | "PUT" | "PATCH" | "DELETE",
              url: prevRequest.url,
              data: prevRequest.data,
            });
            useOfflineStore
              .getState()
              .setQueueLength((await getOfflineQueue()).length);
            toast.warning("Saved offline", {
              description:
                "This change was saved on this device and will sync automatically when you're back online.",
            });
          } catch {
            // fall through to normal error handling
          }
        }
      }

      if (error?.response?.status === 451) {
        router.replace("/subscription-expired");
        return Promise.reject(error);
      }
      if (error?.response?.status === 401 && !prevRequest?.sent) {
        prevRequest.sent = true;
        try {
          const newAccessToken = await refreshToken();
          if (newAccessToken) {
            prevRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
            return secureAxios(prevRequest);
          }
        } catch (refreshError) {
          removeTokens();
          return Promise.reject(refreshError);
        }
      }
      return Promise.reject(error);
    },
  );

  const refreshToken = async () => {
    try {
      let aToken = useDashboardStore.getState().accessToken;
      await getRefreshToken().then(async (rToken: unknown) => {
        const response = await axios.get("/user/refresh", {
          headers: { Authorization: `Bearer ${rToken}` },
        });
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        addTokens(accessToken, newRefreshToken);
        aToken = accessToken;
      });
      return aToken;
    } catch (error) {
      removeTokens();
      throw error;
    }
  };

  return { axios, secureAxios };
};
