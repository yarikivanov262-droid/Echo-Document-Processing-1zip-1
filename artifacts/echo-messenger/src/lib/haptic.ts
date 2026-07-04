function isEnabled() {
  try { return localStorage.getItem("echo_haptic") !== "false"; } catch { return true; }
}

export const haptic = {
  light: () => { if (isEnabled()) navigator.vibrate?.(10); },
  medium: () => { if (isEnabled()) navigator.vibrate?.(25); },
  error: () => { if (isEnabled()) navigator.vibrate?.([10, 50, 10]); },
  success: () => { if (isEnabled()) navigator.vibrate?.([10, 30, 20]); },
};
