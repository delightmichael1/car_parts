import { useAxios } from "./useAxios";
import useUserStore from "@/stores/userStore";
import useSessionTokens from "./useSessionTokens";
import usePreferenceStorage from "./usePreferenceStorage";

const useAuth = () => {
  const { secureAxios } = useAxios();
  const { removeTokens } = useSessionTokens();
  const { getPreference } = usePreferenceStorage();
  const user = useUserStore();

  const getAuthStatus = async () => {
    let status = false;
    await getPreference("X-SIG").then((refreshToken) => {
      if (refreshToken) status = true;
    });
    return status;
  };

  const signout = async () => {
    try {
      await secureAxios.post("/user/signout");
    } catch (error: unknown) {
      console.log(error);
    } finally {
      await removeTokens();
    }
  };

  return {
    signout,
    getAuthStatus,
  };
};

export default useAuth;
