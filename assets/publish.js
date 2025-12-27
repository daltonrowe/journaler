const staged = document.querySelector("#staged");
const publish = document.querySelector("#publish");

async function publishStaged() {
  const res = await fetch("/publish", { method: 'POST' });
  const data = await res.json();

  console.log(data);

  return data;
}

async function fetchStaged() {
  const res = await fetch("/staged");
  const { files } = await res.json();

  return files;
}

function renderStaged(files) {
  let markup = "";

  for (const file of files) {
    markup += `<div>${file}</div>`;
  }

  staged.innerHTML = markup;
}

async function refreshStaged() {
  const files = await fetchStaged();
  renderStaged(files)
}

window.addEventListener("journaler-ready", async () => {
  if (!staged) return;

  refreshStaged();

  publish.addEventListener("click", publishStaged)
});