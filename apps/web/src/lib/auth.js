export const APP_ACCESS_CODE = '916491';

const UNLOCK_KEY = 'appmuscu_unlocked';

export function isUnlocked() {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export function setUnlocked() {
  try {
    sessionStorage.setItem(UNLOCK_KEY, '1');
  } catch {
    /* sessionStorage unavailable */
  }
}

export function lockApp() {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* sessionStorage unavailable */
  }
}

export function verifyCode(input) {
  return input === APP_ACCESS_CODE;
}
