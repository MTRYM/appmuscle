export async function calculateSHA256(data: string | ArrayBuffer): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = typeof data === 'string' ? encoder.encode(data) : data;
  
  // Use Web Crypto API if available (requires HTTPS or localhost)
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback for non-secure contexts (e.g. mobile testing over HTTP Wi-Fi)
  // Simple DJB2 hash for identification/audit (not secure, but prevents crashing)
  let str = typeof data === 'string' ? data : new TextDecoder().decode(buffer);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return 'fallback-hash-' + (hash >>> 0).toString(16);
}

/**
 * Check if the Web Crypto subtle API is available.
 * It is NOT available on Safari over HTTP (non-localhost).
 */
function isSubtleAvailable(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  if (!isSubtleAvailable()) {
    throw new Error('Le chiffrement nécessite une connexion HTTPS ou localhost. crypto.subtle n\'est pas disponible dans ce contexte.');
  }
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(data: string, password: string): Promise<{ encrypted: string, salt: string, iv: string }> {
  if (!isSubtleAvailable()) {
    throw new Error('Le chiffrement nécessite une connexion HTTPS ou localhost.');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  
  const encoder = new TextEncoder();
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );
  
  const encryptedArray = Array.from(new Uint8Array(encryptedBuffer));
  const encryptedBase64 = btoa(String.fromCharCode.apply(null, encryptedArray));
  const saltBase64 = btoa(String.fromCharCode.apply(null, Array.from(salt)));
  const ivBase64 = btoa(String.fromCharCode.apply(null, Array.from(iv)));
  
  return { encrypted: encryptedBase64, salt: saltBase64, iv: ivBase64 };
}

export async function decryptData(encryptedBase64: string, saltBase64: string, ivBase64: string, password: string): Promise<string> {
  if (!isSubtleAvailable()) {
    throw new Error('Le déchiffrement nécessite une connexion HTTPS ou localhost.');
  }
  const salt = new Uint8Array(atob(saltBase64).split('').map(c => c.charCodeAt(0)));
  const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
  const encryptedBuffer = new Uint8Array(atob(encryptedBase64).split('').map(c => c.charCodeAt(0)));
  
  const key = await deriveKey(password, salt);
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedBuffer
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}
