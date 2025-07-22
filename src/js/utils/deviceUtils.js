//src/js/utils/deviceUtils.js

/**
 * Detects if the current device is a mobile device.
 * @returns {boolean} - True if the device is mobile, false otherwise.
 */
export function isMobileDevice() {
  return /Mobi|Android/i.test(navigator.userAgent);
}
