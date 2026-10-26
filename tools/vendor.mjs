import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const vendorDirectory = path.join(root, 'assets', 'vendor');
const manifestPath = path.join(vendorDirectory, 'manifest.json');
const packages = [
  {
    name: 'Inter', version: '4.1', license: 'OFL-1.1',
    repository: 'https://github.com/rsms/inter',
    revision: 'e3a3d4c57d5ecc01453a575621882a384c1995a3',
  },
  {
    name: 'modern-normalize', version: '3.0.1', license: 'MIT',
    repository: 'https://github.com/sindresorhus/modern-normalize',
    revision: '3faa07fc91b8ffbe6243bc4f91e880a00185d0a2',
  },
  {
    name: 'Tabler Icons', version: '3.49.0', license: 'MIT',
    repository: 'https://github.com/tabler/tabler-icons',
    revision: 'bbed884d15354b5cebf2493371f20dc2d5e83eaf',
  },
];

const rawUrl = (packageIndex, sourcePath) => {
  const item = packages[packageIndex];
  return `${item.repository.replace('https://github.com/', 'https://raw.githubusercontent.com/')}/${item.revision}/${sourcePath}`;
};

const iconNames = ['mail', 'building-bank', 'brand-github', 'arrow-up-right', 'chevron-down', 'arrow-up'];
const sources = [
  { key: 'font', packageIndex: 0, url: rawUrl(0, 'docs/font-files/InterVariable.woff2'), output: 'inter/InterVariable.woff2' },
  { key: 'font-license', packageIndex: 0, url: rawUrl(0, 'LICENSE.txt'), output: 'inter/LICENSE.txt' },
  { key: 'normalize', packageIndex: 1, url: rawUrl(1, 'modern-normalize.css'), output: 'modern-normalize/modern-normalize.css' },
  { key: 'normalize-license', packageIndex: 1, url: rawUrl(1, 'license'), output: 'modern-normalize/LICENSE.txt' },
  { key: 'icons-license', packageIndex: 2, url: rawUrl(2, 'LICENSE'), output: 'tabler/LICENSE.txt' },
  ...iconNames.map(name => ({ key: `icon-${name}`, packageIndex: 2, url: rawUrl(2, `icons/outline/${name}.svg`) })),
];

const outputNames = [...sources.filter(source => source.output).map(source => source.output), 'tabler/icons.svg'].sort();
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

