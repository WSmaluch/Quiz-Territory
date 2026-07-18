export function getFirebaseEmulatorHost(
  configuredValue = import.meta.env.VITE_FIREBASE_EMULATOR_HOST,
  browserHostname = window.location.hostname,
): string {
  return configuredValue?.trim() || browserHostname;
}
