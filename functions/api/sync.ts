/**
 * Cloudflare Pages Function: /api/sync
 * Secure E2EE Cloud Sync API backed by Cloudflare D1
 */

interface Env {
  DB: D1Database;
}

interface PullRequestBody {
  action: "pull";
  roomId: string;
  since?: number;
}

interface PushRequestBody {
  action: "push";
  roomId: string;
  authHash?: string;
  profile?: {
    encrypted: string;
    updatedAt: number;
  };
  jobs?: Array<{
    jobId: string;
    encrypted: string;
    updatedAt: number;
  }>;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ success: false, error: "Database not configured" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await request.json()) as PullRequestBody | PushRequestBody;
    const { action, roomId } = body;

    if (!roomId || typeof roomId !== "string") {
      return new Response(JSON.stringify({ success: false, error: "Invalid roomId" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const cleanRoomId = roomId.trim().toUpperCase();

    // 1. PULL ACTION
    if (action === "pull") {
      const since = typeof body.since === "number" ? body.since : 0;

      // Fetch room profile
      const room = await env.DB.prepare(
        "SELECT profile_encrypted, profile_updated_at FROM sync_rooms WHERE room_id = ?"
      )
        .bind(cleanRoomId)
        .first<{ profile_encrypted: string | null; profile_updated_at: number }>();

      // Fetch updated jobs since timestamp
      const jobsResult = await env.DB.prepare(
        "SELECT job_id, job_encrypted, updated_at FROM sync_jobs WHERE room_id = ? AND updated_at > ? ORDER BY updated_at ASC"
      )
        .bind(cleanRoomId, since)
        .all<{ job_id: string; job_encrypted: string; updated_at: number }>();

      return new Response(
        JSON.stringify({
          success: true,
          profile: room?.profile_encrypted
            ? {
                encrypted: room.profile_encrypted,
                updatedAt: room.profile_updated_at || 0,
              }
            : null,
          jobs: (jobsResult.results || []).map((j) => ({
            jobId: j.job_id,
            encrypted: j.job_encrypted,
            updatedAt: j.updated_at,
          })),
          serverTime: Date.now(),
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // 2. PUSH ACTION
    if (action === "push") {
      const { authHash, profile, jobs } = body;
      const now = Date.now();
      const statements: D1PreparedStatement[] = [];

      // Upsert room profile if provided
      if (profile && profile.encrypted) {
        statements.push(
          env.DB.prepare(
            `INSERT INTO sync_rooms (room_id, auth_hash, profile_encrypted, profile_updated_at, updated_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(room_id) DO UPDATE SET
               profile_encrypted = excluded.profile_encrypted,
               profile_updated_at = excluded.profile_updated_at,
               updated_at = excluded.updated_at
             WHERE excluded.profile_updated_at >= sync_rooms.profile_updated_at`
          ).bind(cleanRoomId, authHash || null, profile.encrypted, profile.updatedAt || now, now)
        );
      } else {
        // Ensure room exists
        statements.push(
          env.DB.prepare(
            `INSERT INTO sync_rooms (room_id, auth_hash, updated_at)
             VALUES (?, ?, ?)
             ON CONFLICT(room_id) DO UPDATE SET updated_at = excluded.updated_at`
          ).bind(cleanRoomId, authHash || null, now)
        );
      }

      // Upsert jobs if provided
      if (Array.isArray(jobs) && jobs.length > 0) {
        for (const job of jobs) {
          if (job.jobId && job.encrypted) {
            statements.push(
              env.DB.prepare(
                `INSERT INTO sync_jobs (room_id, job_id, job_encrypted, updated_at)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(room_id, job_id) DO UPDATE SET
                   job_encrypted = excluded.job_encrypted,
                   updated_at = excluded.updated_at
                 WHERE excluded.updated_at >= sync_jobs.updated_at`
              ).bind(cleanRoomId, job.jobId, job.encrypted, job.updatedAt || now)
            );
          }
        }
      }

      if (statements.length > 0) {
        await env.DB.batch(statements);
      }

      return new Response(
        JSON.stringify({
          success: true,
          updatedCount: statements.length,
          serverTime: now,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Sync API Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
};
