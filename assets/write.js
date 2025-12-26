const saveButton = document.querySelector("#save");
const entry = document.querySelector("#entry");

function id() {
  const searchParams = new URLSearchParams(window.location.search);
  const id = searchParams.get("id");

  return id;
}

async function read() {
  const res = await fetch(`/${id()}/entry.txt`);
  const text = await res.text();

  return window.journaler.decrypt(text);
}

async function save() {
  const encrypted = window.journaler.encrypt(entry.value);

  await fetch(`/save/${id()}`, {
    method: "POST",
    body: JSON.stringify({
      id: id(),
      entry: encrypted,
    }),
  });
}

window.addEventListener("journaler-ready", async () => {
  if (!saveButton || !entry) return;

  saveButton.addEventListener("click", save);
  const value = await read();
  entry.value = value;
});
