import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { z } from "zod";
import { ALL_ACHIEVEMENTS } from "../rules/achievements.js";

// ============================================
// ENDING GALLERY - Persistent Storage
// ============================================
// Tracks endings and achievements across all game sessions.
// Stored in ~/.dino-lair/gallery.json
//
// Hardening (QA Review):
// - Atomic writes via temp file + rename
// - Zod schema validation on load
// - Dynamic achievement count from source

const GALLERY_DIR = path.join(process.env.HOME || os.homedir() || "/tmp", ".dino-lair");
const GALLERY_FILE = path.join(GALLERY_DIR, "gallery.json");

// Total possible endings (update when adding new endings)
const TOTAL_ENDING_TYPES = 14;

// ============================================
// ZOD SCHEMA FOR GALLERY VALIDATION
// ============================================

const EndingRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  achievedAt: z.string(),
  sessionId: z.string(),
  turnsToComplete: z.number(),
  finalAct: z.string(),
});

const AchievementRecordSchema = z.object({
  id: z.string(),
  firstAchievedAt: z.string(),
  timesAchieved: z.number(),
  lastSessionId: z.string(),
});

const GalleryDataSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  endings: z.array(EndingRecordSchema),
  achievements: z.record(AchievementRecordSchema),
  stats: z.object({
    totalGamesCompleted: z.number(),
    totalTurnsPlayed: z.number(),
    firstGameAt: z.string().nullable(),
    lastGameAt: z.string().nullable(),
    favoriteEnding: z.string().nullable(),
  }),
});

// ============================================
// TYPES
// ============================================

export interface EndingRecord {
  id: string;
  title: string;
  achievedAt: string; // ISO date
  sessionId: string;
  turnsToComplete: number;
  finalAct: string;
}

export interface AchievementRecord {
  id: string;
  firstAchievedAt: string; // ISO date
  timesAchieved: number;
  lastSessionId: string;
}

export interface GalleryData {
  version: string;
  lastUpdated: string;
  endings: EndingRecord[];
  achievements: Record<string, AchievementRecord>;
  stats: {
    totalGamesCompleted: number;
    totalTurnsPlayed: number;
    firstGameAt: string | null;
    lastGameAt: string | null;
    favoriteEnding: string | null; // Most achieved ending
  };
}

// ============================================
// STORAGE HELPERS
// ============================================

function ensureGalleryDir(): void {
  if (!fs.existsSync(GALLERY_DIR)) {
    fs.mkdirSync(GALLERY_DIR, { recursive: true });
  }
}

function createEmptyGallery(): GalleryData {
  return {
    version: "1.0",
    lastUpdated: new Date().toISOString(),
    endings: [],
    achievements: {},
    stats: {
      totalGamesCompleted: 0,
      totalTurnsPlayed: 0,
      firstGameAt: null,
      lastGameAt: null,
      favoriteEnding: null,
    },
  };
}

