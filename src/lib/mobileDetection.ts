// Utility for detecting mobile/iPad devices
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const ua = navigator.userAgent.toLowerCase();
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isMobileUA = /iphone|ipad|ipod|android|webos|blackberry|iemobile|opera mini/i.test(ua);
  const isSmallScreen = window.innerWidth < 768;
  // Better iPad detection - iPadOS doesn't always include "iPad" in user agent
  const isIPad = (ua.includes('mac') && isTouchDevice) || ua.includes('ipad');
  
  return isMobileUA || isIPad || isSmallScreen || isTouchDevice;
}

