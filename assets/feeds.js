const feeds = document.querySelector("#feeds");

function renderFeeds(data) {
  let markup = "";

  for (const feed of data) {
    markup += `
    <div class="feed">
    <strong>${feed.id}</strong>
    <div>
      <a href="/${feed.id}/write">New</a>
      <a href="/${feed.id}/">List</a>
      <a href="/${feed.id}/publish">Publish</a>
      </div>
    </div>
    `;
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
