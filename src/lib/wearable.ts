/**
 * Real wearable integration via the standard Bluetooth GATT Heart Rate
 * Service (0x180D) — the same profile chest straps, most fitness watches,
 * and rings broadcast. No proprietary SDK, no fake step counter: this pairs
 * with an actual nearby device over Web Bluetooth and reads its live BPM.
 * Requires Chrome/Edge on desktop or Android — Web Bluetooth isn't
 * available on iOS Safari, which is a platform limitation, not ours.
 */

const HEART_RATE_SERVICE = "heart_rate";
const HEART_RATE_MEASUREMENT = "heart_rate_measurement";

export class WearableUnsupportedError extends Error {}

export function isWearableSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

/**
 * Parses the Heart Rate Measurement characteristic per the Bluetooth SIG
 * spec: the first byte's low bit says whether BPM is 8-bit or 16-bit.
 */
function parseHeartRate(value: DataView): number {
  const flags = value.getUint8(0);
  const is16Bit = (flags & 0x1) !== 0;
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1);
}

export interface WearableConnection {
  deviceName: string;
  disconnect: () => void;
}

/**
 * Requests a nearby Bluetooth heart-rate device, subscribes to live
 * readings, and calls `onReading` with each new BPM value.
 */
export async function connectHeartRateMonitor(
  onReading: (bpm: number) => void
): Promise<WearableConnection> {
  if (!isWearableSupported()) {
    throw new WearableUnsupportedError(
      "Web Bluetooth isn't available in this browser — try Chrome or Edge on desktop or Android."
    );
  }

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [HEART_RATE_SERVICE] }],
  });

  const server = await device.gatt?.connect();
  if (!server) throw new WearableUnsupportedError("Couldn't connect to the device.");

  const service = await server.getPrimaryService(HEART_RATE_SERVICE);
  const characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT);

  const handleValueChanged = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value) onReading(parseHeartRate(target.value));
  };

  characteristic.addEventListener("characteristicvaluechanged", handleValueChanged);
  await characteristic.startNotifications();

  return {
    deviceName: device.name || "Bluetooth heart-rate monitor",
    disconnect: () => {
      characteristic.removeEventListener("characteristicvaluechanged", handleValueChanged);
      characteristic.stopNotifications().catch(() => {});
      device.gatt?.disconnect();
    },
  };
}
