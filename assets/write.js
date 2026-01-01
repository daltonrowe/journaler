const saveButton = document.querySelector("#save");
const entry = document.querySelector("#write");
const visibility = document.querySelector("#visibility");

const salt = "thisisnotasecret";
const iv = "alsonotasecret";

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

async function getCryptoKey(password) {
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

async function deriveKey(password) {
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

async function encryptText(text, password) {
  const encoder = new TextEncoder();
  const key = await deriveKey(password);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: hexToArrayBuffer(iv) },
    key,
    encoder.encode(text),
  );

  return arrayBufferToHex(encrypted);
}

async function decryptText(encryptedData, password) {
  const key = await deriveKey(password, hexToArrayBuffer(salt));

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: hexToArrayBuffer(iv) },
    key,
    hexToArrayBuffer(encryptedData),
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

function id() {
  const searchParams = new URLSearchParams(window.location.search);
  const id = searchParams.get("id");

  return id;
}

async function read() {
  const res = await fetch(`/entry?id=${id()}`);
  const text = await res.json();

  return text;
}

async function content(injected = {}) {
  const password = prompt("Enter private password:");

  const metadata = {
    visibility: visibility.value,
  };

  const data = {
    metadata,
    entry:
      visibility.value === "public"
        ? entry.value
        : await encryptText(write.value, password),
  };

  return JSON.stringify({ ...data, ...injected });
}

async function create() {
  const res = await fetch("/entry", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: await content(),
  });

  const { id } = await res.json();

  window.history.pushState({}, "", `/write?id=${id}`);
}

async function update() {
  await fetch("/entry", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: await content({ id: id() }),
  });
}

async function save() {
  const postId = id();

  if (postId) {
    update(postId);
  } else {
    create();
  }
}

window.addEventListener("journaler-ready", async () => {
  if (!saveButton || !write) return;

  saveButton.addEventListener("click", save);

  if (id()) {
    const { metadata, entry } = await read();
    if (metadata.visibility === "public") {
      write.value = entry;
    } else {
      const password = prompt("Enter private password:");
      try {
        const decrypted = await decryptText(entry, password);
        write.value = decrypted;
      } catch (error) {
        alert("Password incorrect")
      }
    }
  }
});
