/**
 * 健康保険組合 (Health Insurance) 定数・マスター定義・純粋判定関数 (SSOT)
 */

export type HealthInsuranceType =
  | "its"        // 関東ITソフトウェア健康保険組合 (ITS健保)
  | "tjk"        // 東京都情報サービス産業健康保険組合 (TJK)
  | "kyokai"     // 全国健康保険協会 (協会けんぽ)
  | "corporate"  // 自社・グループ単一健康保険組合 (大手IT等)
  | "other"      // その他総合・業種別健康保険組合
  | "unknown";   // 不明 / 要確認

export interface HealthInsuranceInfo {
  type: HealthInsuranceType;
  label: string;
  shortLabel: string;
  badgeVariant: "default" | "secondary" | "outline" | "destructive";
  badgeClassName: string;
  rateAdvantage: string; // 保険料率・手取りメリット
  keyBenefits: string[]; // 直営保養所・付加給付等の代表的メリット
  description: string;
}

export const HEALTH_INSURANCE_MASTER: Record<HealthInsuranceType, HealthInsuranceInfo> = {
  its: {
    type: "its",
    label: "関東ITソフトウェア健康保険組合 (ITS健保)",
    shortLabel: "ITS健保",
    badgeVariant: "secondary",
    badgeClassName: "bg-emerald-950/80 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/60",
    rateAdvantage: "保険料率が割安（約8.5%）。協会けんぽ標準（約10%）比で年間数万〜十数万円の手取り増",
    keyBenefits: [
      "直営保養施設（トスラブ箱根・トスラブ館山・熱海・湯沢等）が1泊5,500円前後で利用可能",
      "直営・提携高級レストラン（寿司・会席・イタリアン・バー等）の格安利用",
      "高額療養費付加給付（1レセプト月額自己負担限度額20,000円控除後の全額給付）",
      "インフルエンザ予防接種の費用補助（2,000円補助または全額補助）",
      "提携フィットネスクラブ（コナミ・セントラル等）の都度利用割引",
    ],
    description: "IT・インターネット企業で圧倒的人気を誇る健康保険組合。割安な保険料率による手取り向上と、業界随一の手厚い保養施設・付加給付が特長。",
  },
  tjk: {
    type: "tjk",
    label: "東京都情報サービス産業健康保険組合 (TJK)",
    shortLabel: "TJK健保",
    badgeVariant: "secondary",
    badgeClassName: "bg-sky-950/80 text-sky-300 border-sky-500/50 hover:bg-sky-900/60",
    rateAdvantage: "保険料率が割安（約8.5%前後）。協会けんぽ比で月々の社会保険料が抑えられ手取り有利",
    keyBenefits: [
      "直営保養所（アルペンドルフ白樺、TJK箱根の森、金谷城スポーツセンター）が格安利用可能",
      "高額療養費付加給付制度（月額自己負担上限を超えた分を独自給付し高額治療費を軽減）",
      "インフルエンザ予防接種の費用全額補助",
      "契約ゴルフ場・契約スポーツ施設・ボウリング大会等の充実した運動補助",
      "東京ディズニーリゾート・各種レジャー施設等のコーポレートプログラム補助",
    ],
    description: "情報サービス産業に特化した伝統ある優良健保組合。手取り有利な保険料率と、白樺湖・箱根等の高品質な直営保養施設、手厚い医療補助が特長。",
  },
  kyokai: {
    type: "kyokai",
    label: "全国健康保険協会 (協会けんぽ)",
    shortLabel: "協会けんぽ",
    badgeVariant: "outline",
    badgeClassName: "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800",
    rateAdvantage: "各都道府県の標準保険料率（東京都約10.0%前後適用）。標準的な手取り水準",
    keyBenefits: [
      "法定給付（傷病手当金・出産育児一時金・埋葬料等）の確実な支給",
      "生活習慣病予防健診の費用助成（35歳以上対象）",
      "ジェネリック医薬品の差額通知による医療費節約支援",
    ],
    description: "中小企業で標準的に適用される公的健康保険。法定給付を確実にカバーする標準的な制度設計。",
  },
  corporate: {
    type: "corporate",
    label: "自社・グループ単一健康保険組合",
    shortLabel: "自社健保",
    badgeVariant: "secondary",
    badgeClassName: "bg-purple-950/80 text-purple-300 border-purple-500/50 hover:bg-purple-900/60",
    rateAdvantage: "企業グループ独自の割安な保険料率設定が多く、手取り額に有利な傾向",
    keyBenefits: [
      "大企業グループ独自の直営保養所・リゾートトラスト・提携保養施設",
      "独自の高額療養費付加給付（自己負担限度額をさらに低く設定）",
      "人間ドック・各種がん検診の全額会社負担・補助",
    ],
    description: "大手IT・通信・総合電機グループ等が単独またはグループ共同で設立する健康保険組合。手厚い福利厚生と独自の福利厚生プログラムを提供。",
  },
  other: {
    type: "other",
    label: "その他健康保険組合",
    shortLabel: "その他健保",
    badgeVariant: "outline",
    badgeClassName: "bg-slate-900/80 text-indigo-300 border-indigo-500/40 hover:bg-indigo-950/40",
    rateAdvantage: "業種別組合の規定に準じた保険料率（協会けんぽより割安な場合が多い）",
    keyBenefits: [
      "各組合独自の保養施設・提携施設利用",
      "組合独自の付加給付または健診助成制度",
    ],
    description: "出版健保、機械健保、金融健保など業界別の組合健保。それぞれの業界に最適化された福利厚生を提供。",
  },
  unknown: {
    type: "unknown",
    label: "健康保険組合 (要確認 / 未調査)",
    shortLabel: "健保未確認",
    badgeVariant: "outline",
    badgeClassName: "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900",
    rateAdvantage: "加入健保により手取りや保養所利用などの待遇が異なります（面談等で要確認）",
    keyBenefits: [
      "求人票またはWeb検索、エージェントヒアリングによる確認を推奨",
    ],
    description: "求人票に明記がなく、Web調査でも特定されていない状態。面談・逆質問での確認を推奨。",
  },
};

