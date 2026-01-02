const saveButton = document.querySelector("#save");
const entry = document.querySelector("#write");
const upload = document.querySelector("#upload");
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

function imageId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function queueImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1280;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      const resizedImg = document.createElement("img");
      resizedImg.classList.add("pending");
      resizedImg.src = canvas.toDataURL(file.type || "image/jpeg", 0.9);
      document.querySelector("#images").appendChild(resizedImg);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function pendingImages() {
  return Array.from(document.querySelectorAll("#images .pending"));
}

async function uploadImages() {
  const pending = pendingImages();

  const promises = [];

  for (const image of pending) {
    const body = {
      id: id(),
      data: image.src,
      imageId: imageId(),
    };

    promises.push(
      fetch("/entry/image", {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
  }

  await Promise.allSettled(promises);
}

async function save() {
  const postId = id();

  if (postId) {
    await update(postId);
  } else {
    await create();
  }

  await uploadImages();
}

window.addEventListener("journaler-ready", async () => {
  if (!saveButton || !write) return;

  saveButton.addEventListener("click", save);
  upload.addEventListener("change", queueImage);

  if (id()) {
    const { metadata, entry } = await read();
    if (metadata.visibility === "public") {
      write.value = entry;
    } else {
      const password = prompt("Enter private password:");

      try {
        const decrypted = await decryptText(entry, password);
        write.value = decrypted;
      } catch (_error) {
        alert("Password incorrect");
      }
    }
  }
});
