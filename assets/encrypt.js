const salt = "thisisnotasecret";
const iv = "alsonotasecret";
const sessionKey = 'journalerp'

let password = sessionStorage.getItem(sessionKey);

function arrayBufferToHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToArrayBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

async function getCryptoKey() {
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(password);
  return crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
}

async function deriveKey() {
  const keyMaterial = await getCryptoKey(password);

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: hexToArrayBuffer(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptText(text) {
  const encoder = new TextEncoder();
  const key = await deriveKey(password);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: hexToArrayBuffer(iv) },
    key,
    encoder.encode(text),
  );

  return arrayBufferToHex(encrypted);
}

async function decryptText(encryptedData) {
  const key = await deriveKey(password, hexToArrayBuffer(salt));

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: hexToArrayBuffer(iv) },
    key,
    hexToArrayBuffer(encryptedData),
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

function loadPassword() {
  const p = prompt("Enter private password:");
  sessionStorage.setItem(sessionKey, p);

  password = p;
}