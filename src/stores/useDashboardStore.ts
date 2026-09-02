import { create } from "zustand";
import { User } from "@/types/types";
import { immer } from "zustand/middleware/immer";

interface DashboardStore {
  users: User[];
  accessToken: string;
  refreshToken: string;
  isSideBarOpen: boolean;
  hasFetchedUser: boolean;
  isInternetConnected: boolean;
  selectedUser: User | undefined;
}

const useDashboardStore = create<DashboardStore>()(
  immer((set, get) => ({
    users: [],
    accessToken: "",
    refreshToken: "",
    isSideBarOpen: true,
    hasFetchedUser: false,
    isInternetConnected: true,
    selectedUser: undefined,
  })),
);

export default useDashboardStore;
