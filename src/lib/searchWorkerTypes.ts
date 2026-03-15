import type { RankedSearchResult } from "./search";

export type SearchWorkerRequest =
  | {
      type: "warmup";
    }
  | {
      type: "search";
      requestId: number;
      query: string;
    };

export type SearchWorkerResponse =
  | {
      type: "ready";
    }
  | {
      type: "result";
      requestId: number;
      ranked: RankedSearchResult;
    }
  | {
      type: "error";
      requestId?: number;
      message: string;
    };
