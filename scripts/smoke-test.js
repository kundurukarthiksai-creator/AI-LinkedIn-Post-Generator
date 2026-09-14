const http = require('http');
const net = require('net');
const { spawn } = require('child_process');

function reservePort() {
  const requestedPort = process.env.SMOKE_PORT || process.env.PORT;
  if (requestedPort) {
    return Promise.resolve(Number(requestedPort));
  }

  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function requestHealth(healthUrl) {
  return new Promise((resolve, reject) => {
    const req = http.get(healthUrl, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Expected 200 from /api/health, got ${res.statusCode}: ${body}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`Health response was not valid JSON: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(1000, () => {
      req.destroy(new Error('Health request timed out.'));
    });
  });
}

async function waitForHealth(healthUrl) {
  const deadline = Date.now() + 10000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      return await requestHealth(healthUrl);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw lastError || new Error('Server did not become healthy before timeout.');
}

async function main() {
  const port = await reservePort();
  const healthUrl = `http://127.0.0.1:${port}/api/health`;
  let serverOutput = '';

  const server = spawn(process.execPath, ['server.js'], {
    env: {
      ...process.env,
      PORT: String(port),
      MOCK_LINKEDIN_PUBLISH: 'true',
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  server.stdout.on('data', (chunk) => {
    serverOutput += chunk.toString();
  });
  server.stderr.on('data', (chunk) => {
    serverOutput += chunk.toString();
  });

  server.on('error', (error) => {
    console.error('Failed to start server process.');
    console.error(error.message);
    process.exitCode = 1;
  });

  try {
    const health = await waitForHealth(healthUrl);
    if (!health.success) {
      throw new Error(`Health payload did not report success: ${JSON.stringify(health)}`);
    }
    console.log(`Smoke test passed: ${healthUrl}`);
  } catch (error) {
    console.error('Smoke test failed.');
    console.error(error.message);
    if (serverOutput.trim()) {
      console.error('\nServer output:');
      console.error(serverOutput.trim());
    }
    process.exitCode = 1;
  } finally {
    server.kill();
  }
}

main().catch((error) => {
  console.error('Smoke test crashed.');
  console.error(error.message);
  process.exitCode = 1;
});
