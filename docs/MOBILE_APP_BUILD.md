# Mobile App Build Progress

This document tracks the progress of building iOS and Android apps from the Surgical Techniques web app using Capacitor.

## Overview

| Item | Status |
|------|--------|
| Capacitor installed | ✅ Complete |
| iOS project created | ✅ Complete |
| Android project created | ✅ Complete |
| iOS build tested | ⏳ Pending (needs Xcode) |
| Android build tested | ⏳ Pending |
| App icons | ⏳ Pending |
| Splash screens | ⏳ Pending |
| App Store submission | ⏳ Pending |
| Google Play submission | ⏳ Pending |

---

## Completed Steps

### 1. Capacitor Setup (Feb 3, 2026)

Installed Capacitor and created native projects:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Surgical Techniques" "com.twhsystems.surgicaltechniques" --web-dir dist
npm install @capacitor/ios @capacitor/android
npm run build && npx cap add ios && npx cap add android
```

**Configuration** (`capacitor.config.json`):
```json
{
  "appId": "com.twhsystems.surgicaltechniques",
  "appName": "Surgical Techniques",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  },
  "ios": {
    "contentInset": "automatic"
  },
  "android": {
    "allowMixedContent": false
  }
}
```

---

## Pending Steps

### 2. Install Xcode (In Progress)

**Blocker:** macOS 13.2.1 is too old for latest Xcode. Need macOS 14.5+.

**Action:** Update macOS to Sonoma (14.x) or Sequoia (15.x), then install Xcode from App Store.

After macOS update:
```bash
# Install Xcode from App Store, then:
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer

# Open iOS project
npx cap open ios
```

### 3. Test iOS Build

Once Xcode is installed:
1. Open project: `npx cap open ios`
2. Select iPhone simulator from dropdown
3. Click Run (▶️) to build and test
4. Verify app loads and functions correctly

### 4. Test Android Build

If Android Studio is installed:
```bash
npx cap open android
```
Then select emulator and run.

### 5. App Icons

Replace placeholder icons:

**iOS:** `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Need 1024x1024 PNG (no transparency)

**Android:** `android/app/src/main/res/mipmap-*/`
- Need multiple sizes or use Android Studio's Image Asset Studio

### 6. Splash Screens

**iOS:** `ios/App/App/Assets.xcassets/Splash.imageset/`
**Android:** `android/app/src/main/res/drawable-*/splash.png`

### 7. App Store Submission

Requirements:
- Apple Developer Account ($99/year)
- App icons and screenshots
- Privacy policy URL
- App description and metadata

### 8. Google Play Submission

Requirements:
- Google Play Console ($25 one-time)
- App icons and screenshots
- Privacy policy URL
- App description and metadata
- Signed APK/AAB

---

## Daily Workflow

After making React code changes:

```bash
# 1. Build web app
npm run build

# 2. Sync to native projects
npx cap sync

# 3. Test in simulators
npx cap open ios      # Opens Xcode
npx cap open android  # Opens Android Studio
```

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build React app to dist/ |
| `npx cap sync` | Copy web assets to native projects |
| `npx cap open ios` | Open iOS project in Xcode |
| `npx cap open android` | Open Android project in Android Studio |
| `npx cap copy` | Copy web assets only (no plugin updates) |
| `npx cap update` | Update native plugins only |

---

## Project Structure

```
surgery-techniques-app/
├── src/                    # React source code
├── dist/                   # Built web app (synced to native)
├── ios/                    # iOS native project
│   └── App/
│       ├── App.xcodeproj/  # Xcode project
│       └── App/
│           ├── Assets.xcassets/  # Icons, splash screens
│           └── Info.plist        # iOS config
├── android/                # Android native project
│   └── app/
│       └── src/main/
│           ├── res/        # Icons, splash screens
│           └── AndroidManifest.xml
└── capacitor.config.json   # Capacitor configuration
```

---

## Notes

- The iOS and Android folders contain generated native projects
- These are committed to git for easy collaboration and native customization
- Web app code changes only require `npm run build && npx cap sync`
- Native changes (icons, permissions) are made directly in Xcode/Android Studio

---

*Last updated: Feb 3, 2026*