export function loadGallery(): GalleryData {
  ensureGalleryDir();

  if (!fs.existsSync(GALLERY_FILE)) {
    return createEmptyGallery();
  }

  try {
    const data = fs.readFileSync(GALLERY_FILE, "utf-8");
    const parsed = JSON.parse(data);

    // Validate with Zod schema
    const result = GalleryDataSchema.safeParse(parsed);
    if (!result.success) {
      console.error("[GALLERY] Gallery data validation failed:", result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; "));
      console.error("[GALLERY] Creating backup and starting fresh");
      // Backup corrupted file
      const backupPath = `${GALLERY_FILE}.backup-${Date.now()}`;
      try {
        fs.copyFileSync(GALLERY_FILE, backupPath);
        console.error(`[GALLERY] Corrupted gallery backed up to ${backupPath}`);
      } catch {
        // Backup failed, continue anyway
      }
      return createEmptyGallery();
    }

    return result.data as GalleryData;
  } catch (error) {
    console.error("[GALLERY] Failed to load gallery, creating new one:", error);
    return createEmptyGallery();
  }
}

function saveGallery(gallery: GalleryData): void {
  ensureGalleryDir();
  gallery.lastUpdated = new Date().toISOString();

  // Use atomic write: write to temp file, then rename
  // This prevents corruption if the process crashes mid-write
  const tempFile = `${GALLERY_FILE}.tmp-${process.pid}`;

  try {
    // Write to temp file
    fs.writeFileSync(tempFile, JSON.stringify(gallery, null, 2));

    // Atomic rename (on same filesystem, this is atomic on POSIX)
    fs.renameSync(tempFile, GALLERY_FILE);

    console.error(`[GALLERY] Saved to ${GALLERY_FILE}`);
  } catch (error) {
    console.error("[GALLERY] Failed to save gallery:", error);

    // Clean up temp file if it exists
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch {
      // Cleanup failed, not critical
    }
  }
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Record a completed game ending
 */
export function recordEnding(
  endingId: string,
  endingTitle: string,
  sessionId: string,
  turns: number,
  finalAct: string
): void {
  const gallery = loadGallery();
  const now = new Date().toISOString();

  // Add ending record
  gallery.endings.push({
    id: endingId,
    title: endingTitle,
    achievedAt: now,
    sessionId,
    turnsToComplete: turns,
    finalAct,
  });

  // Update stats
  gallery.stats.totalGamesCompleted++;
  gallery.stats.totalTurnsPlayed += turns;
  if (!gallery.stats.firstGameAt) {
    gallery.stats.firstGameAt = now;
  }
  gallery.stats.lastGameAt = now;

  // Calculate favorite ending
  const endingCounts: Record<string, number> = {};
  for (const ending of gallery.endings) {
    endingCounts[ending.id] = (endingCounts[ending.id] || 0) + 1;
  }
  let maxCount = 0;
  for (const [id, count] of Object.entries(endingCounts)) {
    if (count > maxCount) {
      maxCount = count;
      gallery.stats.favoriteEnding = id;
    }
  }

  saveGallery(gallery);
}

/**
 * Record achievements earned in a game session
 */
export function recordAchievements(
  achievementIds: string[],
  sessionId: string
): void {
  const gallery = loadGallery();
  const now = new Date().toISOString();

  for (const id of achievementIds) {
    if (!gallery.achievements[id]) {
      gallery.achievements[id] = {
        id,
        firstAchievedAt: now,
        timesAchieved: 1,
        lastSessionId: sessionId,
      };
    } else {
      gallery.achievements[id].timesAchieved++;
      gallery.achievements[id].lastSessionId = sessionId;
    }
  }

  saveGallery(gallery);
}

/**
 * Get gallery summary for display
 */
export interface GallerySummary {
  totalGamesCompleted: number;
  totalTurnsPlayed: number;
  uniqueEndingsUnlocked: number;
  totalEndingTypes: number;
  uniqueAchievementsUnlocked: number;
  totalAchievementTypes: number;
  favoriteEnding: string | null;
  recentEndings: Array<{ title: string; date: string }>;
  achievementList: Array<{ id: string; count: number }>;
}

export function getGallerySummary(): GallerySummary {
  const gallery = loadGallery();

  // Count unique endings
  const uniqueEndings = new Set(gallery.endings.map(e => e.id));

  // Get recent endings (last 5)
  const recentEndings = gallery.endings
    .slice(-5)
    .reverse()
    .map(e => ({
      title: e.title,
      date: new Date(e.achievedAt).toLocaleDateString(),
    }));

  // Build achievement list
  const achievementList = Object.values(gallery.achievements)
    .sort((a, b) => b.timesAchieved - a.timesAchieved)
    .map(a => ({ id: a.id, count: a.timesAchieved }));

  return {
    totalGamesCompleted: gallery.stats.totalGamesCompleted,
    totalTurnsPlayed: gallery.stats.totalTurnsPlayed,
    uniqueEndingsUnlocked: uniqueEndings.size,
    totalEndingTypes: TOTAL_ENDING_TYPES,
    uniqueAchievementsUnlocked: Object.keys(gallery.achievements).length,
    totalAchievementTypes: ALL_ACHIEVEMENTS.length, // Dynamic from source!
    favoriteEnding: gallery.stats.favoriteEnding,
    recentEndings,
    achievementList,
  };
}

/**
 * Check if a specific ending has been unlocked
 */
export function hasUnlockedEnding(endingId: string): boolean {
  const gallery = loadGallery();
  return gallery.endings.some(e => e.id === endingId);
}

/**
 * Check if a specific achievement has been earned (ever)
 */
export function hasEarnedAchievement(achievementId: string): boolean {
  const gallery = loadGallery();
  return achievementId in gallery.achievements;
}

/**
 * Get the full gallery data (for advanced display)
 */
export function getFullGallery(): GalleryData {
  return loadGallery();
}
