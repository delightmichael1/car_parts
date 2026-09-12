import axios from "axios";
import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { immer } from "zustand/middleware/immer";
import { Preferences } from "@capacitor/preferences";
import useOfflineStore from "@/stores/useOfflineStore";
import useDashboardStore from "@/stores/useDashboardStore";
import { LocalNotifications } from "@capacitor/local-notifications";

interface SocketState {
  socket: Socket | undefined;
  connectToServer: (userId: string, deviceId: string) => void;
  disconnect: () => void;
}

let offlineMarkTimer: ReturnType<typeof setTimeout> | undefined;
let offlineMarkStart = 0;

const markSocketOffline = () => {
  if (!offlineMarkStart) offlineMarkStart = Date.now();
  if (offlineMarkTimer) return;
  const delay = Math.max(0, 3000 - (Date.now() - offlineMarkStart));
  offlineMarkTimer = setTimeout(() => {
    useOfflineStore.getState().setOnline(false);
    offlineMarkStart = 0;
    offlineMarkTimer = undefined;
  }, delay);
};

const markSocketOnline = () => {
  offlineMarkStart = 0;
  if (offlineMarkTimer) {
    clearTimeout(offlineMarkTimer);
    offlineMarkTimer = undefined;
  }
  useOfflineStore.getState().setOnline(true);
};

useOfflineStore.subscribe((state, prev) => {
  if (state.isOnline && !prev.isOnline) {
    offlineMarkStart = 0;
    if (offlineMarkTimer) {
      clearTimeout(offlineMarkTimer);
      offlineMarkTimer = undefined;
    }
  }
});

async function scheduleLocalNotification(title: string, body: string) {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Math.floor(Math.random() * 100000),
          extra: {},
          schedule: { at: new Date(), allowWhileIdle: true },
        },
      ],
    });
  } catch {
    /* Capacitor unavailable on web */
  }
}

const useSocketState = create<SocketState>()(
  immer((set, get) => ({
    socket: undefined,

    connectToServer: (userId, deviceId) => {
      console.log("######### conecting to server ##############");
      const accessToken = useDashboardStore.getState().accessToken;
      const socket = io(`${process.env.NEXT_PUBLIC_API_URL}`, {
        extraHeaders: {
          "X-Platform": "socket",
          "X-Device-Id": deviceId,
          "ngrok-skip-browser-warning": "true",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      socket.on("auth_error", async (data: { code: string }) => {
        if (data.code === "TOKEN_EXPIRED") {
          try {
            const rToken = useDashboardStore.getState().refreshToken;
            if (!rToken) return;

            const response = await axios.get(
              `${process.env.NEXT_PUBLIC_API_URL}/user/refresh`,
              {
                headers: {
                  Authorization: `Bearer ${rToken}`,
                  "X-Device-Id": deviceId,
                  "X-Platform": "socket",
                  "ngrok-skip-browser-warning": "true",
                },
              },
            );

            const { accessToken, refreshToken: newRefreshToken } =
              response.data;
            await Preferences.set({
              key: "X-SIG",
              value: JSON.stringify(newRefreshToken),
            });

            useDashboardStore.setState((state) => {
              state.accessToken = accessToken;
              state.refreshToken = newRefreshToken;
            });

            socket.disconnect();
            get().connectToServer(userId, deviceId);
          } catch (error) {
            console.log("Failed to refresh socket token:", error);
          }
        }
      });

      socket.on("disconnect", (reason) => {
        // A deliberate client-side disconnect (logout) is not an outage.
        if (reason !== "io client disconnect") {
          markSocketOffline();
        }
      });

      socket.on("connect_error", () => {
        markSocketOffline();
      });

      socket.on("connect", () => {
        console.log("Socket Connected ###");
        markSocketOnline();
      });

      set({ socket });
    },

    disconnect: () => {
      get().socket?.disconnect();
    },
  })),
);

export default useSocketState;
