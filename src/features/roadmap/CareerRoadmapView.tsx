import React, { useMemo, useState } from "react";
import { 
  GraduationCap, 
  TrendingUp, 
  XCircle, 
  Layers, 
  Building2,
  Eye,
  Rocket,
  Compass,
  RotateCw,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JobAnalysisResult, JobStatus } from "@/types/job";
import { UserProfile } from "@/types/profile";
import { formatSalary } from "@/lib/utils";

interface CareerRoadmapViewProps {
  savedJobs: JobAnalysisResult[];
  profile: UserProfile;
  onSelectJobForPreview?: (job: JobAnalysisResult) => void;
  onUpdateStatus?: (id: string, status: JobStatus, rejectReason?: string) => void;
  onRefreshJobs?: () => Promise<void> | void;
}

export function normalizeCertificationName(raw: string): string {
  const clean = raw.replace(/^[🎯💡📌\s]+/, "").trim();
  const lower = clean.toLowerCase();

  // AWS SAA
  if (lower.includes("saa") || lower.includes("solutions architect - associate") || lower.includes("ソリューションアーキテクト - アソシエイト") || lower.includes("ソリューションアーキテクト アソシエイト")) {
    return "AWS 認定ソリューションアーキテクト - アソシエイト (SAA)";
  }
  // AWS SAP
  if (lower.includes("sap") || lower.includes("solutions architect - professional") || lower.includes("ソリューションアーキテクト - プロフェッショナル") || lower.includes("ソリューションアーキテクト プロフェッショナル")) {
    return "AWS 認定ソリューションアーキテクト - プロフェッショナル (SAP)";
  }
  // AWS SOA
  if (lower.includes("soa") || lower.includes("sysops administrator") || lower.includes("シスオプス")) {
    return "AWS 認定 SysOps アドミニストレーター - アソシエイト (SOA)";
  }
  // Azure AZ-305
  if (lower.includes("az-305") || lower.includes("azure solutions architect expert")) {
    return "Microsoft Certified: Azure Solutions Architect Expert (AZ-305)";
  }
  // Azure AZ-400
  if (lower.includes("az-400") || lower.includes("azure devops engineer")) {
    return "Microsoft Certified: Azure DevOps Engineer Expert (AZ-400)";
  }
  // Azure AZ-104
  if (lower.includes("az-104") || lower.includes("azure administrator")) {
    return "Microsoft Certified: Azure Administrator Associate (AZ-104)";
  }
  // CKA
  if (lower.includes("cka") || lower.includes("kubernetes administrator")) {
    return "CKA (認定Kubernetes管理者)";
  }
  // CKAD
  if (lower.includes("ckad") || lower.includes("kubernetes application developer")) {
    return "CKAD (認定Kubernetesアプリケーション開発者)";
  }
  // 基本情報
  if (lower.includes("基本情報") || lower === "fe") {
    return "基本情報技術者試験 (FE)";
  }
  // 応用情報
  if (lower.includes("応用情報") || lower === "ap") {
    return "応用情報技術者試験 (AP)";
  }
  // ネットワークスペシャリスト
  if (lower.includes("ネットワークスペシャリスト") || lower === "nw") {
    return "ネットワークスペシャリスト (NW)";
  }
  // データベーススペシャリスト
  if (lower.includes("データベーススペシャリスト") || lower === "db") {
    return "データベーススペシャリスト (DB)";
  }
  // LPIC / LinuC
  if (lower.includes("lpic-1") || lower.includes("linuc-1") || lower.includes("lpic 1") || lower.includes("linuc 1")) {
    return "LPIC / LinuC レベル1";
  }
  if (lower.includes("lpic-2") || lower.includes("linuc-2") || lower.includes("lpic 2") || lower.includes("linuc 2")) {
    return "LPIC / LinuC レベル2";
  }
  if (lower.includes("lpic-3") || lower.includes("linuc-3") || lower.includes("lpic 3") || lower.includes("linuc 3")) {
    return "LPIC / LinuC レベル3";
  }

  return clean;
}

