const http = require('http');
const { spawn } = require('child_process');

const port = Number(process.env.SMOKE_PORT || process.env.PORT || 3100);
const healthUrl = `http://127.0.0.1:${port}/api/health`;

const server = spawn(process.execPath, ['server.js'], {
  env: {
    ...process.env,
    PORT: String(port),
    MOCK_LINKEDIN_PUBLISH: 'true',
    NODE_ENV: 'test',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverOutput = '';
server.stdout.on('data', (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on('data', (chunk) => {
  serverOutput += chunk.toString();
});

function requestHealth() {
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

async function waitForHealth() {
  const deadline = Date.now() + 10000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      return await requestHealth();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw lastError || new Error('Server did not become healthy before timeout.');
}

async function main() {
  try {
    const health = await waitForHealth();
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

server.on('error', (error) => {
  console.error('Failed to start server process.');
  console.error(error.message);
  process.exitCode = 1;
});

main();
