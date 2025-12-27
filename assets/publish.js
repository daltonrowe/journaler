const publish = document.querySelector("#publish");

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

  publish.innerHTML = markup;
}

window.addEventListener("journaler-ready", async () => {
  if (!publish) return;

  const files = await fetchStaged();
  renderStaged(files)
});