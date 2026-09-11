import { describe, it, expect } from "vitest";
import {
  inferHealthInsuranceType,
  getHealthInsuranceInfo,
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
      expect(result?.name).toBe(HEALTH_INSURANCE_MASTER.tjk.label);
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
      expect(result?.name).toBe(HEALTH_INSURANCE_MASTER.its.label);
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
  });
});