/**
 * UIのドロップダウン等で使用する健保選択肢一覧
 */
export const HEALTH_INSURANCE_OPTIONS: { value: HealthInsuranceType; label: string }[] = [
  { value: "its", label: "ITS健保 (関東IT)" },
  { value: "tjk", label: "TJK健保 (情報サービス)" },
  { value: "kyokai", label: "協会けんぽ (全国健康保険協会)" },
  { value: "corporate", label: "自社・単一健保" },
  { value: "other", label: "その他組合健保" },
  { value: "unknown", label: "不明 / 要確認" },
];

/**
 * 健保名文字列または求人テキストから HealthInsuranceType を決定論的に推論する純粋関数
 */
export function inferHealthInsuranceType(
  name?: string,
  extraText?: string
): HealthInsuranceType {
  const combined = `${name || ""} ${extraText || ""}`.toLowerCase();
  if (!combined.trim()) return "unknown";

  // 1. ITS健保の判定（優先度高）
  if (
    combined.includes("関東it") ||
    combined.includes("its健保") ||
    combined.includes("its健康保険") ||
    combined.includes("ソフトウェア健康保険組合") ||
    combined.includes("its") ||
    combined.includes("関東アイティー")
  ) {
    return "its";
  }

  // 2. TJK健保の判定（優先度高）
  if (
    combined.includes("tjk") ||
    combined.includes("東京都情報サービス") ||
    combined.includes("情報サービス産業健康保険組合") ||
    combined.includes("東京情報サービス")
  ) {
    return "tjk";
  }

  // 3. 協会けんぽの判定
  if (
    combined.includes("協会けんぽ") ||
    combined.includes("全国健康保険協会") ||
    combined.includes("政府管掌健康保険")
  ) {
    return "kyokai";
  }

  // 4. 自社・単一健保の判定
  if (
    combined.includes("自社健保") ||
    combined.includes("単一健保") ||
    combined.includes("グループ健保") ||
    combined.includes("企業健保")
  ) {
    return "corporate";
  }

  // 5. 健保・組合という記載があるが特定できない場合
  if (
    combined.includes("健保組合") ||
    combined.includes("健康保険組合")
  ) {
    return "other";
  }

  return "unknown";
}

/**
 * 健保タイプからメタデータ情報を取得（フォールバック付き）
 */
export function getHealthInsuranceInfo(type?: HealthInsuranceType): HealthInsuranceInfo {
  if (type && HEALTH_INSURANCE_MASTER[type]) {
    return HEALTH_INSURANCE_MASTER[type];
  }
  return HEALTH_INSURANCE_MASTER.unknown;
}

/**
 * 求人テキストから健康保険に関する記述を抽出し、事前判定オブジェクトを返す純粋関数
 */
export function extractHealthInsuranceFromText(jobText: string): {
  type: HealthInsuranceType;
  name: string;
  confidence: "high" | "medium" | "low";
  benefits: string[];
  notes?: string;
} | null {
  if (!jobText || !jobText.trim()) return null;

  const type = inferHealthInsuranceType(undefined, jobText);
  if (type === "unknown") return null;

  const info = getHealthInsuranceInfo(type);
  return {
    type,
    name: info.label,
    confidence: "high", // 求人票本文から直接合致したため確度高
    benefits: info.keyBenefits.slice(0, 3),
    notes: `求人票本文から自動検出 (${info.shortLabel})`,
  };
}
