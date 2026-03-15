import { getSearchIndex } from './dataClient';
import { EMPTY_RANKED_RESULTS, searchIndex, type RankedSearchResult } from './search';
import type { SearchWorkerRequest, SearchWorkerResponse } from './searchWorkerTypes';

type PendingRequest = {
  resolve: (ranked: RankedSearchResult) => void;
  reject: (error: Error) => void;
};

let workerInstance: Worker | null = null;
let workerUnavailable = false;
let warmupPosted = false;
let nextRequestId = 1;
const pendingRequests = new Map<number, PendingRequest>();

function rejectPendingRequests(error: Error) {
  for (const [, pending] of pendingRequests) {
    pending.reject(error);
  }
  pendingRequests.clear();
}

function handleWorkerMessage(event: MessageEvent<SearchWorkerResponse>) {
  const message = event.data;
  if (!message) {
    return;
  }

  if (message.type === 'ready') {
    return;
  }

  if (message.type === 'result') {
    const pending = pendingRequests.get(message.requestId);
    if (!pending) {
      return;
    }
    pendingRequests.delete(message.requestId);
    pending.resolve(message.ranked);
    return;
  }

  const error = new Error(message.message || 'Search worker failed');
  if (message.requestId !== undefined) {
    const pending = pendingRequests.get(message.requestId);
    if (!pending) {
      return;
    }
    pendingRequests.delete(message.requestId);
    pending.reject(error);
    return;
  }

  workerUnavailable = true;
  rejectPendingRequests(error);
}

function getWorker(): Worker | null {
  if (workerUnavailable) {
    return null;
  }
  if (workerInstance) {
    return workerInstance;
  }
  if (typeof Worker === 'undefined') {
    workerUnavailable = true;
    return null;
  }

  try {
    const worker = new Worker(new URL('../workers/searchWorker.ts', import.meta.url), {
      type: 'module',
    });
    worker.addEventListener('message', handleWorkerMessage);
    worker.addEventListener('error', () => {
      workerUnavailable = true;
      rejectPendingRequests(new Error('Search worker crashed'));
    });
    workerInstance = worker;
    return worker;
  } catch {
    workerUnavailable = true;
    return null;
  }
}

async function searchOnMainThread(query: string): Promise<RankedSearchResult> {
  const normalized = query.trim();
  if (!normalized) {
    return EMPTY_RANKED_RESULTS;
  }
  const index = await getSearchIndex();
  return searchIndex(index, normalized);
}

export function warmSearchWorker(): void {
  if (warmupPosted) {
    return;
  }
  const worker = getWorker();
  if (!worker) {
    return;
  }
  warmupPosted = true;
  const message: SearchWorkerRequest = { type: 'warmup' };
  worker.postMessage(message);
}

export async function rankSearchQuery(query: string): Promise<RankedSearchResult> {
  const normalized = query.trim();
  if (!normalized) {
    return EMPTY_RANKED_RESULTS;
  }

  const worker = getWorker();
  if (!worker) {
    return searchOnMainThread(normalized);
  }

  const requestId = nextRequestId++;
  const requestMessage: SearchWorkerRequest = {
    type: 'search',
    requestId,
    query: normalized,
  };

  try {
    return await new Promise<RankedSearchResult>((resolve, reject) => {
      pendingRequests.set(requestId, { resolve, reject });
      worker.postMessage(requestMessage);
    });
  } catch {
    return searchOnMainThread(normalized);
  }
}
