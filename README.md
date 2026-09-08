# ConneX

ConneX is a construction companion app for planning a build in India: site location, nearby planners and suppliers, interior lookbooks, cost estimates, budget vs spend, and site progress with photos.

It runs on **Expo SDK 57**, **React Native 0.86**, and **React 19**, with **Clerk** for sign-in and **Firebase** for project data, images, and PDF catalogs.

## Features

| Area | What it does |
| --- | --- |
| **Account** | Email/password and Google sign-in (Clerk). Profile sheet shows name, email, and photo. |
| **Language** | English, Hindi, Telugu, Tamil, Kannada, Marathi. Choice is saved on the device. |
| **Plans** | Search or GPS a site, then list nearby contractors and agencies within 5 km. |
| **Interior design** | Style → room → category photo galleries from Firebase Storage. |
| **Cost estimation** | 2026 India turnkey ₹/sq ft by city, finish, and construction type, plus a rupee split. |
| **Budget tracking** | Projects with a planned cap and logged material/labour costs. |
| **Progress tracking** | Same projects, with tasks, stages, check-off, share, cover photo, and task photos. |
| **Material catalog** | In-app PDF reader for elevation, electrical, plumbing, doors, colours, roof, floor, safety. |
| **Cost catalog** | Nearby material stores by location and item (cement, steel, sand, and more). |

Budget tracking and progress tracking share the Firestore `projects` collection.

## Stack

- Expo Router (`src/app`)
- Clerk (`@clerk/expo`) — not Firebase Auth
- Cloud Firestore + Firebase Storage
- Google Places / Geolocation for maps and nearby search
- Expo File System for JPEG uploads to Storage
- ConneX palette in `src/constants/theme.ts`

## Project layout

```
src/app/(app)/     Signed-in screens (home, plans, budget, progress, catalogs, …)
src/app/screens/   Sign in, sign up, forgot password
src/lib/           Firebase, cost formula, budget/progress helpers, image upload
src/i18n/          Translations and language provider
src/components/    Shared header, maps, PDF frame, places search
```

## Prerequisites

