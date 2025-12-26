function renderList(files) {
  let markup = '';

  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  for (const file of files) {
    const title = new Date(parseInt(file)).toLocaleDateString('en-US', options)
    markup += `<a href="write?id=${file}">${title}</a>`
  }

  document.body.innerHTML = markup;
}

async function list() {
  const res = await fetch('/list')
  const files = await res.json();

  return files;
}

(async () => {
  const files = await list();
  renderList(files)
})();