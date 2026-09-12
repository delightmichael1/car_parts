/**
 * WebUSB printer helper to send raw ESC/POS bytes directly to USB thermal printers.
 */

// Define WebUSB types for TypeScript compilation without adding devDependencies
declare global {
  interface USBEndpoint {
    direction: string;
    type: string;
    endpointNumber: number;
  }

  interface USBAlternate {
    endpoints: USBEndpoint[];
  }

  interface USBInterface {
    interfaceNumber: number;
    alternates: USBAlternate[];
  }

  interface USBConfiguration {
    interfaces: USBInterface[];
  }

  interface USBDevice {
    opened: boolean;
    vendorId: number;
    productId: number;
    productName?: string;
    manufacturerName?: string;
    configuration?: USBConfiguration;
    open(): Promise<void>;
    close(): Promise<void>;
    selectConfiguration(configurationValue: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    releaseInterface(interfaceNumber: number): Promise<void>;
    transferOut(endpointNumber: number, data: BufferSource): Promise<any>;
  }

  interface Navigator {
    usb: {
      requestDevice(options: {
        filters: Array<{ vendorId: number; productId?: number }>;
      }): Promise<USBDevice>;
      getDevices(): Promise<USBDevice[]>;
    };
  }
}

export interface UsbPrinterDevice {
  name: string;
  vendorId: number;
  productId: number;
  device: USBDevice;
}

/**
 * Checks if WebUSB is supported in the current browser environment.
 */
export const isWebUsbSupported = (): boolean => {
  return typeof navigator !== "undefined" && "usb" in navigator;
};

/**
 * Finds the bulk-out endpoint and interface number for a USB printer.
 */
const findPrinterEndpoint = (device: USBDevice) => {
  if (!device.configuration) return null;

  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      // Look for bulk out endpoint
      for (const ep of alt.endpoints) {
        if (ep.direction === "out" && ep.type === "bulk") {
          return {
            interfaceNumber: iface.interfaceNumber,
            endpointNumber: ep.endpointNumber,
          };
        }
      }
    }
  }

  // Fallback to first interface/endpoint if class-matching fails
  try {
    const firstIface = device.configuration.interfaces[0];
    const firstAlt = firstIface.alternates[0];
    const outEp = firstAlt.endpoints.find((ep: any) => ep.direction === "out");
    if (outEp) {
      return {
        interfaceNumber: firstIface.interfaceNumber,
        endpointNumber: outEp.endpointNumber,
      };
    }
  } catch (e) {}

  return null;
};

/**
 * Sends ESC/POS commands (Uint8Array) directly to a USB device via WebUSB.
 */
export const printToUsbDevice = async (
  device: USBDevice,
  data: Uint8Array,
): Promise<void> => {
  if (!device.opened) {
    await device.open();
  }

  if (!device.configuration) {
    await device.selectConfiguration(1);
  }

  const endpointInfo = findPrinterEndpoint(device);
  if (!endpointInfo) {
    throw new Error(
      "No output bulk endpoint found on this USB device. It might not be a printer.",
    );
  }

  const { interfaceNumber, endpointNumber } = endpointInfo;

  await device.claimInterface(interfaceNumber);

  try {
    // Send data in chunks of 64 bytes for compatibility
    const chunkSize = 64;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await device.transferOut(endpointNumber, chunk);
    }
  } finally {
    try {
      await device.releaseInterface(interfaceNumber);
    } catch (e) {}
  }
};
