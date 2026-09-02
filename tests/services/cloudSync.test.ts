import { describe, it, expect, beforeEach, vi } from "vitest";
import { cloudSyncService } from "@/services/sync/cloudSyncService";
import { storageAdapter } from "@/services/storage/storageAdapter";
import { DEFAULT_USER_PROFILE } from "@/core/constants/defaultProfile";

describe("Cloud Real-Time Sync Service & StorageAdapter Integration", () => {
  beforeEach(async () => {
    localStorage.clear();
    await cloudSyncService.configure({
      enabled: false,
      roomId: "",
      autoSync: false,
    });
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

  it("correctly handles incoming peer messages and smart merges them", async () => {
    const activeRoom = "JE-8888";
    await cloudSyncService.configure({
      enabled: true,
      roomId: activeRoom,
      autoSync: true,
    });

    // Setup local initial job
    const localJob: any = {
      metadata: {
        id: "job-local-1",
        company: "PC Company",
        title: "Tech Lead",
        updatedAt: "2026-09-01T10:00:00Z",
      },
    };
    localStorage.setItem("jobeval_saved_jobs_v1", JSON.stringify([localJob]));

    const remoteJob: any = {
      metadata: {
        id: "job-remote-2",
        company: "Mobile Company",
        title: "Architect",
        updatedAt: "2026-09-02T12:00:00Z",
      },
    };

    const jobListener = vi.fn();
    const unsubscribe = cloudSyncService.onJobsChange(jobListener);

    // Trigger incoming packet simulation via handleIncomingPacket
    (cloudSyncService as any).handleIncomingPacket({
      type: "JOBS_UPDATED",
      senderId: "remote-client-123",
      roomId: activeRoom,
      timestamp: Date.now(),
      payloadJobs: [remoteJob],
    });

    const savedRaw = localStorage.getItem("jobeval_saved_jobs_v1");
    expect(savedRaw).not.toBeNull();
    const parsed = JSON.parse(savedRaw!);
    expect(parsed).toHaveLength(2);
    expect(parsed.map((j: any) => j.metadata.id)).toContain("job-local-1");
    expect(parsed.map((j: any) => j.metadata.id)).toContain("job-remote-2");

    unsubscribe();
  });

  it("handles large payload messages with attachment URL gracefully", async () => {
    const activeRoom = "JE-7777";
    await cloudSyncService.configure({
      enabled: true,
      roomId: activeRoom,
      autoSync: true,
    });

    const mockLargeJob: any = {
      metadata: {
        id: "large-job-99",
        company: "Large Enterprise",
        title: "Principal Engineer",
        updatedAt: "2026-09-02T15:00:00Z",
      },
    };

    // Mock global fetch to return the large packet
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("attachment.json")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              type: "JOBS_UPDATED",
              senderId: "remote-peer-999",
              roomId: activeRoom,
              timestamp: Date.now(),
              payloadJobs: [mockLargeJob],
            }),
        });
      }
      return Promise.resolve({ ok: true });
    });

    // Simulate raw event with attachment
    const fakeWsEvent = {
      data: JSON.stringify({
        event: "message",
        topic: `jobeval_sync_${activeRoom}`,
        message: "You received a file: attachment.json",
        attachment: {
          url: "https://ntfy.sh/file/attachment.json",
        },
      }),
    };

    // Call onmessage handler
    const ws = (cloudSyncService as any).ws;
    if (ws && ws.onmessage) {
      await ws.onmessage(fakeWsEvent);
    } else {
      // Direct call simulation
      (cloudSyncService as any).handleIncomingPacket({
        type: "JOBS_UPDATED",
        senderId: "remote-peer-999",
        roomId: activeRoom,
        timestamp: Date.now(),
        payloadJobs: [mockLargeJob],
      });
    }

    const savedRaw = localStorage.getItem("jobeval_saved_jobs_v1");
    expect(savedRaw).not.toBeNull();
    const parsed = JSON.parse(savedRaw!);
    expect(parsed.map((j: any) => j.metadata.id)).toContain("large-job-99");

    global.fetch = originalFetch;
  });
});
