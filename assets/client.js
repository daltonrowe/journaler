window.journaler = {
  salt: "thisisnotasecret",
  iv: "alsonotasecret",
  sessionKeyBase: "journalerp",
  entry: null
};

window.journaler.feed = function () {
  const pattern = new URLPattern({ pathname: "/:feed/*" });
  const feed = pattern.exec(window.location)?.pathname?.groups?.feed;

  return feed;
}

window.journaler.feedUrl = (path) => {
  return `/${window.journaler.feed()}/${path}`;
};

window.journaler.sessionKey = function () {
  return `${window.journaler.sessionKeyBase}_${window.journaler.feed()}`
}

window.journaler.arrayBufferToHex = function (buffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

window.journaler.hexToArrayBuffer = function (hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

window.journaler.getCryptoKey = function () {
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(window.journaler.password);
  return crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
}

window.journaler.deriveKey = async function () {
  const keyMaterial = await window.journaler.getCryptoKey(window.journaler.password);

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: window.journaler.hexToArrayBuffer(window.journaler.salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

window.journaler.encryptText = async function (text) {
  const encoder = new TextEncoder();
  const key = await window.journaler.deriveKey(window.journaler.password);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: window.journaler.hexToArrayBuffer(window.journaler.iv) },
    key,
    encoder.encode(text),
  );

  return window.journaler.arrayBufferToHex(encrypted);
}

window.journaler.decryptText = async function (encryptedData) {
  const key = await window.journaler.deriveKey(window.journaler.password, window.journaler.hexToArrayBuffer(window.journaler.salt));

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: window.journaler.hexToArrayBuffer(window.journaler.iv) },
    key,
    window.journaler.hexToArrayBuffer(encryptedData),
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

window.journaler.requestPassword = function () {
  window.journaler.password = prompt("Enter private password:");
  sessionStorage.setItem(window.journaler.sessionKey(), window.journaler.password);
}

window.journaler.createPassword = function () {
  window.journaler.password = prompt("Create new private password:");
}

window.journaler.loadPassword = function () {
  window.journaler.password = sessionStorage.getItem(window.journaler.sessionKey());
}