function inspectCss(content) {
  assert(!/@import\b|url\s*\(|<script\b|javascript:|expression\s*\(/i.test(content), 'Unexpected executable content or external reference in CSS');
}

function iconSymbol(name, source) {
  const match = source.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/);
  assert(match, `Missing SVG root for ${name}`);
  const viewBox = match[1].match(/\bviewBox="([^"]+)"/);
  assert(viewBox && viewBox[1] === '0 0 24 24', `Unexpected viewBox for ${name}`);
  const artwork = match[2].trim();
  assert(!/\son[a-z]+\s*=|\bhref\s*=|url\s*\(|javascript:|https?:/i.test(artwork), `Unexpected active or external SVG content in ${name}`);
  const allowedTags = new Set(['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g']);
  for (const tag of artwork.matchAll(/<\/?([a-z][\w:-]*)\b/gi)) {
    assert(allowedTags.has(tag[1]), `Unexpected SVG element ${tag[1]} in ${name}`);
  }
  return `  <symbol id="${name}" viewBox="${viewBox[1]}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n    ${artwork}\n  </symbol>`;
}

function inspectSprite(content) {
  assert(!/<(?:script|foreignObject|image|use|style)\b|\son[a-z]+\s*=|\bhref\s*=|javascript:|url\s*\(/i.test(content), 'Unexpected active content or external reference in SVG sprite');
  assert.deepEqual([...content.matchAll(/<symbol\b[^>]*\bid="([^"]+)"/g)].map(match => match[1]), iconNames, 'Unexpected sprite symbols');
}

async function download(source) {
  const response = await fetch(source.url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
  assert(response.ok, `Download failed (${response.status}): ${source.url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert(bytes.length > 0 && bytes.length < 1024 * 1024, `Unexpected asset size: ${source.key}`);
  return { ...source, bytes, sha256: sha256(bytes) };
}

async function updateAssets() {
  const results = await Promise.allSettled(sources.map(download));
  const failures = results.filter(result => result.status === 'rejected');
  assert.equal(failures.length, 0, failures.map(result => result.reason.message).join('\n'));
  const downloaded = results.map(result => result.value);
  const byKey = new Map(downloaded.map(source => [source.key, source]));
  assert.equal(byKey.get('font').bytes.toString('ascii', 0, 4), 'wOF2', 'Invalid WOFF2 font header');
  inspectCss(byKey.get('normalize').bytes.toString('utf8'));
  assert(byKey.get('font-license').bytes.toString('utf8').includes('SIL OPEN FONT LICENSE Version 1.1'), 'Missing font license');
  for (const key of ['normalize-license', 'icons-license']) {
    assert(byKey.get(key).bytes.toString('utf8').includes('MIT License'), `Missing MIT license: ${key}`);
  }
  const sprite = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg">\n${iconNames.map(name => iconSymbol(name, byKey.get(`icon-${name}`).bytes.toString('utf8'))).join('\n')}\n</svg>\n`, 'utf8');
  inspectSprite(sprite.toString('utf8'));

  const files = downloaded.filter(source => source.output).map(source => ({
    path: source.output,
    package: packages[source.packageIndex].name,
    bytes: source.bytes.length,
    sha256: source.sha256,
    sources: [{ url: source.url, sha256: source.sha256 }],
  }));
  files.push({
    path: 'tabler/icons.svg', package: 'Tabler Icons', bytes: sprite.length, sha256: sha256(sprite),
    sources: iconNames.map(name => {
      const source = byKey.get(`icon-${name}`);
      return { url: source.url, sha256: source.sha256 };
    }),
  });
  files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  const manifest = { schemaVersion: 1, packages, files };

  // Only the fixed output paths above are written. Upstream code is never executed.
  for (const source of downloaded.filter(source => source.output)) {
    const output = path.join(vendorDirectory, source.output);
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, source.bytes);
  }
  await mkdir(path.join(vendorDirectory, 'tabler'), { recursive: true });
  await writeFile(path.join(vendorDirectory, 'tabler', 'icons.svg'), sprite);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await checkAssets();
}

async function listFiles(directory, prefix = '') {
  const files = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    assert(!item.isSymbolicLink(), `Unexpected symbolic link: ${item.name}`);
    const relative = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) files.push(...await listFiles(path.join(directory, item.name), relative));
    else files.push(relative);
  }
  return files.sort();
}

async function checkAssets() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.equal(manifest.schemaVersion, 1, 'Unsupported manifest');
  assert.deepEqual(manifest.packages, packages, 'Manifest package versions or source revisions differ from the pinned script');
  assert.deepEqual(manifest.files.map(file => file.path).sort(), outputNames, 'Manifest contains unexpected output paths');
  assert.deepEqual(await listFiles(vendorDirectory), [...outputNames, 'manifest.json', '.gitattributes'].sort(), 'Unexpected files in vendor directory');
  assert.equal(await readFile(path.join(vendorDirectory, '.gitattributes'), 'utf8'), '* -text\n', 'Vendored byte-preservation rule differs');
  for (const file of manifest.files) {
    const bytes = await readFile(path.join(vendorDirectory, file.path));
    assert.equal(bytes.length, file.bytes, `Size mismatch: ${file.path}`);
    assert.equal(sha256(bytes), file.sha256, `SHA-256 mismatch: ${file.path}`);
    assert(file.sources.every(source => sources.some(expected => expected.url === source.url) && /^[a-f0-9]{64}$/.test(source.sha256)), `Unexpected source metadata: ${file.path}`);
  }
  const font = await readFile(path.join(vendorDirectory, 'inter', 'InterVariable.woff2'));
  assert.equal(font.toString('ascii', 0, 4), 'wOF2', 'Invalid local font');
  inspectCss(await readFile(path.join(vendorDirectory, 'modern-normalize', 'modern-normalize.css'), 'utf8'));
  inspectSprite(await readFile(path.join(vendorDirectory, 'tabler', 'icons.svg'), 'utf8'));
  console.log(JSON.stringify({ status: 'passed', mode: process.argv.includes('--check') ? 'local-check' : 'download-and-check', files: manifest.files.length, icons: iconNames.length, bytes: manifest.files.reduce((sum, file) => sum + file.bytes, 0) }, null, 2));
}

const argumentsList = process.argv.slice(2);
assert(argumentsList.length === 0 || (argumentsList.length === 1 && argumentsList[0] === '--check'), 'Usage: node tools/vendor.mjs [--check]');
if (argumentsList.includes('--check')) await checkAssets();
else await updateAssets();
