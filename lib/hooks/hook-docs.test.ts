import fs from 'fs';
import path from 'path';

const hookDirectory = __dirname;

it('documents every hook exported from lib/hooks', () => {
  const hookFiles = fs.readdirSync(hookDirectory)
    .filter(file => /^use.*\.ts$/.test(file) && !file.endsWith('.test.ts'));

  for (const file of hookFiles) {
    const source = fs.readFileSync(path.join(hookDirectory, file), 'utf8');
    const exportedHook = /export (?:default )?function (use\w+)/g;

    for (const match of source.matchAll(exportedHook)) {
      const precedingSource = source.slice(0, match.index).trimEnd();
      expect(precedingSource).toMatch(/\/\*\*[\s\S]*?\*\/$/);
    }
  }
});
