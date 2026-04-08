import fs from "node:fs/promises";
import path from "node:path";
import { resolveStateDir } from "../config/paths.js";
import { normalizeUpdateTrack, type UpdateTrack } from "./update-channels.js";

const UPDATE_SETTINGS_FILENAME = "update-settings.json";

export type InstallKind = "git" | "package" | "installer" | "unknown";

export type UpdateSettings = {
  track?: UpdateTrack;
  checkOnStart?: boolean;
  installKind?: InstallKind;
  auto?: {
    enabled?: boolean;
    stableDelayHours?: number;
    stableJitterHours?: number;
    betaCheckIntervalHours?: number;
  };
};

export async function readUpdateSettings(): Promise<UpdateSettings> {
  const settingsPath = path.join(resolveStateDir(), UPDATE_SETTINGS_FILENAME);
  try {
    const raw = await fs.readFile(settingsPath, "utf-8");
    const parsed = JSON.parse(raw) as UpdateSettings;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function writeUpdateSettings(settings: UpdateSettings): Promise<void> {
  const settingsPath = path.join(resolveStateDir(), UPDATE_SETTINGS_FILENAME);
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
}

export async function patchUpdateSettings(patch: Partial<UpdateSettings>): Promise<void> {
  const current = await readUpdateSettings();
  await writeUpdateSettings({ ...current, ...patch });
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

/** Detect the install kind at startup. */
async function detectInstallKind(): Promise<InstallKind> {
  // Check git checkout
  const root = path.resolve(resolveStateDir(), "..");
  const isGit = (await fileExists(path.join(root, ".git"))) ||
    (await fileExists(path.join(process.cwd(), ".git")));
  if (isGit) return "git";

  // Check bundled installer (Windows .exe / macOS .dmg)
  const isInstaller =
    (process.platform === "win32" &&
      (await fileExists(path.join(root, "..", "node", "node.exe")))) ||
    (process.platform === "darwin" &&
      (await fileExists(path.join(root, "node", "bin", "node"))));
  if (isInstaller) return "installer";

  return "package";
}

/** Ensure update-settings.json exists with defaults. Called on gateway startup. */
export async function ensureUpdateSettings(): Promise<UpdateSettings> {
  const settingsPath = path.join(resolveStateDir(), UPDATE_SETTINGS_FILENAME);
  try {
    const raw = await fs.readFile(settingsPath, "utf-8");
    const parsed = JSON.parse(raw) as UpdateSettings;
    if (parsed && typeof parsed === "object") {
      // Backfill installKind for existing settings files
      if (!parsed.installKind) {
        parsed.installKind = await detectInstallKind();
        await writeUpdateSettings(parsed);
      }
      return parsed;
    }
  } catch {
    // File doesn't exist or is invalid — create with defaults
  }
  const installKind = await detectInstallKind();
  const isGit = installKind === "git";
  const defaults: UpdateSettings = isGit
    ? {
        track: "dev",
        checkOnStart: true,
        installKind,
      }
    : {
        track: "stable",
        checkOnStart: true,
        installKind,
        auto: {
          enabled: false,
          stableDelayHours: 6,
          stableJitterHours: 12,
          betaCheckIntervalHours: 1,
        },
      };
  await writeUpdateSettings(defaults);
  return defaults;
}

/** Returns the effective stored track: env var > settings file > null */
export async function getStoredUpdateTrack(): Promise<UpdateTrack | null> {
  const envTrack = normalizeUpdateTrack(process.env.ENCLAWS_UPDATE_TRACK);
  if (envTrack) {
    return envTrack;
  }
  const settings = await readUpdateSettings();
  return normalizeUpdateTrack(settings.track) ?? null;
}