export interface CompanyCertContext {
  company: string;
  type: "required" | "recommended";
  advice?: string;
}

const PIPELINE_STAGES: Array<{ status: JobStatus; label: string; color: string; bg: string }> = [
  { status: "応募検討中", label: "検討中", color: "text-indigo-400", bg: "bg-indigo-950/40 border-indigo-500/30" },
  { status: "応募済", label: "応募済", color: "text-blue-400", bg: "bg-blue-950/40 border-blue-500/30" },
  { status: "書類通過", label: "書類通過", color: "text-cyan-400", bg: "bg-cyan-950/40 border-cyan-500/30" },
  { status: "一次面接", label: "一次面接", color: "text-purple-400", bg: "bg-purple-950/40 border-purple-500/30" },
  { status: "最終面接", label: "最終面接", color: "text-amber-400", bg: "bg-amber-950/40 border-amber-500/30" },
  { status: "内定", label: "内定獲得", color: "text-emerald-400", bg: "bg-emerald-950/40 border-emerald-500/30" },
];

export const CareerRoadmapView: React.FC<CareerRoadmapViewProps> = ({
  savedJobs,
  profile,
  onSelectJobForPreview,
  onUpdateStatus: _onUpdateStatus,
  onRefreshJobs,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshSuccess(false);
    try {
      if (onRefreshJobs) {
        await onRefreshJobs();
      }
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 2500);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 1. Group jobs by pipeline status
  const pipelineGroups = useMemo(() => {
    const map: Record<string, JobAnalysisResult[]> = {
      未検討: [],
      応募検討中: [],
      応募済: [],
      書類通過: [],
      一次面接: [],
      最終面接: [],
      内定: [],
      辞退: [],
      見送り: [],
    };
    savedJobs.forEach((job) => {
      const st = job.metadata.status || "未検討";
      if (map[st]) {
        map[st].push(job);
      } else {
        map["未検討"].push(job);
      }
    });
    return map;
  }, [savedJobs]);

  // 2. Reject / Pass factor breakdown
  const rejectAnalysis = useMemo(() => {
    const rejectedJobs = [...(pipelineGroups["見送り"] || []), ...(pipelineGroups["辞退"] || [])];
    const reasonCounts: Record<string, number> = {
      "年収条件の不一致": 0,
      "NG条件・働き方抵触": 0,
      "スキル・資格ギャップ": 0,
      "他社選考・タイミング": 0,
      "その他・社風": 0,
    };

    rejectedJobs.forEach((j) => {
      const r = j.metadata.rejectReason || "";
      if (r.includes("年収") || (j.metadata.salaryMax && j.metadata.salaryMax < profile.conditions.targetSalaryMin)) {
        reasonCounts["年収条件の不一致"]++;
      } else if (r.includes("NG") || j.concerns.some((c) => c.includes("NG"))) {
        reasonCounts["NG条件・働き方抵触"]++;
      } else if (r.includes("スキル") || (j.scoreBreakdown && j.scoreBreakdown.skillMatchRatio < 60)) {
        reasonCounts["スキル・資格ギャップ"]++;
      } else {
        reasonCounts["その他・社風"]++;
      }
    });

    return {
      total: rejectedJobs.length,
      counts: reasonCounts,
      jobs: rejectedJobs,
    };
  }, [pipelineGroups, profile]);

  // 3. Smart Normalized & Deduplicated Qualification Roadmap with Company Context
  const certRoadmap = useMemo(() => {
    const certFreq: Record<string, { companyContexts: CompanyCertContext[] }> = {};

    savedJobs.forEach((job) => {
      const company = job.metadata.company;
      const seenCertsForThisJob = new Set<string>();

      // A. Required certifications
      const reqCerts = job.qualificationAdvice?.requiredCertifications || [];
      reqCerts.forEach((raw) => {
        const normalized = normalizeCertificationName(raw);
        if (!normalized || seenCertsForThisJob.has(normalized)) return;
        seenCertsForThisJob.add(normalized);

        if (!certFreq[normalized]) {
          certFreq[normalized] = { companyContexts: [] };
        }
        certFreq[normalized].companyContexts.push({
          company,
          type: "required",
          advice: job.qualificationAdvice?.advice,
        });
      });

      // B. Recommended certifications
      const recCerts = job.qualificationAdvice?.recommendedCertifications || [];
      recCerts.forEach((raw) => {
        const normalized = normalizeCertificationName(raw);
        if (!normalized || seenCertsForThisJob.has(normalized)) return;
        seenCertsForThisJob.add(normalized);

        if (!certFreq[normalized]) {
          certFreq[normalized] = { companyContexts: [] };
        }
        certFreq[normalized].companyContexts.push({
          company,
          type: "recommended",
          advice: job.qualificationAdvice?.advice,
        });
      });
    });

    const userAcquired = new Set(
      profile.certifications
        .filter((c) => (c.status ?? "acquired") === "acquired")
        .map((c) => normalizeCertificationName(c.name).toLowerCase())
    );

    const userStudying = new Set(
      profile.certifications
        .filter((c) => (c.status ?? "acquired") !== "acquired")
        .map((c) => normalizeCertificationName(c.name).toLowerCase())
    );

    return Object.entries(certFreq)
      .map(([name, data]) => {
        const lower = name.toLowerCase();
        let userStatus: "acquired" | "studying" | "unplanned" = "unplanned";
        if (Array.from(userAcquired).some((a) => lower.includes(a) || a.includes(lower))) {
          userStatus = "acquired";
        } else if (Array.from(userStudying).some((s) => lower.includes(s) || s.includes(lower))) {
          userStatus = "studying";
        }

        // Deduplicate companies in context just in case
        const uniqueCompanies = Array.from(new Set(data.companyContexts.map((c) => c.company)));
        const primaryAdvice = data.companyContexts.find((c) => c.advice)?.advice || "";

        return {
          name,
          count: uniqueCompanies.length,
          companies: uniqueCompanies,
          companyContexts: data.companyContexts,
          advice: primaryAdvice,
          userStatus,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [savedJobs, profile]);

  // 4. Aggregate career trajectories across all active jobs (deduplicated by job ID)
  const careerPathways = useMemo(() => {
    const validJobs = savedJobs.filter((j) => j.careerTrajectory);
    const seenIds = new Set<string>();
    const result = [];

    for (const j of validJobs) {
      if (seenIds.has(j.metadata.id)) continue;
      seenIds.add(j.metadata.id);
      result.push({
        jobId: j.metadata.id,
        company: j.metadata.company,
        title: j.metadata.title,
        status: j.metadata.status,
        matchScore: j.metadata.matchScore,
        salaryRange: formatSalary(j.metadata.salaryMin, j.metadata.salaryMax),
        trajectory: j.careerTrajectory!,
      });
    }

    return result;
  }, [savedJobs]);

  return (
    <div className="h-full p-6 space-y-6 overflow-y-auto max-w-7xl mx-auto pb-20">
      {/* Header with Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-400" />
            🗺️ 転職ロードマップ & 選考分析ダッシュボード
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            保存・解析した全求人データから、選考進捗・見送り要因・資格獲得ロードマップ・キャリア分岐（Next Exit）を正確に集約・俯瞰します。
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {refreshSuccess && (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              最新データに更新完了
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            onClick={handleRefresh}
            className="h-8 text-xs border-indigo-500/30 text-indigo-300 hover:text-white hover:bg-indigo-600/30 flex items-center gap-1.5"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`} />
            {isRefreshing ? "再集計中..." : "🔄 データを再集計・更新"}
          </Button>
        </div>
      </div>

      {/* 1. Selection Pipeline Progress Board */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-indigo-400" />
          選考パイプライン進捗マイルストーン
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {PIPELINE_STAGES.map((st) => {
            const jobs = pipelineGroups[st.status] || [];
            return (
              <div
                key={st.status}
                className={`p-3 rounded-xl border flex flex-col justify-between min-h-[140px] bg-slate-950/70 ${st.bg}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${st.color}`}>{st.label}</span>
                    <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                      {jobs.length}件
                    </Badge>
                  </div>

                  <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {jobs.length > 0 ? (
                      jobs.map((j) => (
                        <div
                          key={j.metadata.id}
                          onClick={() => onSelectJobForPreview?.(j)}
                          className="bg-slate-900/90 hover:bg-slate-800 p-1.5 rounded-lg text-[11px] border border-slate-800 cursor-pointer transition-colors"
                          title="クリックしてプレビュー表示"
                        >
                          <div className="font-semibold text-white truncate">{j.metadata.company}</div>
                          <div className="text-[10px] text-slate-400 flex items-center justify-between">
                            <span className="font-mono text-indigo-400">{j.metadata.matchScore}点</span>
                            <span className="truncate max-w-[60px]">{j.metadata.agentSource}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-600 block text-center pt-4">案件なし</span>
                    )}
                  </div>
                </div>

                {jobs.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>平均スコア</span>
                    <span className="font-mono font-bold text-white">
                      {Math.round(jobs.reduce((sum: number, j: JobAnalysisResult) => sum + j.metadata.matchScore, 0) / jobs.length)}点
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Middle Section: Reject Reason Breakdown & Qualification Roadmap */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Qualification Acquisition Roadmap (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4 text-cyan-400" />
            🎯 求人票から逆算された資格・スキル獲得ロードマップ
          </h3>

          <Card className="border-cyan-500/20 bg-slate-950/60">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                保存された全求人の指定資格・アピール推奨資格を名寄せ・重複排除し、求人需要件数順に集約しています。
              </p>

              {certRoadmap.length > 0 ? (
                <div className="space-y-3">
                  {certRoadmap.map((item, idx: number) => (
                    <div
                      key={idx}
                      className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3.5 space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-slate-500">#{idx + 1}</span>
                          <span className="text-xs font-bold text-white leading-snug">{item.name}</span>
                          {item.userStatus === "acquired" ? (
                            <Badge variant="secondary" className="text-[10px] bg-emerald-950 border-emerald-800 text-emerald-300">
                              ✓ 取得済
                            </Badge>
                          ) : item.userStatus === "studying" ? (
                            <Badge variant="indigo" className="text-[10px] bg-cyan-950 border-cyan-800 text-cyan-300">
                              📖 学習中・目標
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">
                              💡 取得推奨
                            </Badge>
                          )}
                        </div>

                        <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-lg border border-cyan-900/60 shrink-0">
                          {item.count} 社で言及
                        </span>
                      </div>

                      {/* Specific Company Context Breakdown (どの会社がどう指定しているか) */}
                      <div className="space-y-1.5 pt-1.5 border-t border-slate-800/80">
                        <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-500" />
                          各企業の指定状況:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.companyContexts.map((ctx, cIdx) => (
                            <div
                              key={cIdx}
                              className="bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] flex items-center gap-1.5"
                            >
                              <span className="font-semibold text-slate-200">{ctx.company}</span>
                              {ctx.type === "required" ? (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 border-rose-500/40 text-rose-300 bg-rose-950/40 font-medium">
                                  必須指定
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 border-cyan-500/40 text-cyan-300 bg-cyan-950/40 font-medium">
                                  推奨アピール
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Strategic Advice */}
                      {item.advice && (
                        <p className="text-[11px] text-slate-300 bg-slate-950/90 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                          <span className="text-cyan-400 font-semibold mr-1">💡 活用アドバイス:</span>
                          {item.advice}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs">
                  求人を解析すると、求められている資格・推奨資格のロードマップがここに自動生成されます。
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Reject & Pass Reason Analysis (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-rose-400" />
            見送り・辞退要因の分析サマリ ({rejectAnalysis.total}件)
          </h3>

          <Card className="border-slate-800 bg-slate-950/60">
            <CardContent className="p-4 space-y-4">
              {rejectAnalysis.total > 0 ? (
                <>
                  <div className="space-y-2">
                    {(Object.entries(rejectAnalysis.counts) as [string, number][]).map(([reason, count]) => {
                      const pct = rejectAnalysis.total > 0 ? Math.round((count / rejectAnalysis.total) * 100) : 0;
                      return (
                        <div key={reason} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300 font-medium">{reason}</span>
                            <span className="text-slate-400 font-mono">
                              {count}件 ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-rose-500 to-amber-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Rejected Jobs List */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <span className="text-xs font-semibold text-slate-400 block">
                      見送り・辞退案件一覧
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {rejectAnalysis.jobs.map((j: JobAnalysisResult) => (
                        <div
                          key={j.metadata.id}
                          className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-white">{j.metadata.company}</span>
                            <span className="text-[11px] text-slate-500 block">
                              {j.metadata.title} ({formatSalary(j.metadata.salaryMin, j.metadata.salaryMax)})
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelectJobForPreview?.(j)}
                            className="h-6 px-1.5 text-[11px] text-slate-400 hover:text-white"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            確認
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  見送り・辞退にした求人はまだありません。
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3. Bottom Section: Career Pathways & Next Exit Strategy Across Jobs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-1.5">
              <Rocket className="h-4 w-4 text-indigo-400" />
              🚀 各社選択後のキャリア分岐・次の転職先マップ (Career Pathways)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              検討中求人に入社して2〜3年実務を積んだ後、それぞれどのようなスキルが身につき、どのキャリア（Next Exit）に繋がるのかを比較します。
            </p>
          </div>
        </div>

        {careerPathways.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {careerPathways.map((item) => {
              const originalJob = savedJobs.find((j) => j.metadata.id === item.jobId);
              return (
                <Card
                  key={item.jobId}
                  className="border-indigo-500/20 bg-slate-950/70 hover:border-indigo-500/40 transition-all flex flex-col justify-between"
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-slate-800/80 pb-2">
                      <div>
                        <h4 className="text-xs font-bold text-white truncate max-w-[180px]">
                          {item.company}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {item.title}
                        </p>
                      </div>
                      <Badge variant="indigo" className="text-[10px] font-mono shrink-0">
                        {item.matchScore}点
                      </Badge>
                    </div>

                    {/* Future Market Value */}
                    <div className="bg-slate-900/90 p-2 rounded-lg border border-indigo-500/20 text-xs flex items-center justify-between">
                      <span className="text-slate-400 font-medium">将来想定年収:</span>
                      <span className="font-mono font-bold text-emerald-400 text-[11px]">
                        {item.trajectory.marketValueProjection}
                      </span>
                    </div>

                    {/* Acquired Skills */}
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                        <Layers className="h-3 w-3 text-indigo-400" />
                        身につくスキル:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {item.trajectory.acquiredSkills.map((s, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-slate-900 text-indigo-200 px-2 py-0.5 rounded border border-slate-800"
                          >
                            💎 {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Next Exit Options */}
                    <div className="space-y-1 pt-1 border-t border-slate-800/60">
                      <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                        <Compass className="h-3 w-3 text-purple-400" />
                        次の転職先・キャリアパス:
                      </span>
                      <ul className="text-[11px] text-purple-300 space-y-0.5">
                        {item.trajectory.nextCareerOptions.map((o, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <span className="text-purple-400 font-bold">➔</span>
                            <span className="truncate">{o}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Preview Button */}
                    {originalJob && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectJobForPreview?.(originalJob)}
                        className="w-full h-7 text-xs text-indigo-300 hover:text-white hover:bg-indigo-600/30 mt-2"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        詳細プレビューを見る
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-slate-800 bg-slate-950/40 p-6 text-center text-xs text-slate-500">
            求人を解析すると、各社選択後のキャリア分岐・次の転職先候補（Next Exit）がここに集約されます。
          </Card>
        )}
      </div>
    </div>
  );
};
