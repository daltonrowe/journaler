window.journaler = {};
const localPassword = window.localStorage.getItem("password");

if (localPassword) {
  window.journaler.password = localPassword;
} else {
  const promptPassword = window.prompt('Password:')
  window.localStorage.setItem('password', promptPassword);
  window.journaler.password = localPassword;
}

function encrypt(message) {
  return message
}

function decrypt(message) {
  return message
}