self.onmessage = (event) => {
  const { type, payload } = event.data;
  if (type === 'batch-distance') {
    const total = (payload?.moves || []).reduce((s, m) => s + Number(m.distance || 0), 0);
    self.postMessage({ type, total });
  }
};
