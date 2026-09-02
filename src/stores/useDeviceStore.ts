import { Device } from "@/types/types";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface DeviceStore {
  deviceId: string;
  device: Device | undefined;
  isInternetConnected: boolean;
}

const useDeviceStore = create<DeviceStore>()(
  immer((set, get) => ({
    deviceId: "",
    device: undefined,
    isInternetConnected: true,
  })),
);

export default useDeviceStore;
