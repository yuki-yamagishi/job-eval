import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CareerHistoryView } from "@/features/career/CareerHistoryView";
import { UserProfile } from "@/types/profile";

const mockProfileWithCareer: UserProfile = {
  id: "user-test",
  name: "山田 太郎",
  title: "シニアクラウドエンジニア",
  yearsOfExperience: 7,
  summary: "クラウド基盤設計およびマイクロサービス開発",
  skills: [
    { id: "s-1", name: "Go", category: "language", yearsOfExperience: 3, level: "advanced", status: "experienced" },
    { id: "s-2", name: "AWS", category: "cloud", yearsOfExperience: 4, level: "expert", status: "experienced" },
  ],
  certifications: [],
  conditions: {
    targetSalaryMin: 800,
    targetSalaryMax: 1100,
    preferredWorkStyle: "フルリモート",
    preferredLocation: "東京",
    preferredRoles: ["クラウドアーキテクト"],
    ngConditions: [],
  },
  apiSettings: {
    geminiApiKey: "mock-key",
    geminiModel: "gemini-3.6-flash",
  },
  companies: [
    {
      id: "comp-test-1",
      companyName: "テスト株式会社",
      employmentType: "正社員",
      startDate: "2022-04",
      isCurrent: true,
      department: "開発本部",
      description: "SaaSサービスの開発",
      projects: [
        {
          id: "proj-test-1",
          title: "API基盤のマイクロサービス化",
          role: "テックリード",
          teamSize: "5名",
          startDate: "2023-01",
          isCurrent: true,
          skills: ["Go", "AWS", "Docker"],
          situation: "モノリス構成でレスポンスが遅延していた",
          action: "Go言語によるマイクロサービスに移行した",
          result: "レスポンス時間を70%削減した",
        },
      ],
    },
  ],
  updatedAt: "2026-09-01T10:00:00Z",
};

describe("CareerHistoryView Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders company and multiple project items with STAR fields", async () => {
    render(<CareerHistoryView profile={mockProfileWithCareer} />);

    // Header
    expect(await screen.findByText("職務経歴・プロジェクト実績 (STAR法)")).toBeDefined();

    // Company info
    expect(screen.getByText("テスト株式会社")).toBeDefined();
    expect(screen.getByText("正社員")).toBeDefined();
    expect(screen.getByText("在籍中")).toBeDefined();

    // Project info
    expect(screen.getByText("API基盤のマイクロサービス化")).toBeDefined();
    expect(screen.getByText("テックリード")).toBeDefined();
    expect(screen.getByText(/5名/)).toBeDefined();

    // STAR contents
    expect(screen.getByText(/モノリス構成でレスポンスが遅延していた/)).toBeDefined();
    expect(screen.getByText(/Go言語によるマイクロサービスに移行した/)).toBeDefined();
    expect(screen.getByText(/レスポンス時間を70%削減した/)).toBeDefined();
  });

  it("opens modal and adds a new company successfully", async () => {
    render(<CareerHistoryView profile={mockProfileWithCareer} />);
    expect(await screen.findByText("職務経歴・プロジェクト実績 (STAR法)")).toBeDefined();

    const addCompanyBtn = screen.getByRole("button", { name: /会社を追加/ });
    fireEvent.click(addCompanyBtn);

    // Modal opens
    expect(await screen.findByText("所属企業情報の編集")).toBeDefined();

    // Input company name
    const companyInput = screen.getByPlaceholderText(/例: 株式会社テクノロジー/);
    fireEvent.change(companyInput, { target: { value: "新規参画株式会社" } });

    // Click confirm
    const confirmBtn = screen.getByRole("button", { name: "確定" });
    fireEvent.click(confirmBtn);

    // Verify added to list
    expect(await screen.findByText("新規参画株式会社")).toBeDefined();
  });

  it("opens modal and adds a new project to an existing company", async () => {
    render(<CareerHistoryView profile={mockProfileWithCareer} />);
    expect(await screen.findByText("職務経歴・プロジェクト実績 (STAR法)")).toBeDefined();

    const addProjectBtn = screen.getByTitle("この会社にプロジェクトを追加");
    fireEvent.click(addProjectBtn);

    // Modal opens
    expect(await screen.findByText("プロジェクト実績の編集 (STAR法誘導)")).toBeDefined();

    // Input project title & role
    const titleInput = screen.getByPlaceholderText(/EC基幹システム/);
    fireEvent.change(titleInput, { target: { value: "リアルタイム通知機能開発" } });

    const roleInput = screen.getByPlaceholderText(/例: テックリード/);
    fireEvent.change(roleInput, { target: { value: "バックエンドエンジニア" } });

    // Save project
    const saveProjBtn = screen.getByRole("button", { name: "プロジェクトを保存" });
    fireEvent.click(saveProjBtn);

    // Verify added
    expect(await screen.findByText("リアルタイム通知機能開発")).toBeDefined();
  });

  it("opens resume markdown preview and allows copy", async () => {
    render(<CareerHistoryView profile={mockProfileWithCareer} />);
    expect(await screen.findByText("職務経歴・プロジェクト実績 (STAR法)")).toBeDefined();

    const previewBtn = screen.getByRole("button", { name: /経歴書プレビュー \/ 出力/ });
    fireEvent.click(previewBtn);

    // Modal opens
    expect(await screen.findByText("職務経歴書 (Markdown) プレビュー & 出力")).toBeDefined();
    expect(screen.getByText(/# 職務経歴書 \(Curriculum Vitae\)/)).toBeDefined();

    // Copy button
    const copyBtn = screen.getByRole("button", { name: "経歴書をコピー" });
    expect(copyBtn).toBeDefined();
  });

  it("calls onSaveProfile when saving career history", async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);

    render(<CareerHistoryView profile={mockProfileWithCareer} onSaveProfile={handleSave} />);
    expect(await screen.findByText("職務経歴・プロジェクト実績 (STAR法)")).toBeDefined();

    const saveBtn = screen.getByRole("button", { name: /経歴を保存/ });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
    });
  });
});
