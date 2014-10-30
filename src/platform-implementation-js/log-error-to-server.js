function logErrorToServer(nowStack, name, err, details) {
  console.error.apply(console, ["TODO log this to server:"].concat(arguments));
}

module.exports = logErrorToServer;
