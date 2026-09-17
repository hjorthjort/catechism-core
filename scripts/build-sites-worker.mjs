import { cp, mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const output = 'dist';
const client = join(output, 'client');
const server = join(output, 'server');

await rm(client, { force: true, recursive: true });
await rm(server, { force: true, recursive: true });
await mkdir(client, { recursive: true });

for (const entry of await readdir(output)) {
  if (entry !== 'client' && entry !== 'server' && entry !== '.openai') {
    await rename(join(output, entry), join(client, entry));
  }
}

await mkdir(server, { recursive: true });
await writeFile(join(server, 'index.js'), `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== 'GET') return response;
    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
  }
};\n`);

await mkdir(join(output, '.openai'), { recursive: true });
await cp('.openai/hosting.json', join(output, '.openai', 'hosting.json'));
