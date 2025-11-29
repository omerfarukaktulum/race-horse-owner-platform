/**
 * TJK Scraper Service
 * Separate service for Playwright operations
 * Deploy to Railway/Render for full Playwright support
 */

const express = require('express');
const cors = require('cors');
const app = express();

// Import Playwright functions (copy from main app)
// For now, we'll structure this to call the same functions

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'change-me-in-production';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'tjk-scraper' });
});

/**
 * POST /api/tjk/fetch-horses
 * Fetch horses for an owner (initial onboarding)
 */
app.post('/api/tjk/fetch-horses', async (req, res) => {
  try {
    const { ownerName, ownerId, ownerRef } = req.body;

    // Use ownerId if provided, otherwise fall back to ownerRef
    const ownerIdToUse = ownerId || ownerRef;

    if (!ownerName || !ownerIdToUse) {
      return res.status(400).json({ error: 'ownerName and ownerId (or ownerRef) required' });
    }

    console.log('[Scraper Service] Fetching horses for:', { ownerName, ownerId: ownerIdToUse });

    // Import and call searchTJKHorsesPlaywright
    // The function expects: searchTJKHorsesPlaywright(ownerName, ownerId)
    // Note: This requires the lib/tjk-api.ts to be compiled or we need to use ts-node
    // For now, try to import from the main app's lib folder (relative path)
    try {
      // Try to import from compiled JS or use ts-node/tsx
      // Path: services/tjk-scraper -> ../../lib/tjk-api
      const tjkApi = require('../../lib/tjk-api');
      const horses = await tjkApi.searchTJKHorsesPlaywright(ownerName, ownerIdToUse);
      
      console.log('[Scraper Service] Found', horses.length, 'horses');
      res.json({ horses });
    } catch (importError) {
      console.error('[Scraper Service] Failed to import tjk-api:', importError.message);
      // Fallback: Return error with instructions
      res.status(500).json({ 
        error: 'Playwright function not available. Please ensure lib/tjk-api.ts is compiled or use ts-node.',
        details: importError.message 
      });
    }
  } catch (error) {
    console.error('[Scraper Service] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tjk/fetch-horse-details
 * Fetch detailed data for a horse
 */
app.post('/api/tjk/fetch-horse-details', async (req, res) => {
  try {
    const { horseId, horseName } = req.body;

    if (!horseId) {
      return res.status(400).json({ error: 'horseId required' });
    }

    // TODO: Import and call fetchTJKHorseDetail, fetchTJKHorseGallops, fetchTJKPedigree
    const [detail, gallops, pedigree] = await Promise.all([
      fetchHorseDetail(horseId),
      fetchHorseGallops(horseId, horseName),
      fetchPedigree(horseId, horseName),
    ]);

    res.json({ detail, gallops, pedigree });
  } catch (error) {
    console.error('[Scraper Service] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tjk/update-all
 * Nightly cronjob - update all horses (delta updates)
 * Requires API_KEY for security
 */
app.post('/api/tjk/update-all', async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (apiKey !== API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Import and run cronjob
    const { runNightlyUpdate } = require('./cronjob');
    const result = await runNightlyUpdate();

    res.json(result);
  } catch (error) {
    console.error('[Scraper Service] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Placeholder functions - will be replaced with actual imports
async function fetchHorses(ownerName, ownerRef) {
  // TODO: Import from lib/tjk-api.ts
  return [];
}

async function fetchHorseDetail(horseId) {
  // TODO: Import from lib/tjk-horse-detail-scraper.ts
  return null;
}

async function fetchHorseGallops(horseId, horseName) {
  // TODO: Import from lib/tjk-gallops-scraper.ts
  return [];
}

async function fetchPedigree(horseId, horseName) {
  // TODO: Import from lib/tjk-pedigree-scraper.ts
  return {};
}

app.listen(PORT, () => {
  console.log(`[TJK Scraper Service] Running on port ${PORT}`);
});

