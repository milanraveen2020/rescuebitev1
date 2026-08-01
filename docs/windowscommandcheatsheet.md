# Windows Command Cheat Sheet — Mystery Box

Quick reference for day-to-day development on Windows. All commands assume
`D:\myst` (or wherever you cloned the repo) as the working directory, run
from a **PowerShell** window (not cmd).

---

## 🟢 Daily startup (the 99% case)

Double-click:
```
scripts\windows\start-dev.bat
```
This starts Docker (`rescuebite-db`), opens the API server, and opens Expo.
Then: boot the emulator from Android Studio's Device Manager, click into the
Expo window, press `a`. On the emulator, tap **Mystery Box** → tap the
`http://10.0.2.2:8081` server row.

**Manual equivalent**, if you'd rather run it by hand:
```powershell
docker start rescuebite-db
pnpm dev:api          # new terminal — leave running
cd apps\customer
npx expo start         # new terminal — leave running
```

---

## 🛠️ First-time setup (once per fresh clone)

Run these **in order**, once, after cloning or after deleting `node_modules`:

```powershell
pnpm install            # install all dependencies
pnpm build               # build shared packages (types, ui, api-client) into dist/
pnpm db:generate          # generate the Prisma client from the schema
pnpm db:migrate           # create/update database tables
pnpm --filter @rescuebite/api db:seed   # load demo data (stores, listings, test accounts)
```

> ⚠️ If `apps/customer` throws `TypeError: Cannot read property 'page' of undefined`
> or the API throws 200+ TypeScript errors about `@prisma/client` — you skipped
> `pnpm build` or `pnpm db:generate`. Run them.

---

## 🔑 Test login accounts

All passwords: `Password123!`

| Role | Email |
|---|---|
| Admin | `admin@rescuebite.test` |
| Merchant | `owner1@rescuebite.test` (Perera Family Bakers) |
| Merchant | `owner2@rescuebite.test` (Green Cabin Grocer) |
| Merchant | `owner3@rescuebite.test` (Ceylon Coffee House) |
| Customer | `cara@rescuebite.test` |
| Suspended (for testing) | `banned@rescuebite.test` |

---

## 🔄 Common "fix it" commands

| Symptom | Fix |
|---|---|
| API won't compile, 200+ Prisma errors | `pnpm db:generate` |
| Customer app: blank screen / `colors.surface.page` crash | `pnpm build` (shared packages not built) |
| `package.json does not exist` for customer app | The file is missing — reinstall deps after restoring it: `pnpm install` |
| Database tables missing/out of sync | `pnpm db:migrate` |
| Need fresh demo data (or pickup windows expired) | `pnpm --filter @rescuebite/api db:seed` |
| Just wiped the emulator — app gone | Reinstall existing APK (fast, no rebuild): see below |
| Docker container not running | `docker start rescuebite-db` (Docker Desktop must be open) |

---

## 📱 Emulator app reinstall (after Wipe Data, no native changes)

```powershell
adb install apps\customer\android\app\build\outputs\apk\debug\app-debug.apk
```
Then on the emulator: tap **Mystery Box** → tap the `http://10.0.2.2:8081` row.

---

## 🔨 Full native rebuild (only after adding a native module)

```powershell
cd apps\customer
npx expo prebuild --platform android
cd android
.\gradlew.bat app:assembleDebug -x lint -x test -PreactNativeArchitectures=x86_64
adb install -r app\build\outputs\apk\debug\app-debug.apk
cd ..
npx expo start
```
Takes ~30 minutes the first time. Everyday JS/TS edits do **not** need this —
they hot-reload through the already-installed app.

---

## ✅ Checks before calling something "done"

```powershell
pnpm typecheck    # TypeScript errors
pnpm lint          # code style / rule violations
pnpm test          # unit + e2e tests (needs rescuebite-db running)
pnpm verify        # runs all three above at once
pnpm format        # auto-fix formatting
```

---

## 🐳 Docker

```powershell
docker ps                     # is rescuebite-db running?
docker start rescuebite-db    # start it
docker stop rescuebite-db     # stop it (data is preserved)
docker system prune           # clean up unused Docker junk (safe — check `docker ps`
                                # shows rescuebite-db RUNNING first, so it's protected)
```
Never run `docker system prune -a --volumes` unless you want to wipe the database.

---

## 🌐 Test the API directly (bypass the app to isolate bugs)

Open in a browser on your PC (not the emulator):
```
http://localhost:4000/health
http://localhost:4000/listings/nearby?lat=6.9271&lng=79.8612&radiusKm=10&sort=distance
```
Colombo coordinates: `lat=6.9271&lng=79.8612` (matches the seed data).

---

## 🧹 Emulator location (GPS), if "no boxes nearby" shows up

Emulator toolbar → `⋮` (More) → **Location** → set:
- Latitude: `6.9271`
- Longitude: `79.8612`
→ **SET LOCATION**

(Wiping emulator data resets this back to the emulator's default — you'll
need to set it again after a Wipe Data.)

---
