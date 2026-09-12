/**
 * Web Bluetooth printer helper for sending raw ESC/POS bytes to BLE thermal
 * printers from a browser. Supported in Chrome / Edge / Opera on desktop and
 * Android. Requires HTTPS and a user gesture.
 *
 * Caveats:
 *  - Only BLE (GATT) printers work; Bluetooth Classic / SPP printers cannot
 *    be reached from the web — use the native Capacitor build for those.
 *  - Not available in Safari (iOS / macOS) or Firefox.
 */

// Minimal Web Bluetooth typings (avoid adding @types/web-bluetooth).
declare global {
  interface BluetoothCharacteristicProperties {
    read: boolean;
    write: boolean;
    writeWithoutResponse: boolean;
  }

  interface BluetoothRemoteGATTCharacteristic {
    uuid: string;
    properties: BluetoothCharacteristicProperties;
    writeValue(value: BufferSource): Promise<void>;
    writeValueWithoutResponse(value: BufferSource): Promise<void>;
    service: BluetoothRemoteGATTService;
  }

  interface BluetoothRemoteGATTService {
    uuid: string;
    device: BluetoothDevice;
    getCharacteristics(
      characteristic?: string | string[],
    ): Promise<BluetoothRemoteGATTCharacteristic[]>;
  }

  interface BluetoothRemoteGATTServer {
    device: BluetoothDevice;
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
    getPrimaryServices(
      service?: string | string[],
    ): Promise<BluetoothRemoteGATTService[]>;
  }

  interface BluetoothDevice {
    id: string;
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
    connected?: boolean;
  }

  interface Bluetooth {
    requestDevice(options: {
      acceptAllDevices?: boolean;
      filters?: Array<{ name?: string; namePrefix?: string; services?: string[] }>;
      optionalServices?: string[];
    }): Promise<BluetoothDevice>;
  }

  interface Navigator {
    bluetooth?: Bluetooth;
  }
}

/** A connected Web Bluetooth printer, ready for raw writes. */
export interface WebBluetoothPrinter {
  name: string;
  id: string;
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
}

/**
 * Common BLE service UUIDs used by ESC/POS thermal printers. We advertise
 * these as optional services so the browser is permitted to access them.
 */
const PRINTER_SERVICE_UUIDS = [
  "000018f0-0000-1000-8000-00805f9b34fb", // standard printer service
  "0000ff00-0000-1000-8000-00805f9b34fb", // generic BLE write
  "0000ae30-0000-1000-8000-00805f9b34fb", // Zjiang / ESC-POS modules
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // Microchip (common in BLE POS)
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // vendor common
];

/** Checks if Web Bluetooth is available in the current browser. */
export const isWebBluetoothSupported = (): boolean => {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.bluetooth &&
    "requestDevice" in navigator.bluetooth
  );
};

/** Preferred ordering when scanning a printer's services. */
const serviceRank = (uuid: string): number => {
  const index = PRINTER_SERVICE_UUIDS.indexOf(uuid);
  return index === -1 ? PRINTER_SERVICE_UUIDS.length : index;
};

/**
 * Prompts the user to choose a BLE thermal printer and connects to its first
 * writable characteristic. Prefers known printer services, then falls back to
 * any service exposing a writable characteristic.
 */
export const connectWebBluetoothPrinter = async (): Promise<WebBluetoothPrinter> => {
  if (!isWebBluetoothSupported()) {
    throw new Error(
      "Web Bluetooth is not supported in this browser. Use Chrome, Edge, or Opera.",
    );
  }

  const device = await navigator.bluetooth!.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICE_UUIDS,
  });

  if (!device.gatt) {
    throw new Error("This device has no GATT server — it may be Bluetooth Classic.");
  }

  const server = await device.gatt.connect();
  const characteristic = await findWriteCharacteristic(server);

  return {
    name: device.name || "Bluetooth Printer",
    id: device.id,
    device,
    characteristic,
  };
};

/**
 * Locates a characteristic we can write ESC/POS bytes to. Prefers known
 * printer services in order; otherwise accepts the first writable
 * characteristic found anywhere on the device.
 */
const findWriteCharacteristic = async (
  server: BluetoothRemoteGATTServer,
): Promise<BluetoothRemoteGATTCharacteristic> => {
  let services: BluetoothRemoteGATTService[] = [];
  try {
    services = await server.getPrimaryServices();
  } catch {
    services = [];
  }

  const byPreference = [...services].sort(
    (a, b) => serviceRank(a.uuid) - serviceRank(b.uuid),
  );

  for (const service of byPreference) {
    try {
      const characteristics = await service.getCharacteristics();
      for (const characteristic of characteristics) {
        if (
          characteristic.properties.writeWithoutResponse ||
          characteristic.properties.write
        ) {
          return characteristic;
        }
      }
    } catch {
      // try the next service
    }
  }

  throw new Error(
    "No writable characteristic found. This printer may not support raw ESC/POS writes.",
  );
};

/** Disconnects a Web Bluetooth printer. */
export const disconnectWebBluetoothPrinter = (printer: WebBluetoothPrinter) => {
  try {
    printer.device.gatt?.disconnect();
  } catch {
    /* already disconnected */
  }
};

/**
 * Writes ESC/POS bytes to the printer. Uses write-without-response where the
 * characteristic supports it (large chunks), otherwise write-with-response
 * with smaller chunks for compatibility.
 */
export const printToWebBluetooth = async (
  printer: WebBluetoothPrinter,
  data: Uint8Array,
): Promise<void> => {
  const useWithoutResponse =
    printer.characteristic.properties.writeWithoutResponse;
  const chunkSize = useWithoutResponse ? 500 : 100;

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    if (useWithoutResponse) {
      await printer.characteristic.writeValueWithoutResponse(chunk);
    } else {
      await printer.characteristic.writeValue(chunk);
    }
  }
};