const { packages } = require('../../package-lock.json');

// Keep known critical fixes when npm re-resolves the lockfile.
const patchedVersions = [
  ['form-data', [[4, 0, 6], [3, 0, 5], [2, 5, 6]]],
  ['handlebars', [[4, 7, 10]]],
  ['proxy-addr', [[2, 0, 8]]],
  ['shell-quote', [[1, 8, 5]]],
  ['vm2', [[3, 12, 2]]],
  ['websocket-driver', [[0, 7, 5]]],
];

test.each(patchedVersions)('%s uses patched versions throughout the lockfile', (name, minimums) => {
  const outdated = Object.entries(packages)
    .filter(([path]) => path.endsWith(`/node_modules/${name}`) || path === `node_modules/${name}`)
    .filter(([, { version }]) => {
      if (!/^\d+\.\d+\.\d+$/.test(version)) {
        return true;
      }

      const parts = version.split('.').map(Number);
      const minimum = minimums.find(([major]) => parts[0] >= major) ?? minimums.at(-1);
      const difference = parts.findIndex((part, index) => part !== minimum[index]);
      return difference >= 0 && parts[difference] < minimum[difference];
    })
    .map(([path, { version }]) => `${path}@${version}`);

  expect(outdated).toEqual([]);
});
