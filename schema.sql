-- JobEval Cloudflare D1 Sync Schema

CREATE TABLE IF NOT EXISTS sync_rooms (
  room_id TEXT PRIMARY KEY,
  auth_hash TEXT,
  profile_encrypted TEXT,
  profile_updated_at INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch() * 1000),
  updated_at INTEGER DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS sync_jobs (
  room_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  job_encrypted TEXT NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch() * 1000),
  PRIMARY KEY (room_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_room_updated ON sync_jobs (room_id, updated_at);
