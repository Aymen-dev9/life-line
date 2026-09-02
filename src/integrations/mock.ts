import type { MapProvider, NotificationProvider } from "./ports";

export class MockNotificationProvider implements NotificationProvider {
  async send(): Promise<{ state: "simulated" }> {
    return { state: "simulated" };
  }
}

export class BaghdadMockMapProvider implements MapProvider {
  async reverseGeocode(): Promise<{ formattedAddress: string }> {
    return { formattedAddress: "Baghdad — location requires user confirmation" };
  }
}

