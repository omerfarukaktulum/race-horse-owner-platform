/**
 * TJK Scraper Service
 * Separate service for Playwright operations
 * Deploy to Railway/Render for full Playwright support
 */

import express from 'express';
import cors from 'cors';
// Import from the main app's lib folder
// Path: services/tjk-scraper -> ../../lib/tjk-api
import { searchTJKHorsesPlaywright } from '../../lib/tjk-api';

const app = express();

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

    // Call searchTJKHorsesPlaywright
    // The function expects: searchTJKHorsesPlaywright(ownerName, ownerId)
    const horses = await searchTJKHorsesPlaywright(ownerName, ownerIdToUse);
    
    console.log('[Scraper Service] Found', horses.length, 'horses');
    res.json({ horses });
  } catch (error: any) {
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
    res.status(501).json({ error: 'Not implemented yet' });
  } catch (error: any) {
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

    // TODO: Import and run cronjob
    res.status(501).json({ error: 'Not implemented yet' });
  } catch (error: any) {
    console.error('[Scraper Service] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`[TJK Scraper Service] Running on port ${PORT}`);
});

