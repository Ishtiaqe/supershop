# Android Build Instructions

This document outlines the steps to build the Android APK for the SuperShop app.

## Prerequisites

- Node.js and npm installed
- Capacitor CLI installed (`npm install -g @capacitor/cli`)
- Android Studio or Android SDK installed
- Keystore file at `/mnt/storage/Projects/supershop/xiandai-signature.jks`
- Signing passwords configured in `android/gradle.properties`

## Signing Configuration

The app is configured to sign the release APK automatically. The signing details are in `android/gradle.properties`:

```
MYAPP_RELEASE_STORE_FILE=/mnt/storage/Projects/supershop/xiandai-signature.jks
MYAPP_RELEASE_STORE_PASSWORD=Xiandai123@
MYAPP_RELEASE_KEY_ALIAS=key0
MYAPP_RELEASE_KEY_PASSWORD=Xiandai123@
```

**Security Note:** Do not commit `gradle.properties` to version control if it contains real passwords.

## Build Steps

### 1. Sync Capacitor with Android Project

```bash
npx cap sync android
```

This updates the Android project with the latest web assets.

### 2. Build the Signed Release APK

```bash
cd android
./gradlew assembleRelease
```

The signed APK will be generated at `android/app/build/outputs/apk/release/app-release.apk`.

### 3. (Optional) Build Debug APK

If you need a debug APK without signing:

1. Temporarily comment out the `signingConfig signingConfigs.release` line in `android/app/build.gradle`
2. Run:

```bash
npx cap build android
```

3. Uncomment the signing config line after building.

## Installation

- Transfer the `app-release.apk` to your Android device
- Enable "Install from unknown sources" in device settings
- Install the APK

## Troubleshooting

- If the build fails due to keystore issues, verify the keystore path and passwords
- Ensure the keystore file exists and is accessible
- For Gradle issues, check `android/build/reports/problems/problems-report.html`

## Version Updates

To update the app version:

1. Edit `versionCode` and `versionName` in `android/app/build.gradle`
2. Rebuild the APK

## Notes

- The app uses the production API URL (`https://api.shomaj.one/api/v1`) as configured in `.env.production`
- For development, the Capacitor config can be switched to load from Vercel by setting `useVercel = true` in `capacitor.config.ts`