import { describe, it, expect, beforeEach, vi } from "vitest";
import { cloudSyncService } from "@/services/sync/cloudSyncService";
import { storageAdapter } from "@/services/storage/storageAdapter";
import { DEFAULT_USER_PROFILE } from "@/core/constants/defaultProfile";

describe("Cloud Real-Time Sync Service & StorageAdapter Integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("generates a human-readable 4-digit room code with JE- prefix", () => {
    const roomId = cloudSyncService.generateRoomId();
    expect(roomId).toMatch(/^JE-\d{4}$/);
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
});
