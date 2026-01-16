window.journaler.loadPassword()

const initEvent = new CustomEvent("journaler-ready");
window.dispatchEvent(initEvent);