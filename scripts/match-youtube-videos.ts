/**
 * YouTube Video Matcher for Consignatarias
 * 
 * Runs AFTER the daily scraper (14:00 ART)
 * Only searches for videos of consignatarias with remates TODAY
 * 
 * Usage: npx ts-node scripts/match-youtube-videos.ts
 * Requires: YOUTUBE_API_KEY env var
 */

import fs from 'fs';
import path from 'path';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

// Load channel mappings
const channelsPath = path.join(__dirname, '../src/lib/data/youtube-channels.json');
const channelMap: Record<string, { channelId: string; channelUrl: string; channelTitle: string; subscribers?: number }> = 
  JSON.parse(fs.readFileSync(channelsPath, 'utf-8'));

// Load remates
const rematesPath = path.join(__dirname, '../src/lib/data/remates.json');

interface Remate {
  id: number;
  date: string; // YYYY-MM-DD
  consignatariaName: string;
  consignatariaSlug: string;
  location?: string;
  youtubeUrl?: string | null;
  status?: string;
}

interface YouTubeSearchResult {
  items: Array<{
    id: { videoId: string };
    snippet: {
      title: string;
      publishedAt: string;
      liveBroadcastContent: 'live' | 'upcoming' | 'none';
    };
  }>;
}

function getToday(): string {
  const now = new Date();
  // Adjust for Argentina timezone (GMT-3)
  now.setHours(now.getHours() - 3);
  return now.toISOString().split('T')[0];
}

function normalizeSlug(slug: string): string {
  // Handle variations: "bressan-y-cia" vs "bressan" etc.
  return slug.toLowerCase().replace(/-s-?r-?l$/, '').replace(/-s-?a$/, '').replace(/-y-cia$/, '');
}

function findChannelForSlug(slug: string): { channelId: string; channelTitle: string } | null {
  // Direct match
  if (channelMap[slug]) {
    return { channelId: channelMap[slug].channelId, channelTitle: channelMap[slug].channelTitle };
  }
  
  // Normalized match
  const normalizedInput = normalizeSlug(slug);
  for (const [key, value] of Object.entries(channelMap)) {
    if (normalizeSlug(key) === normalizedInput) {
      return { channelId: value.channelId, channelTitle: value.channelTitle };
    }
  }
  
  return null;
}

async function searchChannelForVideo(
  channelId: string,
  remate: Remate
): Promise<string | null> {
  if (!YOUTUBE_API_KEY) {
    console.error('❌ YOUTUBE_API_KEY not set');
    return null;
  }

  // Search for videos/streams from today in this channel
  const params = new URLSearchParams({
    part: 'snippet',
    channelId,
    type: 'video',
    order: 'date',
    maxResults: '5',
    publishedAfter: `${remate.date}T00:00:00Z`,
    publishedBefore: `${remate.date}T23:59:59Z`,
    key: YOUTUBE_API_KEY,
  });

  try {
    const response = await fetch(`${YOUTUBE_SEARCH_URL}?${params}`);
    const data: YouTubeSearchResult = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    // Find best match: prefer live/upcoming, or title containing location
    const ubicacion = remate.location?.toLowerCase() || '';
    
    for (const item of data.items) {
      const title = item.snippet.title.toLowerCase();
      
      // Priority 1: Live or upcoming stream
      if (item.snippet.liveBroadcastContent === 'live' || 
          item.snippet.liveBroadcastContent === 'upcoming') {
        return `https://www.youtube.com/watch?v=${item.id.videoId}`;
      }
      
      // Priority 2: Title contains location
      if (ubicacion && title.includes(ubicacion)) {
        return `https://www.youtube.com/watch?v=${item.id.videoId}`;
      }
    }

    // Fallback: Return most recent video from today
    return `https://www.youtube.com/watch?v=${data.items[0].id.videoId}`;
  } catch (error) {
    console.error(`❌ Error searching channel ${channelId}:`, error);
    return null;
  }
}

async function main() {
  console.log('🎬 YouTube Video Matcher');
  console.log('========================\n');

  if (!YOUTUBE_API_KEY) {
    console.error('❌ Set YOUTUBE_API_KEY environment variable');
    process.exit(1);
  }

  // Load remates
  const remates: Remate[] = JSON.parse(fs.readFileSync(rematesPath, 'utf-8'));
  const today = getToday();
  
  console.log(`📅 Today: ${today}`);
  console.log(`📊 Total remates: ${remates.length}`);

  // Filter remates for today (or upcoming if testing)
  const todayRemates = remates.filter(r => r.date === today && r.status !== 'completed');
  console.log(`🎯 Remates today: ${todayRemates.length}\n`);

  if (todayRemates.length === 0) {
    console.log('No remates today. Exiting.');
    return;
  }

  // Match with YouTube channels
  let matched = 0;
  let searched = 0;
  const updates: Array<{ id: number; youtubeUrl: string }> = [];

  for (const remate of todayRemates) {
    const channel = findChannelForSlug(remate.consignatariaSlug);
    
    if (!channel) {
      console.log(`⏭️  ${remate.consignatariaName} — no channel mapped`);
      continue;
    }

    console.log(`🔍 ${remate.consignatariaName} → searching ${channel.channelTitle}...`);
    searched++;

    const videoUrl = await searchChannelForVideo(channel.channelId, remate);
    
    if (videoUrl) {
      console.log(`   ✅ Found: ${videoUrl}`);
      updates.push({ id: remate.id, youtubeUrl: videoUrl });
      matched++;
    } else {
      console.log(`   ❌ No video found for today`);
    }

    // Rate limit: 1 request per second
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n📊 Results:`);
  console.log(`   Searched: ${searched}`);
  console.log(`   Matched: ${matched}`);

  if (updates.length > 0) {
    // Update remates.json with YouTube URLs
    const updatedRemates = remates.map(r => {
      const update = updates.find(u => u.id === r.id);
      if (update) {
        return { ...r, youtubeUrl: update.youtubeUrl };
      }
      return r;
    });

    fs.writeFileSync(rematesPath, JSON.stringify(updatedRemates, null, 2));
    console.log(`\n✅ Updated remates.json with ${updates.length} YouTube URLs`);
  }
}

main().catch(console.error);
