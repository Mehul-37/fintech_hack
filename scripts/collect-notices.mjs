import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('node_modules');
const rows = [];
const dirs = await readdir(root, { withFileTypes: true });
for (const item of dirs) {
  if (!item.isDirectory() || item.name.startsWith('.')) continue;
  if (item.name.startsWith('@')) {
    for (const child of await readdir(path.join(root, item.name), { withFileTypes: true })) {
      if (child.isDirectory()) await inspect(path.join(root, item.name, child.name));
    }
  } else await inspect(path.join(root, item.name));
}
async function inspect(dir) {
  try {
    const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
    const files = (await readdir(dir)).filter((name) =>
      /^(license|licence|copying|ofl|notice)(\.|$|-)/i.test(name),
    );
    const notices = [];
    for (const file of files) {
      notices.push(
        `### ${file}\n\n\`\`\`text\n${(await readFile(path.join(dir, file), 'utf8')).trim()}\n\`\`\``,
      );
    }
    if (notices.length)
      rows.push({ name: pkg.name, version: pkg.version, license: pkg.license, notices });
  } catch {}
}
rows.sort((a, b) => a.name.localeCompare(b.name));
await writeFile(
  'THIRD_PARTY_NOTICES.md',
  `# Third-party notices\n\nGenerated from installed package license / notice files. Includes direct and transitive runtime dependencies and development tools. Proprietary reference screenshots are research only and are not embedded in Meridian. No vendor screenshot or paid component source has been copied.\n\n${rows.map((p) => `## ${p.name} ${p.version}\n\nDeclared license: ${typeof p.license === 'string' ? p.license : JSON.stringify(p.license)}\n\n${p.notices.join('\n\n')}`).join('\n\n')}\n`,
);
console.log(`Saved notices for ${rows.length} installed packages.`);
