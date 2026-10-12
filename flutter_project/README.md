# Car Bond Manager — Flutter (Android)

Production-ready starter for the Car Bond Manager Android app, mirroring the web version. Built with Flutter + Riverpod + SQLite (sqflite_sqlcipher) + Material 3.

## Features
- 4-digit PIN + optional fingerprint unlock (auto-lock on inactivity)
- Encrypted local SQLite DB (sqflite_sqlcipher)
- Inventory, Buyers, Hire Purchase, Payments
- Dashboard with overdue / due-today / upcoming
- Local notifications (7/3/1/0 days before due, and after overdue)
- PDF + Excel export, share sheet
- Backup & restore (JSON)
- Material 3 theme: Dark Blue primary, Orange accent, Light Grey background
- Bottom navigation: Dashboard, Inventory, Buyers, Payments, Settings

## Architecture
```
lib/
  main.dart              # Entry, theme, routing
  models/                # Car, Buyer, HirePurchase, Payment
  data/
    app_database.dart    # SQLCipher schema + DAO methods
    repositories.dart    # Repository layer per entity
  services/
    auth_service.dart    # PIN hashing, biometric, inactivity
    notification_service.dart
    export_service.dart  # PDF + Excel
    backup_service.dart  # JSON backup/restore
  screens/
    splash_screen.dart
    pin_screen.dart
    dashboard_screen.dart
    inventory/{list,detail,form}_screen.dart
    buyers/{list,detail,form}_screen.dart
    hp/{form,detail}_screen.dart
    payments/{list,form}_screen.dart
    reports_screen.dart
    settings_screen.dart
  widgets/               # Reusable cards, status badges, inputs
```
Clean Architecture + MVVM with Riverpod providers as ViewModels; Repository pattern over the SQLite DAO; DI through `ProviderScope`.

## Setup
1. Install Flutter (https://docs.flutter.dev/get-started/install) — latest stable.
2. `flutter pub get`
3. Open in Android Studio or VS Code.
4. Run on a device or emulator: `flutter run`.
5. Build APK: `flutter build apk --release`.

### Android permissions (android/app/src/main/AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```
Set `minSdkVersion 23` in `android/app/build.gradle` for biometrics + SQLCipher.

## Database schema
Tables: `cars`, `buyers`, `hire_purchase`, `payments`, `settings`. Same fields as in the web version (see `lib/data/app_database.dart`). DB file is opened with a passphrase derived from the user's PIN + device salt (stored in `shared_preferences`).

## Business logic
- New payment → recompute paid total → compute next due date by counting paid installments × frequency interval after `startDate`.
- Balance ≤ 0 → mark HP `completed`, set car status to `sold_completed`, send completion notification.
- Cron-like: on app start and on every Dashboard load, the notification service schedules reminders for all active HPs based on `reminderDays` setting (default `7,3,1,0`).

## Roadmap (V2)
Cloud sync (Firebase / Supabase), multi-user roles, SMS/WhatsApp reminders, Mobile Money APIs (MTN/Airtel), URA tax reports, QR labels for vehicles, analytics dashboard, customer portal.

## Notes
This scaffold ships the core architecture, schema, theme, navigation, and key services. Screens not yet fleshed out can be ported 1:1 from the web app's equivalent route (`src/routes/*.tsx`) — the data model and business rules are identical.
