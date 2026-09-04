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

    // 1. PULL ACTION (SSoT Full Snapshot)
    if (action === "pull") {
      // Fetch room profile
      const room = await env.DB.prepare(
        "SELECT profile_encrypted, profile_updated_at FROM sync_rooms WHERE room_id = ?"
      )
        .bind(cleanRoomId)
        .first<{ profile_encrypted: string | null; profile_updated_at: number }>();

      // Fetch all active jobs for the room ordered by updated_at desc
      const jobsResult = await env.DB.prepare(
        "SELECT job_id, job_encrypted, updated_at FROM sync_jobs WHERE room_id = ? ORDER BY updated_at DESC"
      )
        .bind(cleanRoomId)
        .all<{ job_id: string; job_encrypted: string; updated_at: number }>();

      return new Response(
        JSON.stringify({
          success: true,
          exists: Boolean(room),
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

    // 2. PUSH ACTION (Snapshot Sync with Deletion Support)
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
               updated_at = excluded.updated_at`
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

      // Sync jobs snapshot if provided
      if (Array.isArray(jobs)) {
        if (jobs.length === 0) {
          // All jobs were deleted locally -> delete all jobs for this room in D1
          statements.push(
            env.DB.prepare("DELETE FROM sync_jobs WHERE room_id = ?").bind(cleanRoomId)
          );
        } else {
          // 1. Upsert provided active jobs
          for (const job of jobs) {
            if (job.jobId && job.encrypted) {
              statements.push(
                env.DB.prepare(
                  `INSERT INTO sync_jobs (room_id, job_id, job_encrypted, updated_at)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(room_id, job_id) DO UPDATE SET
                     job_encrypted = excluded.job_encrypted,
                     updated_at = excluded.updated_at`
                ).bind(cleanRoomId, job.jobId, job.encrypted, job.updatedAt || now)
              );
            }
          }

          // 2. Delete jobs in D1 that are not present in the incoming active jobs list
          const activeJobIds = jobs.map((j) => j.jobId).filter(Boolean);
          if (activeJobIds.length > 0) {
            const placeholders = activeJobIds.map(() => "?").join(",");
            statements.push(
              env.DB.prepare(
                `DELETE FROM sync_jobs WHERE room_id = ? AND job_id NOT IN (${placeholders})`
              ).bind(cleanRoomId, ...activeJobIds)
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
