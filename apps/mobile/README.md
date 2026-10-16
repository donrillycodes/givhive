# Mobile development

This app uses Expo SDK 57.0.30, React 19.2.3 and React Native 0.86.3.
Use the committed lockfile to keep Expo Go and the native libraries aligned.

## Run locally

From this directory, with nvm installed:

```sh
nvm install
nvm use
npm ci
npm start
```

The `.nvmrc` selects Node 22; Node 22.13 or newer is required. Node 22.23.3
was used for validation. Keep the ignored `.env` file configured with the
existing API URL and Firebase public client settings. Never commit it.

Scan this server's QR code using SDK 57 Expo Go on a phone on the same network.
The main project uses port 8081 by default. If the isolated upgrade worktree
is also running, it uses port 8082 (`npm start -- --port 8082`). Both copies
now use SDK 57. The separate test simulator is named **GivHive SDK 57**.
Select it with Shift+i in Expo or open it through Device Hub.

## Upgrade notes

Dependencies were aligned against each SDK's official compatibility manifest
while stepping through SDK 55, 56 and 57. No forced peer dependency bypasses
were used.

- Navigation imports use the SDK 56+ Expo Router entry points.
- React Native's removed `StyleSheet.absoluteFillObject` uses `absoluteFill`.
- `expo-constants` is a direct native dependency required by Expo Router.
- The SDK 54 CLI patch is removed: the current CLI supports Xcode Device Hub.
- `newArchEnabled` is removed because the new architecture is mandatory.
- `expo-build-properties` enables iOS scene support for Xcode 27 builds.

## Validation

```sh
npx expo install --check
npx tsc --noEmit
npx expo-doctor@latest
npx expo prebuild --platform ios --no-install
npx expo export --platform ios --platform android
```

The dependency check, TypeScript check, all 21 Expo Doctor checks, iOS native
project generation, and both production JavaScript exports passed during the
upgrade. SDK 57 Expo Go startup, onboarding, registration-screen navigation,
and sign-in-screen navigation also passed in the dedicated iOS 27 simulator.
Native project generation is not an Xcode archive or TestFlight build.
The owner also verified sign-in on a physical iPhone 14 before approving the
merge into main. Full donor workflows and a native release build still require
verification before release.

`npm audit` reported 34 advisories (23 high, 11 moderate, zero critical) on
2026-10-15. Several are inherited from Expo/React Native build tooling; Firebase
Firestore dependencies are also flagged. This is not a completed security audit.
Do not run `npm audit fix --force`: its proposed changes include incompatible
SDK downgrades. Review advisory reachability and compatible fixes before release.

References: [SDK upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/),
[SDK 57](https://expo.dev/changelog/sdk-57),
[Router migration](https://docs.expo.dev/router/migrate/sdk-55-to-56/), and
[Xcode 27 scene support](https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md).
