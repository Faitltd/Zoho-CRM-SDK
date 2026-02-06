import http from 'node:http';

export interface MockServer {
  baseUrl: string;
  close: () => Promise<void>;
}

export async function startMockServer(): Promise<MockServer> {
  const server = http.createServer((req, res) => {
    const url = req.url ?? '/';

    if (url.includes('/crm/v2/Leads')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: [{ id: '1', lastName: 'Bench', company: 'Acme' }] }));
      return;
    }

    if (url.includes('/crm/bulk/v8/read')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: [{ id: 'job-1', state: 'COMPLETED', result: { more_records: false } }] }));
      return;
    }

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const baseUrl = `http://localhost:${port}`;

  return {
    baseUrl,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      })
  };
}
