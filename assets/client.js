function feedUrl(path) {
  const pattern = new URLPattern({ pathname: "/:feed/*" });
  const { feed } = pattern.exec(window.location).pathname.groups
  return `/${feed}/${path}`
}

const initEvent = new CustomEvent("journaler-ready");
window.dispatchEvent(initEvent);
