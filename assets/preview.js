const preview = document.querySelector('#preview');
const write = document.querySelector('#write');

let debounce;

const toId = (text) => text.slice(0, 16).replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
const escapeHtml = (text) => text.replace(/[\u00A0-\u9999<>\&]/g, i => '&#' + i.charCodeAt(0) + ';');

const parseInline = (text) => text
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g, '<em>$1</em>');

const parseImage = (text) => text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, title, id) => {
  const imgEl = document.getElementById(id);
  const src = imgEl ? imgEl.src : '';
  const sizeMatch = id.match(/--(\d+)x(\d+)$/);
  const dims = sizeMatch ? ` width="${sizeMatch[1]}" height="${sizeMatch[2]}"` : '';
  return `<figure><img data-ref="${id}" src="${src}" title="${title}"${dims}><figcaption>${title}</figcaption></figure>`;
});

const lineTypes = [
  [/^```$/, 'code-fence'],
  [/^-- /, 'list-detail'],
  [/^- /, 'list'],
  [/^> /, 'blockquote'],
  [/^### /, 'h3'],
  [/^## /, 'h2'],
  [/^# /, 'h1'],
  [/^!\[[^\]]*\]\([^)]+\)$/, 'image'],
];

const renderPreview = () => {
  const lines = write.value.split('\n');
  const result = [];
  let inList = false;
  let inCode = false;
  let prevEmpty = true;

  const getLineType = (line) => {
    if (inCode && line !== '```') return 'code';
    for (const [pattern, type] of lineTypes) {
      if (pattern.test(line)) return type;
    }
    return 'text';
  };

  for (const line of lines) {
    const type = getLineType(line);

    if (type !== 'list' && type !== 'list-detail' && inList) {
      result.push('</ul>');
      inList = false;
    }

    switch (type) {
      case 'list-detail': {
        const lastIndex = result.length - 1;
        if (lastIndex >= 0 && result[lastIndex].endsWith('</li>')) {
          result[lastIndex] = result[lastIndex].slice(0, -5) + `<small>${parseInline(line.slice(3))}</small></li>`;
        }
        break;
      }
      case 'list': {
        if (!inList) {
          result.push('<ul>');
          inList = true;
        }
        const content = line.slice(2);
        const iconMatch = content.match(/^([^a-zA-Z0-9\s]+)\s+(.*)$/);
        if (iconMatch) {
          result.push(`<li><span class="icon">${iconMatch[1]}</span> ${parseInline(iconMatch[2])}</li>`);
        } else {
          result.push(`<li>${parseInline(content)}</li>`);
        }
        break;
      }
      case 'h1':
      case 'h2':
      case 'h3': {
        const level = type[1];
        const text = line.slice(parseInt(level) + 1);
        result.push(`<${type} id="${toId(text)}">${parseInline(text)}</${type}>`);
        break;
      }
      case 'image':
        result.push(parseImage(line));
        break;
      case 'blockquote':
        result.push(`<blockquote>${parseInline(line.slice(2))}</blockquote>`);
        break;
      case 'code-fence':
        result.push(inCode ? '</code>' : '<code>');
        inCode = !inCode;
        break;
      case 'code':
        result.push(escapeHtml(line));
        break;
      default:
        if (line === '') {
          prevEmpty = true;
        } else if (prevEmpty) {
          result.push(`<p>${parseInline(line)}</p>`);
          prevEmpty = false;
        } else {
          result.push(parseInline(line));
        }
    }
  }

  if (inList) result.push('</ul>');
  if (inCode) result.push('</code>');

  preview.innerHTML = result.join('\n');
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