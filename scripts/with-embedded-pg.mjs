import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

function isPortOpen(host, portToCheck) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port: portToCheck });
    socket.setTimeout(800);
    socket.on('connect', () => {
      socket.end();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => resolve(false));
  });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.EMBEDDED_PG_PORT || 55432);
const user = 'postgres';
const password = 'postgres';
const database = 'posco_steeleon';
const localBase = process.env.LOCALAPPDATA || process.env.HOME || os.tmpdir();
const binDir = process.env.EMBEDDED_PG_BIN || path.join(localBase, 'posco-steeleon-pgbin');
const dataDir = process.env.EMBEDDED_PG_DIR || path.join(localBase, 'posco-steeleon-pgdata');

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `postgresql://${user}:${password}@127.0.0.1:${port}/${database}`;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function exe(name) {
  return process.platform === 'win32' ? `${name}.exe` : name;
}

const nativeSrc = path.join(
  root,
  'node_modules',
  '@embedded-postgres',
  process.platform === 'win32' ? 'windows-x64' : `${process.platform}-${process.arch}`,
  'native'
);

if (!fs.existsSync(path.join(binDir, 'bin', exe('postgres')))) {
  if (!fs.existsSync(nativeSrc)) {
    console.error('PostgreSQL 바이너리를 찾을 수 없습니다. npm install 후 다시 시도하세요.');
    process.exit(1);
  }
  console.log('Copying PostgreSQL binaries to ASCII path...');
  copyDir(nativeSrc, binDir);
}

const binPath = path.join(binDir, 'bin');
const env = {
  ...process.env,
  PATH: `${binPath}${path.delimiter}${process.env.PATH || ''}`,
  PGPASSWORD: password,
};

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    env,
    encoding: 'utf8',
    windowsHide: true,
    ...opts,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result;
}

if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
  const pwFile = path.join(os.tmpdir(), `pg-password-${process.pid}.txt`);
  fs.writeFileSync(pwFile, `${password}\n`);
  const init = run(path.join(binPath, exe('initdb')), [
    `--pgdata=${dataDir}`,
    '--auth=password',
    `--username=${user}`,
    `--pwfile=${pwFile}`,
    '--encoding=UTF8',
    '--no-locale',
  ]);
  fs.unlinkSync(pwFile);
  if (init.status !== 0) {
    console.error('initdb failed');
    process.exit(1);
  }
}

const pgCtl = path.join(binPath, exe('pg_ctl'));
const logFile = path.join(dataDir, 'postgres.log');
if (!(await isPortOpen('127.0.0.1', port))) {
  const start = run(pgCtl, ['-D', dataDir, '-l', logFile, '-o', `-p ${port} -h 127.0.0.1`, 'start']);
  if (start.status !== 0 && !(await isPortOpen('127.0.0.1', port))) {
    console.error('pg_ctl start failed');
    if (fs.existsSync(logFile)) {
      try {
        console.error(fs.readFileSync(logFile, 'utf8').slice(-2000));
      } catch {
        // log locked by running server
      }
    }
    process.exit(1);
  }
}

const { default: pg } = await import('pg');
const admin = new pg.Client({
  host: '127.0.0.1',
  port,
  user,
  password,
  database: 'postgres',
});
let connected = false;
for (let i = 0; i < 25; i += 1) {
  try {
    await admin.connect();
    connected = true;
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 400));
  }
}
if (!connected) {
  console.error('PostgreSQL did not become ready');
  process.exit(1);
}
const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
if (!exists.rowCount) {
  await admin.query(`CREATE DATABASE ${database}`);
}
await admin.end();

const child = spawn('npm', ['run', 'dev'], {
  cwd: root,
  env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL, PATH: env.PATH },
  stdio: 'inherit',
  shell: true,
});

async function shutdown() {
  spawnSync(pgCtl, ['-D', dataDir, 'stop', '-m', 'fast'], { env, windowsHide: true });
}

process.on('SIGINT', async () => {
  child.kill('SIGINT');
  await shutdown();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  child.kill('SIGTERM');
  await shutdown();
  process.exit(0);
});
child.on('exit', async (code) => {
  await shutdown();
  process.exit(code ?? 0);
});
