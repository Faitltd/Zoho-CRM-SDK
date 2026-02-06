import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { request as undiciRequest } from 'undici';

const target = process.env.CHAOS_TARGET ?? 'https://www.zohoapis.com';
const port = Number(process.env.CHAOS_PORT ?? '5001');

const failureRate = Number(process.env.CHAOS_FAILURE_RATE ?? '0.1');
const timeoutRate = Number(process.env.CHAOS_TIMEOUT_RATE ?? '0.05');
const corruptRate = Number(process.env.CHAOS_CORRUPT_RATE ?? '0.05');
const minDelayMs = Number(process.env.CHAOS_MIN_DELAY_MS ?? '0');
const maxDelayMs = Number(process.env.CHAOS_MAX_DELAY_MS ?? '300');

const server = http.createServer(async (req, res) => {
  const shouldFail = Math.random() < failureRate;
  const shouldTimeout = Math.random() < timeoutRate;
  const shouldCorrupt = Math.random() < corruptRate;

  if (shouldTimeout) {
    // Drop the connection.
    req.socket.destroy();
    return;
  }

  if (shouldFail) {
    res.writeHead(503, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ code: 'CHAOS_FAIL', message: 'Injected failure', status: 'error' }));
    return;
  }

  const delay = randomBetween(minDelayMs, maxDelayMs);
  await sleep(delay);

  const url = new URL(req.url ?? '/', target);

  try {
    const upstream = await undiciRequest(url.toString(), {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: req
    });

    const body = await upstream.body.text();
    res.statusCode = upstream.statusCode;
    for (const [key, value] of Object.entries(upstream.headers)) {
      if (value) {
        res.setHeader(key, value as string);
      }
    }

    if (shouldCorrupt) {
      res.end(body.slice(0, Math.max(0, body.length - 5)));
      return;
    }

    res.end(body);
  } catch (error) {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ code: 'CHAOS_PROXY_ERROR', message: String(error), status: 'error' }));
  }
});

server.listen(port, () => {
  console.log(`Chaos proxy running on http://localhost:${port} -> ${target}`);
});

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
