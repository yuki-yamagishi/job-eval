import { describe, it, expect } from "vitest";
import {
  inferHealthInsuranceType,
  getHealthInsuranceInfo,
  getHealthInsuranceBadgeLabel,
  extractHealthInsuranceFromText,
  HEALTH_INSURANCE_MASTER,
} from "@/core/constants/healthInsurance";

describe("Health Insurance Core Logic & Master (SSOT)", () => {
  describe("inferHealthInsuranceType", () => {
    it("identifies ITS健保 accurately from various keywords", () => {
      expect(inferHealthInsuranceType("関東ITソフトウェア健康保険組合 (ITS健保)")).toBe("its");
      expect(inferHealthInsuranceType("関東ITソフトウェア健康保険組合")).toBe("its");
      expect(inferHealthInsuranceType("ITS健保加入")).toBe("its");
      expect(inferHealthInsuranceType(undefined, "福利厚生: 関東ITソフトウェア健保")).toBe("its");
      expect(inferHealthInsuranceType(undefined, "ITS健康保険組合加入（保養施設利用可）")).toBe("its");
    });

    it("identifies TJK健保 accurately from various keywords", () => {
      expect(inferHealthInsuranceType("東京都情報サービス産業健康保険組合 (TJK)")).toBe("tjk");
      expect(inferHealthInsuranceType("東京都情報サービス産業健康保険組合")).toBe("tjk");
      expect(inferHealthInsuranceType("TJK加入")).toBe("tjk");
      expect(inferHealthInsuranceType(undefined, "福利厚生: TJK健保（直営保養所・契約保養所多数）")).toBe("tjk");
      expect(inferHealthInsuranceType(undefined, "東京情報サービス産業健康保険組合")).toBe("tjk");
    });

    it("identifies 協会けんぽ accurately from keywords", () => {
      expect(inferHealthInsuranceType("全国健康保険協会 (協会けんぽ)")).toBe("kyokai");
      expect(inferHealthInsuranceType("協会けんぽ")).toBe("kyokai");
      expect(inferHealthInsuranceType(undefined, "社会保険完備（健康保険は全国健康保険協会東京支部）")).toBe("kyokai");
    });

    it("identifies 自社健保 / 単一健保 accurately", () => {
      expect(inferHealthInsuranceType("自社健保組合")).toBe("corporate");
      expect(inferHealthInsuranceType(undefined, "グループ単一健保加入")).toBe("corporate");
    });

    it("falls back to other or unknown safely", () => {
      expect(inferHealthInsuranceType("出版健康保険組合")).toBe("other");
      expect(inferHealthInsuranceType("")).toBe("unknown");
      expect(inferHealthInsuranceType(undefined, "")).toBe("unknown");
      expect(inferHealthInsuranceType(undefined, "社会保険完備（各種社会保険あり）")).toBe("unknown");
    });
  });

  describe("getHealthInsuranceInfo", () => {
    it("returns correct metadata for its", () => {
      const info = getHealthInsuranceInfo("its");
      expect(info.shortLabel).toBe("ITS健保");
      expect(info.rateAdvantage).toContain("8.5%");
      expect(info.keyBenefits.some((b) => b.includes("トスラブ"))).toBe(true);
      expect(info.keyBenefits.some((b) => b.includes("付加給付"))).toBe(true);
    });

    it("returns correct metadata for tjk", () => {
      const info = getHealthInsuranceInfo("tjk");
      expect(info.shortLabel).toBe("TJK健保");
      expect(info.rateAdvantage).toContain("8.5%");
      expect(info.keyBenefits.some((b) => b.includes("白樺") || b.includes("箱根"))).toBe(true);
    });

    it("returns fallback metadata for unknown or undefined", () => {
      const info = getHealthInsuranceInfo(undefined);
      expect(info.shortLabel).toBe("健保未確認");
      expect(info.type).toBe("unknown");
    });
  });

  describe("extractHealthInsuranceFromText", () => {
    it("extracts TJK info when job text mentions TJK", () => {
      const jobText = `
        【福利厚生】
        ・雇用保険、労災保険、厚生年金、健康保険（東京都情報サービス産業健康保険組合）
        ・交通費全額支給
        ・リモートワーク手当
      `;
      const result = extractHealthInsuranceFromText(jobText);
      expect(result).not.toBeNull();
      expect(result?.type).toBe("tjk");
      expect(result?.confidence).toBe("high");
      expect(result?.name).toBe("東京都情報サービス産業健康保険組合");
      expect(result?.benefits.length).toBeGreaterThan(0);
    });

    it("extracts ITS info when job text mentions 関東ITソフトウェア", () => {
      const jobText = `
        ■待遇・福利厚生
        各種社会保険完備（関東ITソフトウェア健康保険組合）
        退職金制度あり、確定拠出年金制度
      `;
      const result = extractHealthInsuranceFromText(jobText);
      expect(result).not.toBeNull();
      expect(result?.type).toBe("its");
      expect(result?.confidence).toBe("high");
      expect(result?.name).toBe("関東ITソフトウェア健康保険組合");
    });

    it("extracts custom single corporate health insurance without rounding to category", () => {
      const jobText = `
        ■福利厚生
        健康保険（サイバーエージェント健康保険組合）、厚生年金、雇用保険、労災保険
        家賃補助制度（2駅ルール）
      `;
      const result = extractHealthInsuranceFromText(jobText);
      expect(result).not.toBeNull();
      expect(result?.name).toBe("サイバーエージェント健康保険組合");
      expect(result?.confidence).toBe("high");
    });

    it("returns null when no health insurance is mentioned", () => {
      const jobText = `
        ■待遇
        社会保険完備（健康保険、厚生年金、雇用保険、労災保険）
        年次有給休暇（初年度10日付与）
      `;
      const result = extractHealthInsuranceFromText(jobText);
      expect(result).toBeNull();
    });

    it("does not trigger false positive on general English words containing 'its' (e.g. visits, credits, benefits, commits)", () => {
      const jobTextWithEnglish = `
        【業務内容】
        月間1,000万 visits を誇るWebサービスの開発。
        決済 credits 基盤の設計・マイクロサービス化。
        Git commits や PR submits の自動化パイプライン構築。
        福利厚生: benefits package 完備、unit limits なし。
        growing its business globally.
      `;
      // inferHealthInsuranceType should safely return unknown
      expect(inferHealthInsuranceType(undefined, jobTextWithEnglish)).toBe("unknown");
      // extractHealthInsuranceFromText should safely return null
      expect(extractHealthInsuranceFromText(jobTextWithEnglish)).toBeNull();
    });
  });

  describe("getHealthInsuranceBadgeLabel", () => {
    it("returns ITS健保 for ITS type", () => {
      const badge = getHealthInsuranceBadgeLabel("関東ITソフトウェア健康保険組合", "its");
      expect(badge.badgeText).toBe("ITS健保");
      expect(badge.title).toBe("関東ITソフトウェア健康保険組合");
      expect(badge.badgeClassName).toContain("emerald");
    });

    it("returns TJK健保 for TJK type", () => {
      const badge = getHealthInsuranceBadgeLabel("東京都情報サービス産業健康保険組合", "tjk");
      expect(badge.badgeText).toBe("TJK健保");
      expect(badge.title).toBe("東京都情報サービス産業健康保険組合");
      expect(badge.badgeClassName).toContain("sky");
    });

    it("returns 協会けんぽ for Kyokai type", () => {
      const badge = getHealthInsuranceBadgeLabel("全国健康保険協会東京支部", "kyokai");
      expect(badge.badgeText).toBe("協会けんぽ");
      expect(badge.title).toBe("全国健康保険協会東京支部");
      expect(badge.badgeClassName).toContain("slate");
    });

    it("shortens '〇〇健康保険組合' to '〇〇健保' for custom corporate insurance", () => {
      const badge = getHealthInsuranceBadgeLabel("日立健康保険組合", "corporate");
      expect(badge.badgeText).toBe("日立健保");
      expect(badge.title).toBe("日立健康保険組合");
      expect(badge.badgeClassName).toContain("purple");
    });

    it("truncates to 10 chars when shortened name exceeds 10 chars", () => {
      // "サイバーエージェント健康保険組合" -> "サイバーエージェント健保" (11文字) -> 10文字 truncate + "…"
      const badgeCyber = getHealthInsuranceBadgeLabel("サイバーエージェント健康保険組合", "corporate");
      expect(badgeCyber.badgeText).toBe("サイバーエージェント…");
      expect(badgeCyber.title).toBe("サイバーエージェント健康保険組合");

      // "全国情報サービス産業労働者福祉共済健康保険組合" -> 10文字 truncate + "…"
      const longName = "全国情報サービス産業労働者福祉共済健康保険組合";
      const badge = getHealthInsuranceBadgeLabel(longName, "other");
      expect(badge.badgeText.length).toBeLessThanOrEqual(11); // 10 chars + '…'
      expect(badge.badgeText.endsWith("…")).toBe(true);
      expect(badge.title).toBe(longName);
    });

    it("handles fallback gracefully when name is empty or undefined", () => {
      const badge = getHealthInsuranceBadgeLabel(undefined, "unknown");
      expect(badge.badgeText).toBe("健保未確認");
      expect(badge.badgeClassName).toContain("slate");
    });
  });
});
