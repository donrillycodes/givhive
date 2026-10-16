// Backport Device Hub support to the SDK 54 CLI until we upgrade Expo.
// Upstream fix: https://github.com/expo/expo/pull/46757
const fs = require('node:fs');
const path = require('node:path');

const expoRoot = path.dirname(require.resolve('expo/package.json'));
const cliRoot = path.dirname(require.resolve('@expo/cli/package.json', { paths: [expoRoot] }));
const version = require(path.join(cliRoot, 'package.json')).version;
if (version !== '54.0.23') {
  console.warn(`Device Hub patch skipped for Expo CLI ${version}; check whether it is still needed.`);
  process.exit(0);
}

const changes = [
  ['start/doctor/apple/SimulatorAppPrerequisite.js', [
    [
      `return (await (0, _osascript().execAsync)('id of app "Simulator"')).trim();`,
      `for (const app of ['Simulator', 'DeviceHub']) {
            try {
                return (await (0, _osascript().execAsync)('id of app "' + app + '"')).trim();
            } catch {}
        }`,
    ],
    [
      `if (result !== 'com.apple.iphonesimulator' && result !== 'com.apple.CoreSimulator.SimulatorTrampoline')`,
      `if (result !== 'com.apple.dt.Devices' && result !== 'com.apple.iphonesimulator' && result !== 'com.apple.CoreSimulator.SimulatorTrampoline')`,
    ],
  ]],
  ['start/platforms/ios/ensureSimulatorAppRunning.js', [
    [
      `count processes whose name is "Simulator"`,
      `count processes whose name is "Simulator" or name is "DeviceHub"`,
    ],
    [
      `await (0, _spawnasync().default)('open', args);`,
      `try {
        await (0, _spawnasync().default)('open', args);
    } catch {
        args[1] = 'DeviceHub';
        await (0, _spawnasync().default)('open', args);
    }`,
    ],
  ]],
  ['start/platforms/ios/AppleDeviceManager.js', [
    [
      'await _osascript().execAsync(`tell application "Simulator" to activate`);',
      'await _osascript().execAsync(`if application "Simulator" is running then\\ntell application "Simulator" to activate\\nelse if application "DeviceHub" is running then\\ntell application "DeviceHub" to activate\\nend if`);',
    ],
  ]],
];

// Validate every replacement before writing so a changed CLI cannot be partially patched.
const files = changes.map(([relative, replacements]) => {
  const file = path.join(cliRoot, 'build/src', relative);
  let source = fs.readFileSync(file, 'utf8');
  for (const [before, after] of replacements) {
    if (source.includes(after)) continue;
    if (!source.includes(before)) throw new Error(`Device Hub patch no longer matches ${relative}`);
    source = source.replace(before, after);
  }
  return [file, source];
});
for (const [file, source] of files) fs.writeFileSync(file, source);
