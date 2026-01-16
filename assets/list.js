const list = document.querySelector("#list");
const sync = document.querySelector("#sync");

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

    markup += `<a href="${feedUrl(`write?id=${id}`)}">${title}</a>`;
  }

  list.innerHTML = markup;
}

async function fetchList() {
  const res = await fetch(feedUrl('list'));
  const data = await res.json();

  return data;
}

async function renderSync(syncKey) {
  console.log(syncKey);

  if (syncKey === false) {
    sync.innerHTML = 'ℹ️ Sync key not found. Click to create.'
    sync.dataset.state = 'not-found'
    return;
  }

  if (syncKey === null) {
    sync.innerHTML = '🔓 Public feed directory.'
    sync.dataset.state = 'public'
    return;
  }

  if (syncKey && password) {
    try {
      await decryptText(syncKey)
      sync.innerHTML = '✅ Decryption key valid.';
      sync.dataset.state = 'valid'
    } catch (error) {
      sync.innerHTML = '‼️ Decryption key invalid.';
      sync.dataset.state = 'invalid'
    }
  }

  if (syncKey && !password) {
    sync.innerHTML = '🔐 Sync key found, awaiting password.'
    sync.dataset.state = 'found'
  }
}

async function handleSync() {
  switch (sync.dataset.state) {
    case 'not-found': {
      const material = prompt('Enter sync key material:')
      password = prompt('Create new password for feed:')

      const encrypted = await encryptText(material)

      await fetch(feedUrl('syncKey'), {
        method: 'POST',
        body: JSON.stringify({ encrypted }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      window.location.reload();
    }
      break;

    case 'found': {
      loadPassword();
      window.location.reload();
    }
      break;

    default:
      alert("Unknown sync key state!")
      break;
  }
}

window.addEventListener("journaler-ready", async () => {
  if (!list) return;

  sync.addEventListener('click', handleSync)

  const { syncKey, ids } = await fetchList();
  renderList(ids);
  renderSync(syncKey);
});
