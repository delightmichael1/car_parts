import { create } from "zustand";
import { User } from "@/types/types";
import { immer } from "zustand/middleware/immer";
import { BluetoothDevice } from "capacitor-thermal-printer";
import { WebBluetoothPrinter } from "@/lib/bluetoothPrinter";

interface DashboardStore {
  users: User[];
  accessToken: string;
  refreshToken: string;
  isSideBarOpen: boolean;
  hasFetchedUser: boolean;
  isSideBarCompact: boolean;
  isPrinterConneted: boolean;
  isInternetConnected: boolean;
  selectedUser: User | undefined;
  connectedUsbPrinter: any | undefined;
  connectedWebBluetoothPrinter: WebBluetoothPrinter | undefined;
  bluetoothPrinters: BluetoothDevice[];
  connectedPrinter: BluetoothDevice | undefined;
}

const useDashboardStore = create<DashboardStore>()(
  immer((set, get) => ({
    users: [],
    accessToken: "",
    refreshToken: "",
    isSideBarOpen: false,
    hasFetchedUser: false,
    bluetoothPrinters: [],
    selectedUser: undefined,
    isSideBarCompact: false,
    isPrinterConneted: false,
    isInternetConnected: true,
    connectedPrinter: undefined,
    connectedUsbPrinter: undefined,
    connectedWebBluetoothPrinter: undefined,
  })),
);

export default useDashboardStore;
