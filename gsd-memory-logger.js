// Wrapper fuer gsd mit Memory-Logging
const { execSync, spawn } = require('child_process');

const gsdPath = execSync('which gsd').toString().trim();

console.log(`[gsd-logger] Starte gsd: ${gsdPath}`);
console.log(`[gsd-logger] Startzeit: ${new Date().toISOString()}`);

const gsd = spawn('node', ['--max-old-space-size=8192', gsdPath], {
  stdio: 'inherit',
  env: process.env
});

console.log(`[gsd-logger] PID: ${gsd.pid}`);

const logMemory = () => {
  if (!gsd.pid) {
    return;
  }

  try {
    const output = execSync(`ps -o rss=,vsz= -p ${gsd.pid}`, {
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .toString()
      .trim();

    if (!output) {
      return;
    }

    const [rssKB, vszKB] = output.split(/\s+/);
    const rssMB = (Number(rssKB) / 1024).toFixed(2);
    const vszMB = (Number(vszKB) / 1024).toFixed(2);

    console.log(
      `[Memory] PID: ${gsd.pid} | RSS: ${rssMB} MB | VSZ: ${vszMB} MB | ${new Date().toISOString()}`
    );
  } catch {
    // Prozess ist bereits beendet.
  }
};

const interval = setInterval(logMemory, 10000);
interval.unref?.();

const forwardSignal = (signal) => {
  if (gsd.pid && gsd.exitCode === null && !gsd.killed) {
    gsd.kill(signal);
  }
};

process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

gsd.on('error', (error) => {
  clearInterval(interval);
  console.error('[gsd-logger] Fehler beim Starten von gsd:', error);
  process.exit(1);
});

gsd.on('exit', (code, signal) => {
  clearInterval(interval);
  console.log(`[gsd-logger] gsd exited with code ${code}, signal ${signal}`);

  if (signal) {
    process.exit(1);
    return;
  }

  process.exit(code ?? 0);
});
