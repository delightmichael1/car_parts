import useDeviceStore from "@/stores/useDeviceStore";
import { Device } from "@capacitor/device";

function UseDeviceInfo() {
  const getDeviceInfo = async () => {
    const model = (await Device.getInfo()).model;
    const deviceName = (await Device.getInfo()).name ?? "unknown";
    const deviceId = (await Device.getId()).identifier;
    const platform = (await Device.getInfo()).platform;
    const operatingSystem = (await Device.getInfo()).operatingSystem;

    useDeviceStore.setState((state) => {
      state.device = {
        model: model,
        id: deviceId,
        platform: platform,
        operatingSystem: operatingSystem,
        deviceName: deviceName || "unknown",
      };
    });
  };

  return { getDeviceInfo };
}

export default UseDeviceInfo;
