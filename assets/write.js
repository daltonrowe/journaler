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
      data:
        window.journaler.entry.visibility === "private"
          ? await window.journaler.encryptText(image.src)
          : image.src,
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

async function displayImage(image) {
  const img = document.createElement("img");
  img.title = image;

  const res = await fetch(
    window.journaler.feedUrl(`entry/image/?id=${id()}&imageId=${image}`),
  );
  const data = await res.text();

  if (window.journaler.entry.visibility === "private") {
    img.src = await window.journaler.decryptText(data);
  } else {
    img.src = data;
  }

  images.appendChild(img);
}

async function load() {
  window.journaler.entry = await read();
  console.log(window.journaler.entry);

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
    displayImage(image);
  }

  window.history.pushState(
    {},
    "",
    window.journaler.feedUrl(`write?id=${window.journaler.entry.id}`),
  );
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

  load();
});
