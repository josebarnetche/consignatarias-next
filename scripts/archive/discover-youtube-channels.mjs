#!/usr/bin/env node
/**
 * YouTube Channel Discovery Script
 *
 * One-time/periodic script to discover YouTube channels for consignatarias.
 * Runs locally (NOT in CI) — requires YOUTUBE_API_KEY env var.
 *
 * Usage:
 *   YOUTUBE_API_KEY=your_key node scripts/discover-youtube-channels.mjs
 *
 * Cost: ~92 × 100 = 9,200 units (within the 10K/day free tier)
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const YOUTUBE_PATH = resolve(__dirname, "../src/lib/data/youtube-channels.json");

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error("Error: Set YOUTUBE_API_KEY environment variable");
  console.error("Usage: YOUTUBE_API_KEY=your_key node scripts/discover-youtube-channels.mjs");
  process.exit(1);
}

// Import PROFILES from consignataria-slugs.ts — read the file and extract names
const slugsPath = resolve(__dirname, "../src/lib/data/consignataria-slugs.ts");
const slugsContent = readFileSync(slugsPath, "utf-8");

// Extract displayName values from the PROFILES array
const displayNames = [];
const nameMatches = slugsContent.matchAll(/displayName:\s*['"]([^'"]+)['"]/g);
for (const m of nameMatches) {
  displayNames.push(m[1]);
}

// Also extract canonicalSlug for mapping
const slugMatches = slugsContent.matchAll(/canonicalSlug:\s*['"]([^'"]+)['"]/g);
const slugs = [];
for (const m of slugMatches) {
  slugs.push(m[1]);
}

console.log(`Found ${displayNames.length} consignatarias to search\n`);

// Load existing channels data
let existing = {};
try {
  existing = JSON.parse(readFileSync(YOUTUBE_PATH, "utf-8"));
} catch {
  // Start fresh
}

async function searchYouTube(query) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=3&q=${encodeURIComponent(query)}&key=${API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  API error: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error(`  Fetch error: ${err.message}`);
    return [];
  }
}

// Search for each consignataria
for (let i = 0; i < displayNames.length; i++) {
  const name = displayNames[i];
  const slug = slugs[i];

  // Skip already confirmed channels
  if (existing[slug]) {
    console.log(`[${i + 1}/${displayNames.length}] ${name} — ALREADY MAPPED (${existing[slug].channelId})`);
    continue;
  }

  console.log(`[${i + 1}/${displayNames.length}] Searching: "${name}"`);
  const results = await searchYouTube(name + " remates ganaderos");

  if (results.length === 0) {
    console.log("  No results found");
  } else {
    for (const r of results) {
      const channelId = r.snippet.channelId;
      const title = r.snippet.channelTitle;
      console.log(`  → ${title} (${channelId})`);
      console.log(`    https://www.youtube.com/channel/${channelId}`);
    }
    console.log(`  To confirm, add to youtube-channels.json:`);
    console.log(`  "${slug}": { "channelId": "${results[0].snippet.channelId}", "channelTitle": "${results[0].snippet.channelTitle}", "channelUrl": "https://www.youtube.com/channel/${results[0].snippet.channelId}", "lastChecked": "${new Date().toISOString().slice(0, 10)}" }`);
  }

  // Delay between requests
  await new Promise((r) => setTimeout(r, 200));
}

console.log("\n--- Done ---");
console.log(`Review the output above and manually add confirmed channels to:`);
console.log(`  ${YOUTUBE_PATH}`);
console.log(`Then run the scraper to fetch latest videos: node scripts/scrape-auctions.mjs`);
