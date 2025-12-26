window.journaler = {
  encrypt(message) {
    return message;
  },
  decrypt(message) {
    return message;
  },
  password() {
    const localPassword = window.localStorage.getItem("password");

    if (localPassword) return localPassword;

    const promptPassword = window.prompt("Password:");
    window.localStorage.setItem("password", promptPassword);

    return promptPassword;
  },
};

const initEvent = new CustomEvent("journaler-ready");
window.dispatchEvent(initEvent);
