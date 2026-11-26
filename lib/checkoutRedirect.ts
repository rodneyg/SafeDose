import { Linking, Platform } from "react-native";

export function checkoutHttpsUrl(value: unknown): string {
  if (typeof value !== "string" || !value) {
    throw new Error("Unable to open checkout. Please try again.");
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Unable to open checkout. Please try again.");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error("Unable to open checkout. Please try again.");
  }
  return parsed.toString();
}

export async function openCheckoutUrl(value: unknown, platform = Platform.OS): Promise<void> {
  const url = checkoutHttpsUrl(value);
  if (platform === "web") {
    window.location.assign(url);
    return;
  }
  await Linking.openURL(url);
}
