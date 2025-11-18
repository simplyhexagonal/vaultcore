import { readFileSync, writeFileSync } from 'node:fs';


import { default as packageJson } from '../package.json' with { type: 'json' };

const { name, version } = packageJson;

const slimPackage = {
  name,
  version,
};

writeFileSync('./dist/package.json', JSON.stringify(slimPackage, null, 2));

const originalBinary = readFileSync('./dist/vaultcore.js', 'utf8');
writeFileSync('./dist/vaultcore.js', `#!/usr/bin/env node\n\n${originalBinary}`);
