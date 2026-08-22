# Getting Scaffold onto the App Store

The engineering side is done — the app is wrapped with Capacitor (`ios/App/App.xcodeproj`),
icons/splash are generated, and native push (APNs) is wired up alongside the existing
web push. Everything below this point is account-bound (your Apple ID, your payment
method, your device) and has to happen on your end — I can't click through Apple's own
dashboards or enter payment details for you.

## 1. Install Xcode

Full Xcode (not just Command Line Tools) is required — install it from the Mac App
Store. It's a large download (10GB+); Command Line Tools alone can't build/sign/archive
an iOS app.

Once installed, open `ios/App/App.xcodeproj` (there's no `.xcworkspace` — this project
uses Swift Package Manager, not CocoaPods, so the `.xcodeproj` is what you want).

## 2. Sign in and pick a team

Xcode → Settings → Accounts → add your Apple ID. Then in the project navigator, select
the **App** target → **Signing & Capabilities** → pick your team from the dropdown.
A free Apple ID lets you build and run on your own device (re-signs every 7 days). To
submit to TestFlight/App Store, or to get push notifications working at all, you need:

## 3. Enroll in the Apple Developer Program

$99/year, at [developer.apple.com/programs](https://developer.apple.com/programs). This
also unlocks a full year of on-device signing (no more 7-day expiry) and is required for
push notifications and any App Store submission.

## 4. Turn on Push Notifications capability

Back in Xcode, App target → **Signing & Capabilities** → **+ Capability**:
- Add **Push Notifications**
- Add **Background Modes**, and check **Remote notifications**

Xcode will generate an entitlements file and wire it up automatically — nothing to edit
by hand.

## 5. Create an APNs Auth Key

[developer.apple.com/account](https://developer.apple.com/account) → **Certificates,
IDs & Profiles** → **Keys** → **+** → name it (e.g. "Scaffold push") → check **Apple
Push Notifications service (APNs)** → Continue → Register → **Download** the `.p8` file.

**This download only works once** — if you lose it you have to revoke the key and make
a new one. Also note down:
- The **Key ID** (shown right after creating it, 10 characters)
- Your **Team ID** (top-right of the developer account page, or Membership details — also 10 characters)

## 6. Set the APNs secrets

In your terminal, with the `.p8` file's path handy:

```bash
npx supabase secrets set --project-ref qxxamolmtdrwimosclur \
  APNS_KEY_ID=YOUR_KEY_ID \
  APNS_TEAM_ID=YOUR_TEAM_ID \
  APNS_TOPIC=com.miasachdev.scaffold \
  APNS_AUTH_KEY="$(cat /path/to/AuthKey_YOURKEYID.p8)"
```

While testing a Debug build straight from Xcode (not yet through TestFlight), also set
`APNS_SANDBOX=true` — TestFlight/App Store builds use Apple's production push
environment, so remove/unset that once you're past local device testing.

## 7. Run the last database migration

`supabase/migration_device_push_tokens.sql` — run it in [the SQL
editor](https://supabase.com/dashboard/project/qxxamolmtdrwimosclur/sql/new) (separate
from the Web Push migration you already ran).

## 8. Test on a real device

Push notifications **do not work in the Simulator at all** — you need a physical
iPhone connected via cable (or on the same network with Xcode's wireless debugging).
Select your iPhone as the run destination and hit ▶. First launch, you'll need to
trust the developer certificate on the phone: Settings → General → VPN & Device
Management.

Open Settings in the app and turn on "What now?" reminders — same toggle as the web
version, it detects it's running natively and registers for real APNs push instead.

## 9. App Store Connect listing

Once it's working on-device: [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
→ My Apps → **+** → New App.
- Bundle ID: `com.miasachdev.scaffold` (register it under Identifiers first if Xcode
  hasn't already done so automatically)
- Name: "Scaffold" (or something else if that's taken — App Store names are globally unique)
- Category: Productivity (or Education)
- Privacy Policy URL: your deployed `/privacy.html` (needs a real public URL — the
  Vercel domain, once that's settled)
- App Privacy "nutrition label" questionnaire: based on what `privacy.html` already
  says — email (account), and the task/journal/goal data tied to the account; nothing
  used for tracking or sold to third parties
- Pricing: free vs. paid was never decided — needs an actual answer here
- Screenshots: required per device size class — once you're on-device or have a
  Simulator running, I can help capture these

## 10. Archive and submit

Product → Archive in Xcode → **Distribute App** → App Store Connect → Upload. Give it
15–60 minutes to process, then submit it for review from App Store Connect.

Apple's review guidelines specifically flag apps that are "just a website wrapped in a
shell" (guideline 4.2) — worth keeping in mind if it comes back with feedback. Real push
notifications and the native install (rather than pure web content) both help here, but
it's not a guarantee.
