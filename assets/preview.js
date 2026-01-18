const preview = document.querySelector('#preview');
const write = document.querySelector('#write');

let debounce;

const renderPreview = () => {
  const content = write.value;
  const lines = content.split('\n');

  const toId = (text) => text.slice(0, 16).replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const parseBold = (text) => text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const parseItalic = (text) => text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  const parseLinks = (text) => parseItalic(parseBold(text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')));
  const parseImages = (text) => text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, title, id) => {
    const imgEl = document.getElementById(id);
    const src = imgEl ? imgEl.src : '';
    const sizeMatch = id.match(/--(\d+)x(\d+)$/);
    const dims = sizeMatch ? ` width="${sizeMatch[1]}" height="${sizeMatch[2]}"` : '';
    return `<figure><img data-ref="${id}" src="${src}" title="${title}"${dims}><figcaption>${title}</figcaption></figure>`;
  });

  const result = [];
  let inList = false;
  let inCode = false;
  let prevEmpty = true;

  const getLineType = (line) => {
    if (line === '```') return 'code-fence';
    if (inCode) return 'code';
    if (line.startsWith('-- ')) return 'list-detail';
    if (line.startsWith('- ')) return 'list';
    if (line.startsWith('> ')) return 'blockquote';
    if (line.startsWith('### ')) return 'h3';
    if (line.startsWith('## ')) return 'h2';
    if (line.startsWith('# ')) return 'h1';
    if (/^!\[[^\]]*\]\([^)]+\)$/.test(line)) return 'image';
    return 'text';
  };

  for (const line of lines) {
    const type = getLineType(line);

    if (type !== 'list' && inList) {
      result.push('</ul>');
      inList = false;
    }

    switch (type) {
      case 'list-detail': {
        const lastIndex = result.length - 1;
        if (lastIndex >= 0 && result[lastIndex].endsWith('</li>')) {
          result[lastIndex] = result[lastIndex].slice(0, -5) + `<small>${parseLinks(line.slice(3))}</small></li>`;
        }
        break;
      }
      case 'list': {
        if (!inList) {
          result.push('<ul>');
          inList = true;
        }
        const listContent = line.slice(2);
        const iconMatch = listContent.match(/^([^a-zA-Z0-9\s]+)\s+(.*)$/);
        if (iconMatch) {
          result.push(`<li><span class="icon">${iconMatch[1]}</span> ${parseLinks(iconMatch[2])}</li>`);
        } else {
          result.push(`<li>${parseLinks(listContent)}</li>`);
        }
        break;
      }
      case 'h3': {
        const text = line.slice(4);
        result.push(`<h3 id="${toId(text)}">${parseLinks(text)}</h3>`);
        break;
      }
      case 'h2': {
        const text = line.slice(3);
        result.push(`<h2 id="${toId(text)}">${parseLinks(text)}</h2>`);
        break;
      }
      case 'h1': {
        const text = line.slice(2);
        result.push(`<h1 id="${toId(text)}">${parseLinks(text)}</h1>`);
        break;
      }
      case 'image':
        result.push(parseImages(line));
        break;
      case 'blockquote':
        result.push(`<blockquote>${parseLinks(line.slice(2))}</blockquote>`);
        break;
      case 'code-fence':
        if (inCode) {
          result.push('</code>');
          inCode = false;
        } else {
          result.push('<code>');
          inCode = true;
        }
        break;
      case 'code':
        result.push(line.replace(/[\u00A0-\u9999<>\&]/g, i => '&#' + i.charCodeAt(0) + ';'));
        break;
      default:
        if (line === '') {
          prevEmpty = true;
        } else if (prevEmpty) {
          result.push(`<p>${parseLinks(line)}</p>`);
          prevEmpty = false;
        } else {
          result.push(parseLinks(line));
        }
    }
  }

  if (inList) {
    result.push('</ul>');
  }

  if (inCode) {
    result.push('</code>');
  }

  const markup = result.join('\n');

  preview.innerHTML = markup;
}

const debouncedRenderPreview = () => {
  console.log(debounce);

  if (debounce) {
    clearTimeout(debounce);
  }

  debounce = setTimeout(() => {
    renderPreview();
    clearTimeout(debounce)
  }, 500)
}

window.addEventListener("journaler-entry-ready", async () => {
  if (!preview || !write) return;

  write.addEventListener("input", debouncedRenderPreview);
  renderPreview();
});