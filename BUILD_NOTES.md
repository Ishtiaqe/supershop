# Build Issues and Fixes

## Deprecation Warnings and Errors from CI Log

### npm ci Failure
- **Issue**: `npm ci` failed because `package-lock.json` is out of sync with `package.json` (missing `@capacitor/ios@7.4.4`).
- **Fix**: Run `npm install` locally to update `package-lock.json`, then commit the changes. This ensures lock file matches dependencies.

### Deprecation Warnings (npm install)
- **inflight@1.0.6**: Deprecated, use `lru-cache` instead.
- **rimraf@3.0.2** and **rimraf@2.7.1**: Versions prior to v4 not supported. Update to `rimraf@^4.0.0`.
- **glob@7.2.3**: Versions prior to v9 not supported. Update to `glob@^9.0.0`.
- **sourcemap-codec@1.4.8**: Use `@jridgewell/sourcemap-codec` instead.
- **rollup-plugin-terser@7.0.2**: Deprecated, use `@rollup/plugin-terser`.
- **workbox-cacheable-response@6.6.0** and **workbox-google-analytics@6.6.0**: Deprecated. Update to latest workbox versions or remove if not needed.
- **@humanwhocodes/object-schema@2.0.3**: Use `@eslint/object-schema`.
- **@humanwhocodes/config-array@0.13.0**: Use `@eslint/config-array`.
- **source-map@0.8.0-beta.0**: Beta features not in future versions. Update to stable `source-map@^0.7.0` or later.
- **eslint@8.57.1**: No longer supported. Update to `eslint@^9.0.0` or latest v8 if needed.

### Vulnerabilities
- **3 high severity vulnerabilities**: Ran `npm audit fix`, but 1 remains (glob CLI injection in @next/eslint-plugin-next). Manually update `glob` to ^11.0.0 or wait for Next.js to patch. Run `npm audit` for details.

### Gradle Warnings
- **Using flatDir should be avoided**: This is from Capacitor/Cordova plugins. Consider migrating to proper Maven/Gradle repositories if possible, but it's often not critical for Capacitor projects.

### Java Compilation Notes
- **Unchecked or unsafe operations**: Enable `-Xlint:unchecked` for details, but not blocking.

### Problems Report
- Gradle generated a problems report at `android/build/reports/problems/problems-report.html`. Review for any actionable issues.

## How to Build APK Locally (Instead of Ionic Appflow)

Ionic Appflow (ionicframework.com) is a cloud-based CI/CD platform for building, testing, and deploying mobile apps (especially Ionic/Capacitor). It provides automated builds, cloud runners, and integrations for app stores, useful for teams without local macOS/Windows setups or for consistent CI.

To build APK locally without relying on it:

1. **Prerequisites**:
   - Install Java JDK 21 (as detected in log). Ensure it's a full JDK (not JRE) and JAVA_HOME is set correctly. On Linux, install via `apt install openjdk-21-jdk` and verify with `java -version` and `javac -version`.
   - Install Android Studio (includes Android SDK, Gradle).
   - Ensure `ANDROID_HOME` and `JAVA_HOME` environment variables are set.
   - Install Node.js and Capacitor CLI globally: `npm install -g @capacitor/cli`.

2. **Build Steps**:
   - In project root: `npm run build-mobile` (builds Next.js and syncs to Android).
   - For debug APK: `cd android && ./gradlew assembleDebug`.
     - Output: `android/app/build/outputs/apk/debug/app-debug.apk`.
     - **Note**: If Gradle fails with JAVA_COMPILER error, ensure JDK is properly installed and JAVA_HOME points to JDK bin directory.
   - For release APK: `cd android && ./gradlew assembleRelease` (requires signing config in `build.gradle`).
     - Output: `android/app/build/outputs/apk/release/app-release.apk`.
   - Install on device/emulator: `adb install path/to/app-debug.apk`.

3. **Alternative Capacitor Command**:
   - `npx cap build android` (opens Android Studio for build/signing).

## Building iOS App and Installing on iPhone for Testing

Yes, possible on macOS with Xcode.

1. **Prerequisites**:
   - macOS with Xcode installed.
   - iOS device connected or Simulator.
   - Capacitor iOS added: `npx cap add ios` (if not done).

2. **Build Steps**:
   - `npm run build-mobile:ios` (builds and syncs to iOS).
     - **Note**: Requires macOS; on Linux, add iOS platform first with `npx cap add ios` (but build will fail without Xcode).
   - Open in Xcode: `npx cap open ios` or `open ios/App/App.xcworkspace`.
   - In Xcode: Select device/simulator, build (Cmd+B), run (Cmd+R).

3. **Install on iPhone**:
   - For testing: Use Xcode to run on connected device (requires Apple Developer account for physical devices).
   - For distribution: Archive build, upload to TestFlight/App Store.
   - Simulator: No install needed, runs directly.

Note: iOS builds require macOS; use cloud services like Appflow or CI runners for non-mac environments.