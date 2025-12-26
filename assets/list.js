const list = document.querySelector("#list");

function renderList(ids) {
  let markup = "";

  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  for (const id of ids) {
    const title = new Date(parseInt(id, 10)).toLocaleDateString(
      "en-US",
      options,
    );
    markup += `<a href="write?id=${id}">${title}</a>`;
  }

  list.innerHTML = markup;
}

async function fetchList() {
  const res = await fetch("/list");
  const ids = await res.json();

  return ids;
}

window.addEventListener("journaler-ready", async () => {
  if (!list) return;

  const ids = await fetchList();
  renderList(ids);
});
