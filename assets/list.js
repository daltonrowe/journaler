const list = document.querySelector("#list");
const sync = document.querySelector("#sync");
const createNew = document.querySelector("#createNew");

function formatTitle(title, titleType) {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  switch (titleType) {
    case "date":
      return new Date(parseInt(title, 10)).toLocaleDateString("en-US", options);

    case "date-slug": {
      const [date, ...slug] = title.split("-");

      const dateTitle = new Date(parseInt(date, 10)).toLocaleDateString(
        "en-US",
        options,
      );
      return `${dateTitle}: ${slug.join(" ")}`;
    }

    default:
      return "Unknown title format";
  }
}

function renderList(ids, titleType) {
  let markup = "";

  for (const id of ids) {
    const title = formatTitle(id, titleType);
    markup += `<a href="${window.journaler.feedUrl(`write?id=${id}`)}">${title}</a>`;
  }

  list.innerHTML = markup;
}

async function fetchList() {
  const res = await fetch(window.journaler.feedUrl("list"));
  const data = await res.json();

  return data;
}

async function renderSync(syncKey) {
  if (syncKey === false) {
    sync.innerHTML = "ℹ️ Sync key not found. Click to create.";
    sync.dataset.state = "not-found";
    return;
  }

  if (syncKey === null) {
    sync.innerHTML = "🔓 Public feed directory.";
    sync.dataset.state = "public";
    return;
  }

  if (syncKey && window.journaler.password) {
    try {
      await window.journaler.decryptText(syncKey);
      sync.innerHTML = "✅ Decryption key valid.";
      sync.dataset.state = "valid";
    } catch (_error) {
      sync.innerHTML = "‼️ Decryption key invalid. Click to reset.";
      sync.dataset.state = "invalid";
    }
  }

  if (syncKey && !window.journaler.password) {
    sync.innerHTML = "🔐 Sync key found, awaiting password.";
    sync.dataset.state = "found";
  }
}

async function handleSync() {
  switch (sync.dataset.state) {
    case "not-found":
      {
        const material = window.journaler.generateKeyMaterial();
        window.journaler.createPassword();

        const encrypted = await window.journaler.encryptText(material);

        await fetch(window.journaler.feedUrl("syncKey"), {
          method: "POST",
          body: JSON.stringify({ encrypted }),
          headers: {
            "Content-Type": "application/json",
          },
        });

        window.location.reload();
      }
      break;

    case "found":
      {
        window.journaler.requestPassword();
        window.location.reload();
      }
      break;

    case "invalid":
      {
        window.journaler.dumpPassword();
        window.location.reload();
      }
      break;

    default:
      alert("Unknown sync key state!");
      break;
  }
}

function renderCreate() {
  createNew.innerHTML = `<a href="${window.journaler.feedUrl("write")}">Create New</a>`;
}

window.addEventListener("journaler-ready", async () => {
  if (!list) return;

  sync.addEventListener("click", handleSync);
  sync.addEventListener("click", handleSync);

  const { syncKey, ids, title: titleType } = await fetchList();
  await renderSync(syncKey);

  if (sync.dataset.state === "valid" || sync.dataset.state === "public") {
    renderList(ids, titleType);
    renderCreate();
  }
});
