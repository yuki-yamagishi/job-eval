import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
    expect(await screen.findByText(/スキル & 認定資格/)).toBeDefined();
    expect(await screen.findByText(/転職希望条件マトリクス/)).toBeDefined();
    expect(await screen.findByText(/NG条件・除外キーワード/)).toBeDefined();
    expect(await screen.findByText(/Google Gemini API 設定/)).toBeDefined();

    // Check tabs and action buttons
    expect(await screen.findByText(/取得済み/)).toBeDefined();
    expect(await screen.findByText(/学習中・取得目標/)).toBeDefined();
    expect(await screen.findByText("接続テスト")).toBeDefined();
    expect(await screen.findByText("設定を保存")).toBeDefined();
    expect(await screen.findByText("初期値に戻す")).toBeDefined();
  });
});
