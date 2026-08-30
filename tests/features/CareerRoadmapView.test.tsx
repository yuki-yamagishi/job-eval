import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { CareerRoadmapView } from "@/features/roadmap/CareerRoadmapView";
import { JobAnalysisResult } from "@/types/job";
import { TEST_MOCK_PROFILE } from "../fixtures/sampleProfile";

describe("CareerRoadmapView", () => {
  const mockJobs: JobAnalysisResult[] = [
    {
      metadata: {
        id: "job-1",
        company: "株式会社クラウドイノベーション",
        title: "クラウドアーキテクト",
        agentSource: "ビズリーチ",
        dateAnalyzed: "2026-08-30",
        matchScore: 92,
        judgment: "S (即応募推奨)",
        status: "応募検討中",
        tags: ["AWS", "Terraform"],
      },
      scoreBreakdown: {
        skillMatchRatio: 95,
        conditionMatchRatio: 90,
        careerGrowthRatio: 90,
        environmentRiskRatio: 90,
      },
      positives: ["モダン技術スタック"],
      concerns: [],
      agentQuestions: [],
      appealPoints: [],
      qualificationAdvice: {
        requiredCertifications: ["AWS SAA"],
        recommendedCertifications: ["AWS SAP", "CKA"],
        advice: "AWS実務経験のアピールにSAP取得を推奨。",
      },
      careerTrajectory: {
        acquiredSkills: ["マルチクラウドIaC基盤設計", "高トラフィック分散アーキテクチャ"],
        nextCareerOptions: ["スタッフエンジニア / プリンシパル", "VPoE / EM"],
        marketValueProjection: "想定市場年収: 1,100万円 〜 1,450万円",
        careerRisksOrLockin: "保守比率の増加に注意",
        overallOutlook: "将来のCTOキャリアに直結する有望なポジションです。",
      },
      jobDetails: {
        mustRequirements: [],
        wantRequirements: [],
        jobDescription: [],
        location: "東京",
        selectionProcess: "面接",
      },
      markdownContent: "# Markdown 1",
    },
    {
      metadata: {
        id: "job-2",
        company: "株式会社レガシーシステム",
        title: "運用保守エンジニア",
        agentSource: "doda",
        dateAnalyzed: "2026-08-29",
        matchScore: 50,
        judgment: "C (見送り推奨)",
        status: "見送り",
        rejectReason: "年収条件の不一致・NG常駐",
        tags: ["SES"],
      },
      scoreBreakdown: {
        skillMatchRatio: 40,
        conditionMatchRatio: 50,
        careerGrowthRatio: 40,
        environmentRiskRatio: 50,
      },
      positives: [],
      concerns: ["客先常駐比率100%"],
      agentQuestions: [],
      appealPoints: [],
      jobDetails: {
        mustRequirements: [],
        wantRequirements: [],
        jobDescription: [],
        location: "東京",
        selectionProcess: "面接",
      },
      markdownContent: "# Markdown 2",
    },
  ];

  it("renders pipeline stages and calculates stage counts accurately", () => {
    render(
      <CareerRoadmapView
        savedJobs={mockJobs}
        profile={TEST_MOCK_PROFILE}
      />
    );

    expect(screen.getByText("選考パイプライン進捗マイルストーン")).toBeDefined();
    expect(screen.getAllByText("株式会社クラウドイノベーション").length).toBeGreaterThan(0);
    expect(screen.getAllByText("92点").length).toBeGreaterThan(0);
  });

  it("aggregates qualification roadmap with user status badges", () => {
    render(
      <CareerRoadmapView
        savedJobs={mockJobs}
        profile={TEST_MOCK_PROFILE}
      />
    );

    expect(screen.getByText(/求人票から逆算された資格・スキル獲得ロードマップ/)).toBeDefined();
    expect(screen.getByText("AWS SAP")).toBeDefined();
    expect(screen.getByText("CKA")).toBeDefined();
  });

  it("analyzes reject reasons and displays breakdown", () => {
    render(
      <CareerRoadmapView
        savedJobs={mockJobs}
        profile={TEST_MOCK_PROFILE}
      />
    );

    expect(screen.getByText(/見送り・辞退要因の分析サマリ/)).toBeDefined();
    expect(screen.getByText("株式会社レガシーシステム")).toBeDefined();
  });

  it("calls onSelectJobForPreview when job item is clicked", () => {
    const handleSelect = vi.fn();
    render(
      <CareerRoadmapView
        savedJobs={mockJobs}
        profile={TEST_MOCK_PROFILE}
        onSelectJobForPreview={handleSelect}
      />
    );

    const jobCards = screen.getAllByText("株式会社クラウドイノベーション");
    fireEvent.click(jobCards[0]);

    expect(handleSelect).toHaveBeenCalledWith(mockJobs[0]);
  });

  it("renders Career Pathways section aggregating trajectories across jobs", () => {
    render(
      <CareerRoadmapView
        savedJobs={mockJobs}
        profile={TEST_MOCK_PROFILE}
      />
    );

    expect(screen.getByText(/各社選択後のキャリア分岐・次の転職先マップ/)).toBeDefined();
    expect(screen.getByText(/マルチクラウドIaC基盤設計/)).toBeDefined();
    expect(screen.getByText(/スタッフエンジニア \/ プリンシパル/)).toBeDefined();
    expect(screen.getByText("想定市場年収: 1,100万円 〜 1,450万円")).toBeDefined();
  });
});
