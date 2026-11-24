process.on('message', (msg) => {
  if (!msg || typeof msg !== 'object') {
    return;
  }
  if (msg.type === 'silence') {
    return;
  }
  if (msg.type === 'exit') {
    process.exit(0);
  }
  const delayMs = Number(msg.delayMs ?? 0);
  const send = () => {
    process.send?.({ ...msg, ok: true });
  };
  if (delayMs > 0) {
    setTimeout(send, delayMs);
    return;
  }
  send();
});
