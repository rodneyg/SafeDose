const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const tar = require("tar");
const cacache = require("cacache");

async function main() {
  const tarVersion = require("tar/package.json").version;
  assert.ok(tarVersion.localeCompare("7.5.21", undefined, { numeric: true }) >= 0, `unexpected tar ${tarVersion}`);
  assert.doesNotThrow(() => require.resolve("@expo/cli"));
  assert.equal(typeof cacache.put, "function");
  assert.equal(typeof cacache.get, "function");

  const root = await fs.mkdtemp(path.join(os.tmpdir(), "safedose-tar-"));
  const source = path.join(root, "source");
  const extracted = path.join(root, "extracted");
  await fs.mkdir(source);
  await fs.mkdir(extracted);
  await fs.writeFile(path.join(source, "fixture.txt"), "SafeDose archive compatibility");
  await tar.create({ file: path.join(root, "fixture.tgz"), cwd: source }, ["fixture.txt"]);
  await tar.extract({ file: path.join(root, "fixture.tgz"), cwd: extracted });
  assert.equal(await fs.readFile(path.join(extracted, "fixture.txt"), "utf8"), "SafeDose archive compatibility");

  const cache = path.join(root, "cache");
  await cacache.put(cache, "fixture", "SafeDose cache compatibility");
  assert.equal((await cacache.get(cache, "fixture")).data.toString(), "SafeDose cache compatibility");

  const cli = spawnSync(process.execPath, [require.resolve("@expo/cli"), "--version"], { encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr || cli.stdout);
  console.log(`PASS tar ${tarVersion} archive roundtrip, cacache roundtrip, @expo/cli load (${cli.stdout.trim()})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
