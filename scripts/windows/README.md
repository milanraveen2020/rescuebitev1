# Windows setup — system tools via winget

This folder holds a **declarative list** of the OS-level tools RescueBite needs on a
Windows dev machine. It is **not a script and not an installer** — it contains no code,
no download URLs, and no executable payload. It is just four package *names* that
Windows' own package manager (`winget`) resolves for you.

## Why this is safe

- **`winget` is Microsoft's built-in package manager** (ships as "App Installer" on
  Windows 10/11). You are running a Microsoft tool, not anything from this repo.
- Each package is downloaded from the **vendor's official source** (nodejs.org,
  git-scm.com, docker.com, Google) via the official winget community repository.
- winget **verifies a SHA-256 hash** of every installer before it runs, and the
  installers are **code-signed by the vendor**. A tampered download is rejected.
- Inspect any entry before trusting it:
  ```powershell
  winget show OpenJS.NodeJS.LTS
  winget show Docker.DockerDesktop
  ```

## What it installs

| Package | Why RescueBite needs it |
| --- | --- |
| `OpenJS.NodeJS.LTS` | Node.js runtime + `corepack` (which provides `pnpm`) |
| `Git.Git` | Clone / pull the repo |
| `Docker.DockerDesktop` | Runs the PostgreSQL database in a container |
| `Google.AndroidStudio` | Android SDK + emulator (AVD) to run the app |

## How to use

From a terminal (PowerShell), in the repo root:

```powershell
winget import scripts\windows\packages.json --accept-package-agreements --accept-source-agreements
```

winget lists what it will install and (for Docker Desktop / Android Studio) may
require a reboot. Docker Desktop needs the WSL 2 backend, which its installer sets up.

## After the tools are installed

1. Enable pnpm and install all project dependencies (this is the JS "requirements" step —
   it reads `package.json` + `pnpm-lock.yaml` across the whole monorepo):
   ```powershell
   corepack enable
   corepack pnpm install
   ```
2. Finish the one interactive step no manifest can automate — open **Android Studio**
   and use **SDK Manager** (install an SDK + a system image) and **Device Manager**
   (create an emulator / AVD).
3. Follow the run steps in the project README / CLAUDE.md ("Local development & testing").
