export function getDeviceInfo() {
  const userAgent = navigator.userAgent;
  let browser = "Unknown";
  let browserVersion = "Unknown";
  let os = "Unknown";
  let osVersion = "Unknown";
  
  // Basic OS detection
  if (userAgent.indexOf("Win") !== -1) os = "Windows";
  if (userAgent.indexOf("Mac") !== -1) os = "MacOS";
  if (userAgent.indexOf("Linux") !== -1) os = "Linux";
  if (userAgent.indexOf("Android") !== -1) os = "Android";
  if (userAgent.indexOf("like Mac") !== -1) os = "iOS";

  // Basic Browser detection
  if (userAgent.indexOf("Chrome") !== -1) browser = "Chrome";
  else if (userAgent.indexOf("Safari") !== -1) browser = "Safari";
  else if (userAgent.indexOf("Firefox") !== -1) browser = "Firefox";
  else if (userAgent.indexOf("MSIE") !== -1 || !!document.documentMode) browser = "IE";
  else if (userAgent.indexOf("Edg") !== -1) browser = "Edge";

  // Device type (1 = Web, 2 = Mobile App)
  // Since this is the React frontend running in a browser, it's always Web (1).
  const deviceType = 1;

  // Generate or retrieve a persistent Device ID for this specific browser
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    localStorage.setItem("deviceId", deviceId);
  }

  return {
    deviceId: deviceId,
    deviceName: `${os} Device`,
    brand: "Unknown",
    model: "Web Browser",
    os: os,
    osVersion: osVersion,
    systemName: navigator.platform || "Unknown",
    systemVersion: "Unknown",
    deviceType: deviceType,
    appVersion: "1.0.0",
    totalMemory: navigator.deviceMemory || null,
    browser: browser,
    browserVersion: browserVersion
  };
}
