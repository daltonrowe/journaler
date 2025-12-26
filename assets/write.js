const saveButton = document.querySelector("#save");
const entry = document.querySelector("#entry");

function id() {
  const searchParams = new URLSearchParams(window.location.search);
  const id = searchParams.get("id");

  return id;
}

async function read() {
  const res = await fetch(`/${id()}/entry`);
  const text = await res.text();

  return text;
}

async function create() {
  const res = await fetch("/entry", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      entry: entry.value,
    }),
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
    body: JSON.stringify({
      id: id(),
      entry: entry.value,
    }),
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
  if (!saveButton || !entry) return;

  saveButton.addEventListener("click", save);

  if (id()) {
    const value = await read();
    entry.value = value;
  }
});
