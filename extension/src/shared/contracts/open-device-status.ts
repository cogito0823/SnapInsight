export const OPEN_DEVICE_STATUS_MESSAGE_TYPE =
  "snapinsight/open-device-status" as const;

export interface OpenDeviceStatusMessage {
  type: typeof OPEN_DEVICE_STATUS_MESSAGE_TYPE;
}

export function isOpenDeviceStatusMessage(
  value: unknown
): value is OpenDeviceStatusMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === OPEN_DEVICE_STATUS_MESSAGE_TYPE
  );
}
