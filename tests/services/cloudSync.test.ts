import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cloudSyncService } from "@/services/sync/cloudSyncService";
import { storageAdapter } from "@/services/storage/storageAdapter";
import { DEFAULT_USER_PROFILE } from "@/core/constants/defaultProfile";
import { encryptJson } from "@/core/crypto/e2eeCrypto";

describe("Cloud Real-Time Sync Service & StorageAdapter Integration", () => {
  const originalFetch = global.fetch;

  beforeEach(async () => {
    localStorage.clear();
    await cloudSyncService.configure({
      enabled: false,
      roomId: "",
      autoSync: false,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("generates a human-readable room code with JE- prefix and secure suffix", () => {
    const roomId = cloudSyncService.generateRoomId();
    expect(roomId).toMatch(/^JE-\d{4}(-[A-Z0-9]{4})?$/);
  });

  it("updates status when configuring sync room", async () => {
    const testRoom = "JE-9999";
    await cloudSyncService.configure({
      enabled: true,
      roomId: testRoom,
      autoSync: true,
    });

    const status = cloudSyncService.getStatus();
    expect(status.roomId).toBe(testRoom);
  });

  it("notifies profile listeners when profile is updated in storage", async () => {
    const profileCallback = vi.fn();
    const unsubscribe = storageAdapter.subscribeProfile!(profileCallback);

    const updatedProfile = {
      ...DEFAULT_USER_PROFILE,
      name: "Sync Test User",
    };

    await storageAdapter.saveProfile(updatedProfile);

    expect(profileCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Sync Test User",
      })
    );

    unsubscribe();
  });

  it("notifies job listeners when job is added or deleted", async () => {
    const jobCallback = vi.fn();
    const unsubscribe = storageAdapter.subscribeJobs!(jobCallback);

    const mockJob: any = {
      metadata: {
        id: "sync-job-1",
        company: "Cloud Sync Corp",
        title: "Staff Engineer",
        status: "一次面接",
      },
      scoreBreakdown: {
        skillMatchRatio: 80,
        conditionMatchRatio: 80,
        growthPotentialRatio: 80,
        cultureFitRatio: 80,
      },
    };

    await storageAdapter.saveJob(mockJob);
    expect(jobCallback).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          metadata: expect.objectContaining({ id: "sync-job-1" }),
        }),
      ])
    );

    await storageAdapter.deleteJob("sync-job-1");
    expect(jobCallback).toHaveBeenCalledWith([]);

    unsubscribe();
  });

  it("correctly handles incoming DATA_UPDATED peer signals and pulls authoritative D1 snapshot", async () => {
    const activeRoom = "JE-8888";

    const remoteJob: any = {
      metadata: {
        id: "job-cloud-1",
        company: "Cloud Company",
        title: "Staff Architect",
        updatedAt: "2026-09-04T12:00:00Z",
      },
    };
    const encryptedJob = await encryptJson(remoteJob, activeRoom);

    // Mock fetch for D1 pull
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (typeof options?.body === "string" && options.body.includes('"action":"pull"')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              exists: true,
              profile: null,
              jobs: [
                {
                  jobId: "job-cloud-1",
                  encrypted: encryptedJob,
                  updatedAt: Date.now(),
                },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
    });

    await cloudSyncService.configure({
      enabled: true,
      roomId: activeRoom,
      autoSync: true,
    });

    const jobListener = vi.fn();
    const unsubscribe = cloudSyncService.onJobsChange(jobListener);

    // Trigger incoming DATA_UPDATED signal simulation
    (cloudSyncService as any).handleIncomingPacket({
      type: "DATA_UPDATED",
      senderId: "remote-client-123",
      roomId: activeRoom,
      timestamp: Date.now(),
    });

    // Wait a tick for async pullFromD1 to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    const savedRaw = localStorage.getItem("jobeval_saved_jobs_v1");
    expect(savedRaw).not.toBeNull();
    const parsed = JSON.parse(savedRaw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].metadata.id).toBe("job-cloud-1");
    expect(parsed[0].metadata.title).toBe("Staff Architect");

    unsubscribe();
  });

  it("replaces local state cleanly with authoritative cloud profile snapshot on pull", async () => {
    const activeRoom = "JE-7777";

    const cloudProfile: any = {
      ...DEFAULT_USER_PROFILE,
      id: "user-cloud-99",
      name: "Cloud Architect",
      updatedAt: "2026-09-04T12:00:00Z",
    };
    const encryptedProfile = await encryptJson(cloudProfile, activeRoom);

    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (typeof options?.body === "string" && options.body.includes('"action":"pull"')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              exists: true,
              profile: {
                encrypted: encryptedProfile,
                updatedAt: Date.now(),
              },
              jobs: [],
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
    });

    // Seed local with default profile
    localStorage.setItem("jobeval_user_profile_v1", JSON.stringify(DEFAULT_USER_PROFILE));

    await cloudSyncService.configure({
      enabled: true,
      roomId: activeRoom,
      autoSync: true,
    });

    await cloudSyncService.pullFromD1(activeRoom);

    const savedRaw = localStorage.getItem("jobeval_user_profile_v1");
    expect(savedRaw).not.toBeNull();
    const parsed = JSON.parse(savedRaw!);
    expect(parsed.id).toBe("user-cloud-99");
    expect(parsed.name).toBe("Cloud Architect");
  });

  it("does not overwrite local jobs when connecting to a brand new empty cloud room (exists: false)", async () => {
    const activeRoom = "JE-NEW-1234";

    const localJob: any = {
      metadata: {
        id: "local-job-safe",
        company: "My Local Company",
        title: "Engineer",
      },
    };
    localStorage.setItem("jobeval_saved_jobs_v1", JSON.stringify([localJob]));

    const pushCalls: any[] = [];
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (typeof options?.body === "string") {
        const parsed = JSON.parse(options.body);
        if (parsed.action === "pull") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                exists: false, // New uncreated room
                profile: null,
                jobs: [],
              }),
          });
        }
        if (parsed.action === "push") {
          pushCalls.push(parsed);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
    });

    await cloudSyncService.configure({
      enabled: true,
      roomId: activeRoom,
      autoSync: true,
    });

    // Local jobs must NOT be wiped!
    const savedRaw = localStorage.getItem("jobeval_saved_jobs_v1");
    expect(savedRaw).not.toBeNull();
    const parsed = JSON.parse(savedRaw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].metadata.id).toBe("local-job-safe");

    // Must have pushed local jobs up to populate the empty room
    expect(pushCalls.length).toBeGreaterThan(0);
    expect(pushCalls[0].action).toBe("push");
  });
});
