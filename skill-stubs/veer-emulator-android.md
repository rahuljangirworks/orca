# Veer Emulator (Android)

This file is a discovery stub, not the usage guide. The full, version-matched Veer Android
emulator reference is served by the `veer` binary itself — kept out of this file on purpose
so it can never drift from the binary that will actually run your commands.

Engage Veer whenever you drive an adb-connected Android emulator or device from inside the
Veer app: listing/booting AVDs, taps, swipes, typing, hardware buttons (including Back and
Recents), rotation, app install/launch, runtime permissions, the accessibility tree, and
logcat. It is cross-platform (Windows, Linux, macOS) and complements the veer-emulator (iOS)
and veer-cli skills.

## Resolve the CLI for this session

Choose the executable once and reuse it for every later command:

- If the `VEER_CLI_COMMAND` environment variable is set, use its value. Veer exports this
  for managed WSL sessions.
- Otherwise, in a dev checkout whose session exposes `VEER_DEV_REPO_ROOT`, use `veer-dev`.
- Otherwise, use `veer`. If it is unavailable, ask the user to install the Veer CLI from Settings.

Below, `VEER` is a placeholder for the executable you resolved. Substitute it before
running anything; do not create a shell variable or run `VEER` literally. This works the
same way in POSIX shells, PowerShell, and cmd.exe.

If the selected executable cannot run, report its exact error and stop. Do not fall through
to another executable, which could silently target a different Veer build.

## Load the full guide before running Veer commands

```text
VEER skills get veer-emulator-android
```

That prints the complete, version-matched guide for the exact binary that will handle your
next commands — booting AVDs, taps and swipes, typing, hardware buttons, app lifecycle,
permissions, the accessibility tree, and logcat. Read it first, then run the specific
command you need.

Don't guess subcommands or flags from memory or from a cached copy of this stub. They
change between Veer releases, and this file deliberately no longer lists them. Confirm the
app is up with `VEER status --json` (start it with `VEER open --json` if needed), and
prefer `--json` for agent-driven calls.

## If an older Veer does not recognize `skills get`

Use this fallback only when the selected binary explicitly reports that `skills get` is an
unknown command. Another failure is not proof of an older binary; report it rather than
guessing or changing executables. For a confirmed pre-guide binary, use only this bounded,
read-only bootstrap to orient. Do not dead-end and do not invent commands:

```text
VEER status --json
VEER emulator devices --json
```

Then tell the user that updating Veer restores the full, version-matched guide via
`VEER skills get veer-emulator-android`. Beyond these commands, ask the user rather than
guessing a command surface this older binary may not support.
