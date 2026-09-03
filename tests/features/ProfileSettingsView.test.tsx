import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProfileSettingsView } from "@/features/profile/ProfileSettingsView";

describe("ProfileSettingsView Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders profile settings form with basic info, skills, and conditions after loading", async () => {
    render(<ProfileSettingsView />);

    // Wait for async load to complete
    const titleElement = await screen.findByText("求職者プロファイル & 判定マトリクス設定");
    expect(titleElement).toBeDefined();

    // Check section headings
    expect(await screen.findByText("基本プロファイル")).toBeDefined();
    expect(await screen.findByText(/スキル・保有資格 & 学習中目標/)).toBeDefined();
    expect(await screen.findByText(/転職希望条件マトリクス/)).toBeDefined();
    expect(await screen.findByText(/NG条件・除外キーワード/)).toBeDefined();
    expect(await screen.findByText(/Google Gemini API 設定/)).toBeDefined();

    // Check tabs and action buttons
    expect(await screen.findByText(/取得済み/)).toBeDefined();
    expect(await screen.findByText(/学習中・取得目標/)).toBeDefined();
    expect(await screen.findByText("接続テスト")).toBeDefined();
    expect((await screen.findAllByText("設定を保存")).length).toBeGreaterThanOrEqual(1);
    expect((await screen.findAllByText(/初期値に戻す|リセット/)).length).toBeGreaterThanOrEqual(1);
  });

  it("allows switching tabs and adding planned certification to target list", async () => {
    render(<ProfileSettingsView />);

    // Switch to planned tab
    const plannedTab = await screen.findByText(/学習中・取得目標/);
    fireEvent.click(plannedTab);

    // Input target cert
    const input = screen.getByPlaceholderText(/目標資格名/);
    fireEvent.change(input, { target: { value: "AZ-400 DevOps Expert" } });

    const addBtn = screen.getByRole("button", { name: /資格を追加/ });
    fireEvent.click(addBtn);

    // Verify it is displayed
    expect(await screen.findByText("AZ-400 DevOps Expert")).toBeDefined();
  });

  it("renders 4-axis weighting profile section and selects presets", async () => {
    render(<ProfileSettingsView />);

    expect(await screen.findByText("4軸評価の重み付けプロファイル (ADR-0004)")).toBeDefined();
    expect(screen.getByText("🚀 リスキリング")).toBeDefined();
    expect(screen.getByText("🌿 カルチャー")).toBeDefined();
    expect(screen.getByText("💰 待遇重視")).toBeDefined();

    // Click Reskilling preset
    const reskillingBtn = screen.getByText("🚀 リスキリング").closest("button");
    if (reskillingBtn) {
      fireEvent.click(reskillingBtn);
    }
    expect(await screen.findByText(/得られる技術・成長機会・サポート体制を最重要視/)).toBeDefined();
  });

  it("calls onRecalculateAllJobs when saving profile with recalculate enabled", async () => {
    const handleRecalculate = vi.fn().mockResolvedValue([]);
    const handleSave = vi.fn().mockResolvedValue(undefined);

    render(
      <ProfileSettingsView
        onSaveProfile={handleSave}
        onRecalculateAllJobs={handleRecalculate}
      />
    );

    const saveBtns = await screen.findAllByText("設定を保存");
    fireEvent.click(saveBtns[0]);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
      expect(handleRecalculate).toHaveBeenCalledTimes(1);
    });
  });

  it("protects user edits from being overridden by background sync (isDirty guard)", async () => {
    const initialProfile = {
      id: "user-1",
      name: "元々の名前",
      title: "エンジニア",
      yearsOfExperience: 5,
      summary: "要約",
      skills: [],
      certifications: [],
      conditions: {
        targetSalaryMin: 800,
        targetSalaryMax: 1000,
        preferredWorkStyle: "フルリモート" as const,
        preferredLocation: "東京",
        maxCommuteMinutes: 60,
        preferredRoles: [],
        ngConditions: [],
      },
      apiSettings: {
        geminiApiKey: "mock-key",
        geminiModel: "gemini-3.6-flash",
      },
      updatedAt: "2026-09-01T10:00:00Z",
    };

    const { rerender } = render(<ProfileSettingsView profile={initialProfile} />);

    // User modifies name (triggers isDirty = true)
    const nameInput = await screen.findByDisplayValue("元々の名前");
    fireEvent.change(nameInput, { target: { value: "編集中の新しい名前" } });
    expect(screen.getByDisplayValue("編集中の新しい名前")).toBeDefined();

    // Background sync arrives with older or different name
    const syncedProfile = {
      ...initialProfile,
      name: "同期で降ってきた古い名前",
      updatedAt: "2026-09-01T10:05:00Z",
    };
    rerender(<ProfileSettingsView profile={syncedProfile} />);

    // Edited name MUST NOT be overwritten!
    expect(screen.getByDisplayValue("編集中の新しい名前")).toBeDefined();
    expect(screen.queryByDisplayValue("同期で降ってきた古い名前")).toBeNull();
  });
});
