// jest.setup.js — runs before every test file

// Silence noisy warnings that clutter test output
jest.spyOn(console, 'warn').mockImplementation((...args) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('SafeAreaView has been deprecated')) return;
  console.log('[warn]', ...args);
});
