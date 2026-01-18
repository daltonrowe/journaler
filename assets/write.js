const saveButton = document.querySelector("#save");
const entry = document.querySelector("#write");
const upload = document.querySelector("#upload");
const _visibility = document.querySelector("#visibility");

function id() {
  const searchParams = new URLSearchParams(window.location.search);
  const id = searchParams.get("id");

  return id || "new";
}

async function read() {
  const url = window.journaler.feedUrl(`entry?id=${id()}`);
  const res = await fetch(url);
  const json = await res.json();

  return json;
}

async function content() {
  return JSON.stringify({
    id: window.journaler.entry.id,
    content:
      window.journaler.entry.visibility === "private"
        ? await window.journaler.encryptText(write.value)
        : entry.value,
  });
}

async function upsert() {
  await fetch(window.journaler.feedUrl(`entry`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: await content(),
  });
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

      const imageId = Array.from({ length: 8 }, () =>
        "abcdefghijklmnopqrstuvwxyz0123456789".charAt(
          Math.floor(Math.random() * 36),
        ),
      ).join("");

      const resizedImg = document.createElement("img");
      resizedImg.classList.add("pending");
      resizedImg.src = canvas.toDataURL(file.type || "image/png");
      resizedImg.setAttribute("width", width);
      resizedImg.setAttribute("height", height);
      resizedImg.id = `image_${imageId}--${width}x${height}`;
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
    const [first] = image.id.split("--");
    const [, imageId] = first.split("_");
    const body = {
      id: id(),
      data:
        window.journaler.entry.visibility === "private"
          ? await window.journaler.encryptText(image.src)
          : image.src,
      width: image.getAttribute("width"),
      height: image.getAttribute("height"),
      imageId,
    };

    promises.push(
      fetch(window.journaler.feedUrl("entry/image"), {
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

async function displayImage(imageId) {
  const img = document.createElement("img");
  img.id = imageId;

  const hasDimensions = imageId.includes("--");

  if (hasDimensions) {
    const [, dims] = imageId.split("--");
    const [w, h] = dims.split("x");

    img.setAttribute("width", w);
    img.setAttribute("height", h);
  }

  const res = await fetch(
    window.journaler.feedUrl(`entry/image/?id=${id()}&imageId=${imageId}`),
  );
  const data = await res.text();

  if (window.journaler.entry.visibility === "private") {
    img.src = await window.journaler.decryptText(data);
  } else {
    img.src = data;
  }

  images.appendChild(img);
}

function insertImage(event) {
  if (event.target instanceof HTMLImageElement) {
    const start = entry.selectionStart;
    const end = entry.selectionEnd;
    const lineStart = entry.value.lastIndexOf("\n", start - 1) + 1;
    const col = start - lineStart;
    const prefix = col === 0 ? "" : "\n\n";
    const markdown = `${prefix}![](${event.target.id})\n\n`;
    entry.value =
      entry.value.substring(0, start) + markdown + entry.value.substring(end);
    entry.selectionStart = entry.selectionEnd = start + markdown.length;
    entry.focus();
  }
}

async function load() {
  window.journaler.entry = await read();

  if (
    window.journaler.entry.visibility === "private" &&
    !window.journaler.password
  ) {
    window.journaler.requestPassword();
  }

  let content = window.journaler.entry.content;

  if (window.journaler.entry.visibility === "private" && content) {
    try {
      content = await window.journaler.decryptText(
        window.journaler.entry.content,
      );
    } catch (_error) {
      alert("Password incorrect.");
      return;
    }
  }

  write.value = content;

  for (const image of window.journaler.entry.images) {
    await displayImage(image);
  }

  window.history.pushState(
    {},
    "",
    window.journaler.feedUrl(`write?id=${window.journaler.entry.id}`),
  );

  const entryEvent = new CustomEvent("journaler-entry-ready");
  window.dispatchEvent(entryEvent);
}

async function save() {
  if (
    !window.journaler.password &&
    window.journaler.entry.visibility === "private"
  ) {
    window.journaler.requestPassword();
  }

  await upsert();
  await uploadImages();

  const images = pendingImages();
  for (const image of images) {
    image.classList.remove("pending");
  }
}

window.addEventListener("journaler-ready", async () => {
  if (!saveButton || !write) return;

  saveButton.addEventListener("click", save);
  upload.addEventListener("change", queueImage);
  images.addEventListener("click", insertImage);

  load();
});
