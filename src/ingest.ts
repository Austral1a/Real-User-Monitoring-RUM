export interface IngestStats {
  stored: number;
  originRejected: number;
  rateLimited: number;
  invalid: number;
  lastBeaconAt: number | null;
}

export interface IngestCounter {
  snapshot(): IngestStats;
  stored(count: number, at: number): void;
  originRejected(): void;
  rateLimited(): void;
  invalid(): void;
}

export function createIngestCounter(): IngestCounter {
  const stats: IngestStats = {
    stored: 0,
    originRejected: 0,
    rateLimited: 0,
    invalid: 0,
    lastBeaconAt: null,
  };

  return {
    snapshot() {
      return { ...stats };
    },
    stored(count, at) {
      stats.stored += count;
      stats.lastBeaconAt = at;
    },
    originRejected() {
      stats.originRejected += 1;
    },
    rateLimited() {
      stats.rateLimited += 1;
    },
    invalid() {
      stats.invalid += 1;
    },
  };
}
