# iOS Build Instructions

This document outlines the steps to build the iOS app for the SuperShop app.

## Prerequisites

- Node.js and npm installed
- Capacitor CLI installed (`npm install -g @capacitor/cli`)
- macOS with Xcode installed (required for iOS builds)
- Apple Developer Account (for App Store distribution)
- CocoaPods installed (`sudo gem install cocoapods`)

## Push Notifications Setup

### 1. Enable Push Notifications in Apple Developer Portal

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to Certificates, Identifiers & Profiles
3. Select your App ID (one.shomaj.supershop)
4. Enable "Push Notifications" capability
5. Create or download your push notification certificate

### 2. Configure Push Notifications in Xcode

1. Open the iOS project: `npx cap open ios`
2. Select your project in the navigator
3. Go to "Signing & Capabilities" tab
4. Click "+ Capability" and add "Push Notifications"
5. Ensure your team and bundle identifier are correct

### 3. Add Background Modes

In Xcode, add the following background modes:
- Background processing
- Remote notifications

### 4. Configure Info.plist

The Capacitor Push Notifications plugin automatically adds required permissions, but you may need to manually add these to `ios/App/App/Info.plist` if needed:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

For iOS 10+ notification authorization, ensure these are present (added automatically by Capacitor):
```xml
<key>NSUserNotificationAlertStyle</key>
<string>alert</string>
```

## Build Steps

### 1. Sync Capacitor with iOS Project

```bash
npx cap sync ios
```

This updates the iOS project with the latest web assets and plugins.

### 2. Open in Xcode

```bash
npx cap open ios
```

### 3. Build the App

In Xcode:
1. Select your target device (simulator or physical device)
2. Press Cmd+B to build, or Cmd+R to run
3. For release builds, select "Any iOS Device" as target
4. Product → Archive to create an archive for App Store distribution

### 4. Install CocoaPods Dependencies (if needed)

```bash
cd ios
pod install
cd ..
```

## Testing on Physical Device

1. Connect your iOS device via USB
2. In Xcode, select your device from the device dropdown
3. Press Cmd+R to build and run
4. Trust the developer certificate on your device if prompted

## App Store Distribution

1. Create an archive in Xcode (Product → Archive)
2. When archive completes, the Organizer window will appear
3. Click "Distribute App"
4. Follow the prompts to upload to App Store Connect
5. Complete the App Store listing and submit for review

## Troubleshooting

- **Build fails with signing errors**: Ensure your Apple Developer account is active and certificates are valid
- **Push notifications not working**: Verify APNs certificate is properly configured in Apple Developer Portal
- **CocoaPods issues**: Try `pod deintegrate` then `pod install` in the ios directory
- **Capacitor sync issues**: Delete `ios/Podfile.lock` and run `npx cap sync ios` again

## Version Updates

To update the app version:

1. Edit `version` in `ios/App/App.xcodeproj/project.pbxproj` or use Xcode's UI
2. Update the build number
3. Rebuild the app

## Notes

- The app uses the production API URL (`https://api.shomaj.one/api/v1`) as configured in `.env.production`
- For development, the Capacitor config can be switched to load from Vercel by setting `useVercel = true` in `capacitor.config.ts`
- iOS requires physical device testing for push notifications (simulator has limited support)
