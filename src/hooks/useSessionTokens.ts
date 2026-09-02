import { useRouter } from "next/router";
import useSocketState from "./useSocketState";
import useUserStore from "@/stores/userStore";
import usePreferenceStorage from "./usePreferenceStorage";
import useDashboardStore from "@/stores/useDashboardStore";

function useSessionTokens() {
  const router = useRouter();
  const { setPreference, getPreference, removePreference } =
    usePreferenceStorage();
  const disconnectSocket = useSocketState.getState().disconnect;

  const addTokens = (accessToken: string, refreshToken: string) => {
    setPreference("X-SIG", refreshToken);
    useDashboardStore.setState((state) => {
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
    });
  };

  const getRefreshToken = async () => {
    let refreshToken = "";
    await getPreference("X-SIG").then((token) => {
      refreshToken = token;
    });
    return refreshToken;
  };

  const removeTokens = async () => {
    await removePreference("X-SIG").then(() => {
      useDashboardStore.setState(useDashboardStore.getInitialState());
      useUserStore.setState(useUserStore.getInitialState());
      disconnectSocket();
      router.replace("/auth/signin?fp=" + router.asPath);
    });
  };

  return { getRefreshToken, addTokens, removeTokens };
}

export default useSessionTokens;
