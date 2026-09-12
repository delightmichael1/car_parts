import Image from "next/image";
import React, { useState } from "react";
import { toast, Button } from "@heroui/react";
import { FiCheck, FiX, FiMinus, FiPrinter } from "react-icons/fi";
import useDashboardStore from "@/stores/useDashboardStore";
import { CapacitorThermalPrinter } from "capacitor-thermal-printer";
import { useThermalPrinter } from "@/hooks/useThermalPrinter";
import { isWebUsbSupported } from "@/lib/usbPrinter";
import { isWebBluetoothSupported } from "@/lib/bluetoothPrinter";
import { AppModal } from "../shared/AppModal";

type Props = {
  isOpen: boolean;
  onOpenChange: () => void;
};

const BluetoothPrintersModal: React.FC<Props> = ({ isOpen, onOpenChange }) => {
  const [isLoading, setIsLoading] = useState<string[]>([]);

  // Capability flags are deterministic at runtime — compute directly instead
  // of syncing them through state in an effect.
  const isNative =
    typeof window !== "undefined" &&
    window.Capacitor?.isNativePlatform() === true;
  const isUsbSupported = isWebUsbSupported();
  const isWebBtSupported = isWebBluetoothSupported();

  const bluetoothPrinters = useDashboardStore(
    (state) => state.bluetoothPrinters,
  );
  const {
    printerConnected,
    connectedPrinterName,
    connectedWebBluetoothPrinter,
    printerType,
    connectUsbPrinter,
    disconnectUsbPrinter,
    connectWebBluetooth,
    disconnectWebBluetooth,
  } = useThermalPrinter();

  const onConnectBluetooth = async (address: string) => {
    setIsLoading((prev) => [...prev, address]);
    try {
      const device = await CapacitorThermalPrinter.connect({
        address: address,
      });
      if (device === null) {
        toast.danger("Error", {
          description: "Failed to connect to printer",
        });
      } else {
        useDashboardStore.setState((state) => {
          state.isPrinterConneted = true;
          state.connectedPrinter = device;
        });
        toast.success("Success", {
          description: "Connected to Bluetooth printer",
        });
        onOpenChange();
      }
    } catch {
      toast.danger("Error", {
        description: "Failed to connect to printer",
      });
    } finally {
      setIsLoading((prev) => prev.filter((id) => id !== address));
    }
  };

  const handleConnectUsb = async () => {
    await connectUsbPrinter();
    onOpenChange();
  };

  const handleConnectWebBt = async () => {
    await connectWebBluetooth();
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onOpenChange}
      icon={<FiMinus className="text-red-500" size={20} />}
      title="Thermal Printer"
      subtitle={
        isNative
          ? "Connect your bluetooth printer"
          : "Connect a Bluetooth or USB thermal printer"
      }
      size="md"
    >
      {/* ─── NATIVE BLUETOOTH FLOW ─── */}
      {isNative && (
        <>
          {bluetoothPrinters.length > 0 ? (
            <div className="flex flex-col gap-4">
              {bluetoothPrinters.map((printer, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-card p-4 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <FiCheck className="text-green-500" size={20} />
                    <p className="text-sm font-semibold">{printer.name}</p>
                  </div>
                  <Button
                    onPress={() => onConnectBluetooth(printer.address)}
                    size="sm"
                    isPending={isLoading.includes(printer.address)}
                  >
                    Connect
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="items-center justify-center flex flex-col w-full space-y-5 py-10">
              <Image
                src="/svgs/inventory.svg"
                alt="Printer"
                width={0}
                height={0}
                sizes="100vw"
                className="w-40 h-fit"
              />
              <p className="text-sm text-gray-500 font-normal">
                No bluetooth printer connected
              </p>
            </div>
          )}
        </>
      )}

      {/* ─── WEB: BLUETOOTH + USB ─── */}
      {!isNative && (
        <div className="flex flex-col gap-4">
          {isWebBtSupported && (
            <div className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-4">
              <div className="flex items-center gap-2">
                <FiPrinter className="text-secondary/50" />
                <p className="text-sm font-semibold text-secondary">
                  Bluetooth (BLE)
                </p>
              </div>
              {connectedWebBluetoothPrinter ? (
                <>
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2.5">
                    <FiCheck className="text-emerald-600" size={18} />
                    <span className="text-sm font-medium text-secondary">
                      {connectedWebBluetoothPrinter.name}
                    </span>
                  </div>
                  <Button
                    variant="danger"
                    className="w-full"
                    onPress={disconnectWebBluetooth}
                  >
                    Disconnect Printer
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs text-secondary/55">
                    Pair a Bluetooth Low Energy thermal printer (Chrome / Edge /
                    Android). Bluetooth Classic printers are not reachable from
                    the web.
                  </p>
                  <Button
                    variant="primary"
                    className="w-full"
                    onPress={handleConnectWebBt}
                  >
                    <FiPrinter />
                    <span>Pair Bluetooth Printer</span>
                  </Button>
                </>
              )}
            </div>
          )}

          {isUsbSupported && (
            <div className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-4">
              <div className="flex items-center gap-2">
                <FiPrinter className="text-secondary/50" />
                <p className="text-sm font-semibold text-secondary">USB</p>
              </div>
              {printerConnected && printerType === "usb" ? (
                <>
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2.5">
                    <FiCheck className="text-emerald-600" size={18} />
                    <span className="text-sm font-medium text-secondary">
                      {connectedPrinterName}
                    </span>
                  </div>
                  <Button
                    variant="danger"
                    className="w-full"
                    onPress={disconnectUsbPrinter}
                  >
                    Disconnect Printer
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs text-secondary/55">
                    Connect a thermal printer via USB and pair it directly in
                    this web app for raw ESC/POS printing.
                  </p>
                  <Button
                    variant="primary"
                    className="w-full"
                    onPress={handleConnectUsb}
                  >
                    <FiPrinter />
                    <span>Pair USB Printer</span>
                  </Button>
                </>
              )}
            </div>
          )}

          {!isWebBtSupported && !isUsbSupported ? (
            <div className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg p-3">
              Web Bluetooth and WebUSB are not supported in this browser. Please
              use Chrome, Edge, or Opera.
            </div>
          ) : null}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 w-full pb-4">
        <Button variant="danger-soft" type="button" onPress={onOpenChange}>
          <FiX size={16} />
          <span>Cancel</span>
        </Button>
      </div>
    </AppModal>
  );
};

export default BluetoothPrintersModal;
