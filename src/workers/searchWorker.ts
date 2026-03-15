/// <reference lib="webworker" />

import { getSearchIndex, type SearchIndex } from '../lib/dataClient';
import { EMPTY_RANKED_RESULTS, searchIndex, type RankedSearchResult } from '../lib/search';
import type { SearchWorkerRequest, SearchWorkerResponse } from '../lib/searchWorkerTypes';

const CACHE_LIMIT = 120;

const workerScope = self as DedicatedWorkerGlobalScope;
let cachedIndexPromise: Promise<SearchIndex> | null = null;
const rankedCache = new Map<string, RankedSearchResult>();

function post(message: SearchWorkerResponse) {
  workerScope.postMessage(message);
}

function readCache(key: string): RankedSearchResult | undefined {
  const cached = rankedCache.get(key);
  if (!cached) {
    return undefined;
  }
  rankedCache.delete(key);
  rankedCache.set(key, cached);
  return cached;
}

function writeCache(key: string, ranked: RankedSearchResult) {
  if (rankedCache.has(key)) {
    rankedCache.delete(key);
  }
  rankedCache.set(key, ranked);
  if (rankedCache.size > CACHE_LIMIT) {
    const oldest = rankedCache.keys().next().value;
    if (oldest) {
      rankedCache.delete(oldest);
    }
  }
}

function loadSearchIndex(): Promise<SearchIndex> {
  if (!cachedIndexPromise) {
    cachedIndexPromise = getSearchIndex();
  }
  return cachedIndexPromise;
}

async function warmup() {
  try {
    await loadSearchIndex();
    post({ type: 'ready' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to warm up search worker';
    post({ type: 'error', message });
  }
}

async function handleSearch(requestId: number, query: string) {
  const normalized = query.trim();
  if (!normalized) {
    post({ type: 'result', requestId, ranked: EMPTY_RANKED_RESULTS });
    return;
  }

  try {
    const cacheKey = normalized.toLowerCase();
    const cached = readCache(cacheKey);
    if (cached) {
      post({ type: 'result', requestId, ranked: cached });
      return;
    }

    const index = await loadSearchIndex();
    const ranked = searchIndex(index, normalized);
    writeCache(cacheKey, ranked);
    post({ type: 'result', requestId, ranked });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search worker query failed';
    post({ type: 'error', requestId, message });
  }
}

workerScope.addEventListener('message', (event: MessageEvent<SearchWorkerRequest>) => {
  const message = event.data;
  if (!message) {
    return;
  }

  if (message.type === 'warmup') {
    void warmup();
    return;
  }

  if (message.type === 'search') {
    void handleSearch(message.requestId, message.query);
  }
});

export {};
