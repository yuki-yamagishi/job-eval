import React, { useMemo } from "react";
import { 
  GraduationCap, 
  TrendingUp, 
  XCircle, 
  Layers, 
  Building2,
  Eye,
  Rocket,
  Compass
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
}) => {
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

  // 3. Aggregate all recommended certifications across jobs
  const certRoadmap = useMemo(() => {
    const certFreq: Record<string, { count: number; relatedCompanies: string[]; adviceSnippets: string[] }> = {};

    savedJobs.forEach((job) => {
      const certs = [
        ...(job.qualificationAdvice?.recommendedCertifications || []),
        ...(job.qualificationAdvice?.requiredCertifications || []),
      ];
      certs.forEach((c) => {
        const normalized = c.replace(/^[🎯\s]+/, "").trim();
        if (!normalized) return;
        if (!certFreq[normalized]) {
          certFreq[normalized] = { count: 0, relatedCompanies: [], adviceSnippets: [] };
        }
        certFreq[normalized].count++;
        if (!certFreq[normalized].relatedCompanies.includes(job.metadata.company)) {
          certFreq[normalized].relatedCompanies.push(job.metadata.company);
        }
        if (job.qualificationAdvice?.advice && certFreq[normalized].adviceSnippets.length < 2) {
          certFreq[normalized].adviceSnippets.push(job.qualificationAdvice.advice);
        }
      });
    });

    const userAcquired = new Set(
      profile.certifications
        .filter((c) => (c.status ?? "acquired") === "acquired")
        .map((c) => c.name.toLowerCase())
    );

    const userStudying = new Set(
      profile.certifications
        .filter((c) => (c.status ?? "acquired") !== "acquired")
        .map((c) => c.name.toLowerCase())
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
        return {
          name,
          count: data.count,
          companies: data.relatedCompanies,
          advice: data.adviceSnippets[0] || "",
          userStatus,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [savedJobs, profile]);

  // 4. Aggregate career trajectories across all active jobs
  const careerPathways = useMemo(() => {
    const validJobs = savedJobs.filter((j) => j.careerTrajectory);
    return validJobs.map((j) => ({
      jobId: j.metadata.id,
      company: j.metadata.company,
      title: j.metadata.title,
      status: j.metadata.status,
      matchScore: j.metadata.matchScore,
      salaryRange: formatSalary(j.metadata.salaryMin, j.metadata.salaryMax),
      trajectory: j.careerTrajectory!,
    }));
  }, [savedJobs]);

  return (
    <div className="h-full p-6 space-y-6 overflow-y-auto max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-400" />
          🗺️ 転職ロードマップ & 選考分析ダッシュボード
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          保存・解析した求人の選考パイプライン進捗、見送り傾向の分析、および求人票から逆算された資格獲得ロードマップを俯瞰します。
        </p>
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
                保存された全求人で求められている資格・アピール推奨資格を優先度（求人需要件数）順に集約しています。
              </p>

              {certRoadmap.length > 0 ? (
                <div className="space-y-2.5">
                  {certRoadmap.map((item, idx: number) => (
                    <div
                      key={idx}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-500">#{idx + 1}</span>
                          <span className="text-xs font-bold text-white">{item.name}</span>
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

                        <span className="text-xs font-mono font-semibold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-900/40">
                          {item.count} 社の求人で言及
                        </span>
                      </div>

                      {/* Related Companies */}
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-slate-500" />
                        <span className="text-slate-500">関連求人:</span>
                        <span className="text-slate-300 truncate max-w-md">
                          {item.companies.join(", ")}
                        </span>
                      </div>

                      {/* Advice */}
                      {item.advice && (
                        <p className="text-[11px] text-slate-300 bg-slate-950/90 p-2 rounded border border-slate-800/80 leading-relaxed">
                          <span className="text-cyan-400 font-semibold mr-1">効果:</span>
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
