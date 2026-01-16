const saveButton = document.querySelector("#save");
const entry = document.querySelector("#write");
const upload = document.querySelector("#upload");
const visibility = document.querySelector("#visibility");

function id() {
  const searchParams = new URLSearchParams(window.location.search);
  const id = searchParams.get("id");

  return id;
}

async function read() {
  const url = window.journaler.feedUrl(`entry?id=${id()}`);
  const res = await fetch(url);
  const json = await res.json();

  return json;
}

async function content(injected = {}) {
  const data = {
    metadata,
    entry: window.journaler.password ? await window.journaler.encryptText(write.value) : entry.value,
  };

  return JSON.stringify({ ...data, ...injected });
}

async function create() {
  const res = await fetch(window.journaler.feedUrl("entry"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: await content(),
  });

  const { id } = await res.json();

  window.history.pushState({}, "", window.journaler.feedUrl(`/write?id=${id}`));
}

async function update() {
  await fetch(window.journaler.feedUrl(entry), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: await content({ id: id() }),
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
      data: window.journaler.password ? await window.journaler.encryptText(image.src) : image.src,
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

async function displayImage(image) {
  const img = document.createElement("img");
  img.title = image;

  const res = await fetch(`/${id()}/${image}`);
  const data = await res.text();

  if (window.journaler.password) {
    img.src = await window.journaler.decryptText(data);
  } else {
    img.src = data;
  }

  images.appendChild(img);
}

async function load() {
  const { type, visibility, entry, images } = await read();


  if (visibility === "private" && !window.journaler.password) {
    window.journaler.requestPassword();
  }

  let entryValue = entry;

  if (window.journaler.password) {
    try {
      entryValue = await window.journaler.decryptText(entry);
    } catch (_error) {
      alert("Password incorrect.");
      return;
    }
  }

  write.value = entryValue;
  for (const image of images) {
    displayImage(image);
  }
}

async function save() {
  const postId = id();

  if (!window.journaler.password && visibility.value === "private") {
    window.journaler.requestPassword()
  }

  if (postId) {
    await update(postId);
  } else {
    await create();
  }

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

  if (id()) load();
});
