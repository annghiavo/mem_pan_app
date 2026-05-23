// Metro config — adds a /__devlog endpoint that the app POSTs API call/return
// entries to. Each entry is printed to the terminal running `npx expo start`,
// so you can monitor API traffic without opening a JS debugger.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const COLOR = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
};

function fmtPayload(value) {
  if (value === undefined || value === null || value === '') return '';
  try {
    const json = typeof value === 'string' ? value : JSON.stringify(value);
    return json.length > 4000 ? `${json.slice(0, 4000)}… (truncated)` : json;
  } catch {
    return String(value);
  }
}

function printEntry(entry) {
  const ts = new Date().toISOString().split('T')[1].replace('Z', '');
  const tag = `${COLOR.dim}[${ts}]${COLOR.reset}`;
  if (entry.kind === 'request') {
    const head = `${COLOR.green}${COLOR.bold}→ API${COLOR.reset} ${COLOR.cyan}${entry.method}${COLOR.reset} ${entry.url}`;
    const body = fmtPayload(entry.body);
    console.log(`${tag} ${head}${body ? `\n  ${COLOR.dim}body${COLOR.reset} ${body}` : ''}`);
  } else if (entry.kind === 'response') {
    const ok = entry.status >= 200 && entry.status < 400;
    const arrow = ok
      ? `${COLOR.cyan}${COLOR.bold}← API${COLOR.reset}`
      : `${COLOR.red}${COLOR.bold}✗ API${COLOR.reset}`;
    const statusColor = ok ? COLOR.green : COLOR.red;
    const head = `${arrow} ${statusColor}${entry.status}${COLOR.reset} ${COLOR.cyan}${entry.method}${COLOR.reset} ${entry.url}${entry.durationMs != null ? ` ${COLOR.dim}(${entry.durationMs}ms)${COLOR.reset}` : ''}`;
    const data = fmtPayload(entry.data);
    console.log(`${tag} ${head}${data ? `\n  ${COLOR.dim}data${COLOR.reset} ${data}` : ''}`);
  } else if (entry.kind === 'error') {
    // App-level error (devlog.error) OR network/fetch error from services/api.ts
    const label = entry.url
      ? `${COLOR.cyan}${entry.method || '?'}${COLOR.reset} ${entry.url}`
      : '';
    const detail = entry.error
      ? `${entry.error.name || 'Error'}: ${entry.error.message}`
      : entry.message;
    console.log(
      `${tag} ${COLOR.red}${COLOR.bold}✗ ERROR${COLOR.reset} ${entry.message || ''}${label ? ` ${label}` : ''}\n  ${COLOR.dim}detail${COLOR.reset} ${detail}`
    );
    if (entry.error?.stack) {
      console.log(`  ${COLOR.dim}stack${COLOR.reset}\n${String(entry.error.stack).split('\n').map((l) => `    ${l}`).join('\n')}`);
    }
    if (entry.data !== undefined) {
      const d = fmtPayload(entry.data);
      if (d) console.log(`  ${COLOR.dim}data${COLOR.reset} ${d}`);
    }
  } else if (entry.kind === 'event') {
    const data = fmtPayload(entry.data);
    console.log(`${tag} ${COLOR.yellow}${COLOR.bold}● EVENT${COLOR.reset} ${entry.name}${data ? `\n  ${COLOR.dim}data${COLOR.reset} ${data}` : ''}`);
  } else if (entry.kind === 'warn') {
    const data = fmtPayload(entry.data);
    console.log(`${tag} ${COLOR.yellow}${COLOR.bold}! WARN${COLOR.reset} ${entry.message}${data ? `\n  ${COLOR.dim}data${COLOR.reset} ${data}` : ''}`);
  } else if (entry.kind === 'info') {
    const data = fmtPayload(entry.data);
    console.log(`${tag} ${COLOR.magenta}ⓘ INFO${COLOR.reset} ${entry.message}${data ? `\n  ${COLOR.dim}data${COLOR.reset} ${data}` : ''}`);
  } else {
    console.log(`${tag} ${COLOR.magenta}[devlog]${COLOR.reset} ${fmtPayload(entry)}`);
  }
}

const devlogMiddleware = (req, res, next) => {
  if (req.url !== '/__devlog' || req.method !== 'POST') return next();
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
    if (raw.length > 1_000_000) {
      // Guard against runaway payloads
      req.destroy();
    }
  });
  req.on('end', () => {
    try {
      const entry = JSON.parse(raw);
      if (Array.isArray(entry)) entry.forEach(printEntry);
      else printEntry(entry);
    } catch (err) {
      console.log(`${COLOR.red}[devlog parse error]${COLOR.reset} ${err.message} :: ${raw.slice(0, 200)}`);
    }
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end();
  });
  req.on('error', () => {
    res.statusCode = 400;
    res.end();
  });
};

const originalEnhance = config.server && config.server.enhanceMiddleware;
config.server = {
  ...(config.server || {}),
  enhanceMiddleware: (middleware, server) => {
    const next = originalEnhance ? originalEnhance(middleware, server) : middleware;
    return (req, res, fallthrough) => {
      if (req.url === '/__devlog' && req.method === 'POST') {
        return devlogMiddleware(req, res, fallthrough);
      }
      // CORS preflight for the devlog endpoint (web target)
      if (req.url === '/__devlog' && req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.statusCode = 204;
        return res.end();
      }
      return next(req, res, fallthrough);
    };
  },
};

console.log('\x1b[35m[devlog]\x1b[0m POST /__devlog endpoint ready — API calls will appear here.');

module.exports = config;
