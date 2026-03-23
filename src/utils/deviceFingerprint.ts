const STORAGE_KEY = 'autolab_device_fp';

export function generateDeviceFingerprint(): string {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  // Generate a unique fingerprint using crypto + device characteristics
  const fingerprint = 'fp_' + crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, fingerprint);
  return fingerprint;
}

export function getDeviceInfo(): Record<string, string> {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenRes: screen.width + 'x' + screen.height,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
  };
}

export function clearDeviceFingerprint(): void {
  localStorage.removeItem(STORAGE_KEY);
}
