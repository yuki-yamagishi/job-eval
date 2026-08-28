import { describe, it, expect, beforeEach } from "vitest";
import { LocalStorageAdapter } from "@/services/storage/storageAdapter";
import { TEST_MOCK_PROFILE } from "../fixtures/sampleProfile";

describe("LocalStorageAdapter", () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter();
  });

  it("seeds and loads default profile when storage is empty", async () => {
    const profile = await adapter.loadProfile();
    expect(profile).toBeDefined();
    expect(profile.skills.length).toBeGreaterThan(0);
    expect(profile.conditions.targetSalaryMin).toBeGreaterThan(0);
  });

  it("saves and loads updated profile correctly", async () => {
    await adapter.saveProfile(TEST_MOCK_PROFILE);
    const loaded = await adapter.loadProfile();
    expect(loaded.id).toBe(TEST_MOCK_PROFILE.id);
    expect(loaded.name).toBe("テストユーザー");
    expect(loaded.apiSettings.geminiApiKey).toBe("test-api-key-12345");
  });

  it("resets profile back to default", async () => {
    await adapter.saveProfile(TEST_MOCK_PROFILE);
    const reset = await adapter.resetProfile();
    expect(reset.name).toBe("候補者 (Candidate)");
  });
});
