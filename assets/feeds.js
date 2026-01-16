const feeds = document.querySelector("#feeds");

function renderFeeds(data) {
  let markup = "";

  for (const feed of data) {
    markup += `<a href="/${feed.id}/">${feed.id}</a>`;
  }

  feeds.innerHTML = markup;
}

async function fetchFeeds() {
  const res = await fetch("/feeds");
  const ids = await res.json();

  return ids;
}

window.addEventListener("journaler-ready", async () => {
  if (!feeds) return;

  const data = await fetchFeeds();

  renderFeeds(data.feeds);
});
