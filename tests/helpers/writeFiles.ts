import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join, dirname } from 'path';

// The upstream test-support package is not published with the polyfill plugin.
export async function writeFiles(files: Record<string, string>) {
  const directory = await mkdtemp(join(tmpdir(), 'safedose-polyfill-'));
  const paths = await Promise.all(Object.entries(files).map(async ([name, contents]) => {
    const path = join(directory, name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents);
    return path;
  }));
  return { paths, unlink: () => rm(directory, { recursive: true, force: true }) };
}