- Node.js 20+
- npm
- [Expo Go](https://expo.dev/go) **SDK 57** on a phone, or an Android/iOS simulator
- Accounts: [Clerk](https://clerk.com), [Firebase](https://console.firebase.google.com), [Google Cloud](https://console.cloud.google.com) (Maps / Places)

## Setup

1. Clone the repo and install:

```bash
npm install
```

2. Copy env and fill in keys (never commit `.env`):

```bash
cp .env.example .env
```

| Variable | Used for |
| --- | --- |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Sign-in |
| `EXPO_PUBLIC_FIREBASE_*` | Firestore + Storage |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Places, nearby search, photos |

3. Start Metro:

```bash
npx expo start
```

On Windows, if the phone cannot reach the PC, use a tunnel:

```bash
npm run start:tunnel
```

Then scan the QR code in Expo Go, or open the printed `exp://…trycloudflare.com:443` URL.

Other scripts: `npm run start` (LAN), `npm run start:usb`, `npm run android`, `npm run ios`, `npm run web`.

## Android (EAS)

This is how you get a real ConneX APK on a phone (no Expo Go). Builds run on Expo’s servers. You need a free [expo.dev](https://expo.dev) account.

`.env` is gitignored, so EAS cannot see your local keys. Put the same `EXPO_PUBLIC_*` names on Expo for the **preview** environment before you build.

1. Install EAS CLI and log in (browser window will open):

```bash
npm install --global eas-cli
eas login
eas whoami
```

2. Link this folder to an Expo project (creates `extra.eas.projectId` in `app.json`):

```bash
eas build:configure
```

Choose **Android**. Let EAS generate a new keystore when asked.

3. Copy every variable from `.env.example` into Expo:

[expo.dev](https://expo.dev) → your project → **Environment variables** → environment **preview** (and later **production**).

Visibility: **Sensitive** for keys. Do not use **Secret** for `EXPO_PUBLIC_*` — those values are baked into the app and Secret vars are not available to the JS bundle.

Or from the project folder (repeat per name, use your real values):

```bash
eas env:create --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value YOUR_VALUE --environment preview --visibility sensitive
```

4. Start the Android APK build:

```bash
npm run build:android
```

That runs `eas build -p android --profile preview`. First Android build can take 15–25 minutes. When it finishes, open the build URL, tap **Install**, and download the APK on the Samsung. Allow install from the browser if Android asks.

5. Later, Play Store uses an AAB (not APK):

```bash
npm run build:android:production
```

You need a Google Play Console account to upload that file.

## Firebase

Auth in the app is **Clerk**. Firebase Auth is unused. Test rules must allow access without a Firebase user.

### Cloud Firestore

1. Firebase Console → **Build → Firestore Database → Create database**.
2. Start in **test mode**. A location such as `asia-south1` (Mumbai) is a good fit for India.
3. Collection: **`projects`**.

Typical document:

```
name, userEmail, userId, createdAt, budget, materials[], tasks[], progress, imageUrl
```

- `materials[]` — budget line items (`id`, `description`, `cost`, `category`, `createdAt`)
- `tasks[]` — progress items (`id`, `description`, `date`, `isCompleted`, optional `notes`, `imageUrl`)

Example rules while developing (tighten before production):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Storage

1. Firebase Console → **Storage → Get started**.
2. Bucket in `.env` should look like `your-project.firebasestorage.app` (no `gs://`).

Paths the app uses:

| Path | Content |
| --- | --- |
| `categories/{style}/{room}/{category}/…` | Interior photos |
| `catalogs/*.pdf` | Material catalog PDFs (see list below) |
| `projects/{projectId}/cover.jpg` | Progress cover |
| `projects/{projectId}/tasks/{taskId}.jpg` | Task photo |

Catalog file names:

`elevation.pdf`, `electrical.pdf`, `plumbing.pdf`, `door.pdf`, `colors.pdf`, `roof.pdf`, `floor.pdf`, `safety.pdf`

Test Storage rules:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

Spark plan Storage may need Blaze depending on Google’s current quotas.

## Clerk

Enable **email/password** and **Google** in the Clerk dashboard. Set the publishable key in `.env`. Redirect after sign-in goes to `/(app)/home`.

## Google Maps / Places

Enable **Places API** (and related Maps APIs you use) for the same key as `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`. Restrict the key when you ship.

In **Expo Go**, native Google Maps chrome is not used. The plans map draws **OpenStreetMap / Carto / Esri tiles**. Nearby search still uses Google Places.

## Cost estimation

Rates in `src/lib/cost-estimate.ts` are **indicative 2026 India turnkey ₹/sq ft** (city × finish × construction type × built-up area + 5% contingency).

- Types: load-bearing, RCC frame, prefab / LGSF, industrial / PEB
- Excludes land, GST, statutory fees, and contractor quotes

Use the figure as a planning cap in Budget tracking if you want.

## Languages

Open Home → profile (name + photo) → **Language**. Stored with Expo Secure Store (native) or `localStorage` (web).

UI chrome is translated. User-entered names, saved task text, and city names stay as stored.

## Notes

- Reload Expo Go fully after native-related changes (not only Fast Refresh).
- Firestore writes strip `undefined` fields; the JS SDK rejects them.
- Progress photos upload via Expo File System HTTP, not the Firebase web Blob helper (that path fails in React Native).
- Do not commit `.env`, credentials, or `node_modules`.

## What not to push

Git ignores local and secret files via `.gitignore`. Do **not** add these to GitHub:

| Path | Why |
| --- | --- |
| `.env` | Clerk, Firebase, and Maps keys |
| `node_modules/` | Installed packages (`npm install` recreates this) |
| `.expo/` | Metro cache and local Expo state |
| `ios/`, `android/` | Generated native folders (if you run prebuild) |
| `*.jks`, `*.p8`, `*.p12`, `*.key` | Signing secrets |
| `.vscode/`, `.idea/`, `.claude/`, `.cursor/` | Editor / AI tool settings |
| `*.log` | Dev server logs |

**Do** commit `.env.example` (empty key names only), source under `src/`, `assets/`, `package.json`, `app.json`, `app.config.js`, `metro.config.js`, and `scripts/`.

## License

Private project. All rights reserved unless you add a license.
