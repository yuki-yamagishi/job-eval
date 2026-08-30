import React, { useState, useMemo, useRef } from "react";
import { 
  FileText, 
  Search, 
  LayoutGrid, 
  Table as TableIcon, 
  Trash2, 
  Download, 
  Columns, 
  X, 
  CheckCircle2, 
  Upload,
  Eye,
  GraduationCap
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { JobAnalysisResult, JobStatus, JudgmentRank } from "@/types/job";
import { UserProfile, ScoringPresetKey, SCORING_PRESETS, DEFAULT_SCORING_WEIGHTS } from "@/types/profile";
import { recalculateScoreWithWeights } from "@/core/scoring/scoringEngine";
import { formatSalary } from "@/lib/utils";
import { useJobComparison } from "@/hooks/useJobComparison";

interface JobDashboardProps {
  savedJobs: JobAnalysisResult[];
  userProfile?: UserProfile;
  onUpdateStatus?: (id: string, status: JobStatus, rejectReason?: string) => void;
  onDeleteJob?: (id: string) => void;
  onExportJob?: (job: JobAnalysisResult) => void;
  onSelectJobForPreview?: (job: JobAnalysisResult) => void;
  onImportMarkdown?: (markdownContent: string) => Promise<void>;
}

const STATUS_LIST: JobStatus[] = [
  "未検討",
  "応募検討中",
  "応募済",
  "書類通過",
  "一次面接",
  "最終面接",
  "内定",
  "辞退",
  "見送り",
];

export const JobDashboard: React.FC<JobDashboardProps> = ({
  savedJobs,
  userProfile,
  onUpdateStatus,
  onDeleteJob,
  onExportJob,
  onSelectJobForPreview,
  onImportMarkdown,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rankFilter, setRankFilter] = useState<string>("all");
  const [selectedLens, setSelectedLens] = useState<ScoringPresetKey | "current">("current");
  const [viewLayout, setViewLayout] = useState<"table" | "grid">("table");
  const [sortBy, setSortBy] = useState<"score" | "date" | "salary">("date");
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Comparison hook
  const {
    selectedJobIds,
    selectedJobs,
    isCompareOpen,
    setIsCompareOpen,
    toggleSelectJob,
    canCompare,
  } = useJobComparison(savedJobs, 3);

  // Dynamic lens weights
  const profileWeights = userProfile?.conditions?.scoringWeights || DEFAULT_SCORING_WEIGHTS;
  const activeWeights = selectedLens === "current"
    ? profileWeights
    : SCORING_PRESETS[selectedLens]?.weights || profileWeights;

  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    return savedJobs
      .map((job) => {
        const hasNg = job.concerns?.some((c) => c.includes("NG条件")) ?? false;
        const recalculated = recalculateScoreWithWeights(job.scoreBreakdown, activeWeights, hasNg);
        const effectiveScore = selectedLens === "current" && job.metadata.matchScore !== undefined
          ? job.metadata.matchScore
          : recalculated.totalScore;
        const effectiveJudgment = selectedLens === "current" && job.metadata.judgment
          ? job.metadata.judgment
          : recalculated.judgment;

        return {
          ...job,
          effectiveScore,
          effectiveJudgment,
        };
      })
      .filter((job) => {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          !q ||
          job.metadata.company.toLowerCase().includes(q) ||
          job.metadata.title.toLowerCase().includes(q) ||
          job.metadata.tags.some((t) => t.toLowerCase().includes(q));

        const matchesStatus = statusFilter === "all" || job.metadata.status === statusFilter;
        const matchesRank =
          rankFilter === "all" || job.effectiveJudgment.startsWith(rankFilter);

        return matchesQuery && matchesStatus && matchesRank;
      })
      .sort((a, b) => {
        if (sortBy === "score") {
          return b.effectiveScore - a.effectiveScore;
        }
        if (sortBy === "salary") {
          return (b.metadata.salaryMax || 0) - (a.metadata.salaryMax || 0);
        }
        return b.metadata.dateAnalyzed.localeCompare(a.metadata.dateAnalyzed);
      });
  }, [savedJobs, searchQuery, statusFilter, rankFilter, sortBy, activeWeights, selectedLens]);

  const getRankBadgeVariant = (judgment?: JudgmentRank) => {
    if (!judgment) return "secondary";
    if (judgment.startsWith("S")) return "rankS";
    if (judgment.startsWith("A")) return "rankA";
    if (judgment.startsWith("B")) return "rankB";
    return "rankC";
  };

  return (
    <div className="h-full p-6 space-y-4 overflow-y-auto max-w-7xl mx-auto pb-16">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-400" />
            求人ドキュメント & パイプライン管理
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            保存されたMarkdown求人の選考ステータス追跡・キーワード検索・複数比較 (FR-501, FR-502, FR-503)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Markdown Import input (hidden) */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".md,.markdown,.txt"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file && onImportMarkdown) {
                try {
                  const text = await file.text();
                  await onImportMarkdown(text);
                  setImportStatus(`「${file.name}」を正常にインポートしました！`);
                  setTimeout(() => setImportStatus(null), 3000);
                } catch (err) {
                  alert("Markdownのインポートに失敗しました。書式をご確認ください。");
                }
              }
              if (e.target) e.target.value = "";
            }}
          />

          {/* Import Button */}
          {onImportMarkdown && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 text-xs border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
              MDインポート
            </Button>
          )}

          {/* Comparison trigger button */}
          {canCompare && (
            <Button
              size="sm"
              onClick={() => setIsCompareOpen(true)}
              className="h-9 text-xs bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-lg shadow-purple-500/20 animate-in fade-in"
            >
              <Columns className="h-3.5 w-3.5 mr-1.5" />
              選択求人を比較 ({selectedJobIds.length}件)
            </Button>
          )}

          {/* Layout Toggle */}
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewLayout("table")}
              className={`p-1.5 rounded-md transition-all ${
                viewLayout === "table" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
              title="テーブル表示"
            >
              <TableIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewLayout("grid")}
              className={`p-1.5 rounded-md transition-all ${
                viewLayout === "grid" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
              title="グリッド表示"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Import Toast Banner */}
      {importStatus && (
        <div className="bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-xs px-3.5 py-2 rounded-lg flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{importStatus}</span>
          </div>
          <button onClick={() => setImportStatus(null)} className="text-emerald-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
        {/* Search Box */}
        <div className="md:col-span-4 relative">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
          <Input
            placeholder="企業名、職種、技術タグ（AWS, Go等）で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-slate-900/90"
          />
        </div>

        {/* Scoring Lens Selector */}
        <div className="md:col-span-3">
          <select
            value={selectedLens}
            onChange={(e) => setSelectedLens(e.target.value as ScoringPresetKey | "current")}
            className="w-full h-9 rounded-lg border border-indigo-500/40 bg-indigo-950/40 px-3 py-1.5 text-xs text-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="current">🎯 保存時基準 ({profileWeights.skill}/{profileWeights.condition}/{profileWeights.growth}/{profileWeights.environment}%)</option>
            <option value="standard">🎯 標準バランス型 (40/30/20/10%)</option>
            <option value="reskilling">🚀 リスキリング重視 (成長45%/環境25%)</option>
            <option value="wlb_culture">🌿 カルチャー重視 (環境40%)</option>
            <option value="salary_first">💰 待遇最優先 (条件50%)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="md:col-span-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-9 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">全選考ステータス</option>
            {STATUS_LIST.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Rank Filter */}
        <div className="md:col-span-1.5">
          <select
            value={rankFilter}
            onChange={(e) => setRankFilter(e.target.value)}
            className="w-full h-9 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">全ランク</option>
            <option value="S">S (即応募)</option>
            <option value="A">A (即応募)</option>
            <option value="B">B (要確認)</option>
            <option value="C">C (見送り)</option>
          </select>
        </div>

        {/* Sort By */}
        <div className="md:col-span-1.5">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "score" | "date" | "salary")}
            className="w-full h-9 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="date">解析日順</option>
            <option value="score">スコア順</option>
            <option value="salary">年収順</option>
          </select>
        </div>
      </div>

      {/* Main Content: List / Grid / Empty */}
      {filteredJobs.length === 0 ? (
        <Card className="border-dashed border-slate-800 bg-slate-950/40 p-12 text-center">
          <FileText className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">
            {savedJobs.length === 0
              ? "保存された求人ファイルがまだありません"
              : "検索・絞り込み条件に一致する求人がありません"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {savedJobs.length === 0
              ? "「求人取り込み & AI解析」画面から求人を解析し保存するとここに一覧表示されます。"
              : "フィルター条件を変更して再検索してください。"}
          </p>
        </Card>
      ) : viewLayout === "table" ? (
        /* Table View (FR-501) */
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40 shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold">
                <th className="p-3 w-10 text-center">比較</th>
                <th className="p-3">判定 / スコア</th>
                <th className="p-3">企業名 / 職種</th>
                <th className="p-3">想定年収</th>
                <th className="p-3">ソース</th>
                <th className="p-3">選考ステータス (FR-502)</th>
                <th className="p-3">解析日</th>
                <th className="p-3 text-right">アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredJobs.map((job) => {
                const isSelected = selectedJobIds.includes(job.metadata.id);
                return (
                  <tr
                    key={job.metadata.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isSelected ? "bg-indigo-950/20" : ""
                    }`}
                  >
                    {/* Compare Checkbox */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectJob(job.metadata.id)}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        title="比較対象に選択 (最大3件)"
                      />
                    </td>

                    {/* Rank & Score */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Badge variant={getRankBadgeVariant(job.effectiveJudgment)}>
                          {job.effectiveJudgment.split(" ")[0]}
                        </Badge>
                        <span className="font-mono font-bold text-sm text-indigo-400">
                          {job.effectiveScore}点
                        </span>
                      </div>
                    </td>

                    {/* Company & Title */}
                    <td className="p-3">
                      <div className="font-semibold text-white truncate max-w-xs">
                        {job.metadata.company}
                      </div>
                      <div className="text-slate-400 text-[11px] truncate max-w-xs">
                        {job.metadata.title}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {job.metadata.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950 text-indigo-300 border border-slate-800"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Salary */}
                    <td className="p-3 whitespace-nowrap font-mono text-slate-300">
                      {formatSalary(job.metadata.salaryMin, job.metadata.salaryMax)}
                    </td>

                    {/* Source */}
                    <td className="p-3 whitespace-nowrap text-slate-400">
                      {job.metadata.agentSource}
                    </td>

                    {/* Status Dropdown (FR-502) */}
                    <td className="p-3 whitespace-nowrap">
                      <select
                        value={job.metadata.status}
                        onChange={(e) =>
                          onUpdateStatus?.(job.metadata.id, e.target.value as JobStatus)
                        }
                        className={`h-7 px-2 text-xs rounded-md font-medium border transition-all cursor-pointer ${
                          job.metadata.status === "内定"
                            ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                            : job.metadata.status === "見送り" || job.metadata.status === "辞退"
                            ? "bg-slate-900 border-slate-700 text-slate-500"
                            : job.metadata.status.includes("面接")
                            ? "bg-purple-950/80 border-purple-500/40 text-purple-300"
                            : "bg-indigo-950/80 border-indigo-500/40 text-indigo-300"
                        }`}
                      >
                        {STATUS_LIST.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Date */}
                    <td className="p-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {job.metadata.dateAnalyzed}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {onSelectJobForPreview && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelectJobForPreview(job)}
                            className="h-7 px-2 text-[11px] text-indigo-300 hover:text-white hover:bg-indigo-950/60"
                            title="プレビュー画面で再表示・再評価"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            再表示
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onExportJob?.(job)}
                          className="h-7 w-7 text-slate-400 hover:text-white"
                          title="Markdownファイルをダウンロード"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (window.confirm(`「${job.metadata.company}」の求人を削除しますか？`)) {
                              onDeleteJob?.(job.metadata.id);
                            }
                          }}
                          className="h-7 w-7 text-slate-400 hover:text-rose-400"
                          title="削除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => {
            const isSelected = selectedJobIds.includes(job.metadata.id);
            return (
              <Card
                key={job.metadata.id}
                className={`transition-all hover:border-indigo-500/40 ${
                  isSelected ? "border-indigo-500 ring-1 ring-indigo-500/40 bg-indigo-950/10" : ""
                }`}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectJob(job.metadata.id)}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        title="比較対象に選択"
                      />
                      <Badge variant={getRankBadgeVariant(job.effectiveJudgment)}>
                        {job.effectiveJudgment.split(" ")[0]}
                      </Badge>
                    </div>
                    {onSelectJobForPreview && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectJobForPreview(job)}
                        className="h-6 px-1.5 text-[11px] text-indigo-300 hover:text-white"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        再表示
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <h3 className="text-sm font-bold text-white truncate">
                        {job.metadata.company}
                      </h3>
                      <p className="text-xs text-slate-400 truncate">{job.metadata.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xl font-extrabold text-indigo-400 font-mono">
                        {job.effectiveScore}
                      </span>
                      <span className="text-[11px] text-slate-500 ml-1">点</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 text-xs space-y-2.5">
                  <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800/80 font-mono">
                    <span>{formatSalary(job.metadata.salaryMin, job.metadata.salaryMax)}</span>
                    <span className="text-slate-500 text-[11px]">{job.metadata.agentSource}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">選考ステータス:</span>
                    <select
                      value={job.metadata.status}
                      onChange={(e) =>
                        onUpdateStatus?.(job.metadata.id, e.target.value as JobStatus)
                      }
                      className="h-7 px-2 text-xs rounded-md bg-slate-950 border border-slate-700 text-indigo-300"
                    >
                      {STATUS_LIST.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-slate-500 text-[11px]">
                    <span>解析日: {job.metadata.dateAnalyzed}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onExportJob?.(job)}
                        className="h-6 w-6"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteJob?.(job.metadata.id)}
                        className="h-6 w-6 hover:text-rose-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Comparison Matrix Modal (FR-503) */}
      {isCompareOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <Columns className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  複数求人の比較マトリクス (FR-503) - {selectedJobs.length}件を比較中
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCompareOpen(false)}
                className="h-8 w-8 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Matrix Comparison Table */}
            <div className="flex-1 overflow-auto p-6">
              <div className={`grid grid-cols-${selectedJobs.length} gap-4`}>
                {selectedJobs.map((job) => (
                  <div
                    key={job.metadata.id}
                    className="flex flex-col space-y-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800"
                  >
                    {/* Header */}
                    <div className="border-b border-slate-800 pb-3">
                      <Badge variant={getRankBadgeVariant(job.metadata.judgment)}>
                        {job.metadata.judgment}
                      </Badge>
                      <h4 className="text-base font-bold text-white mt-2 truncate">
                        {job.metadata.title}
                      </h4>
                      <p className="text-xs text-slate-400">{job.metadata.company}</p>
                      <div className="text-2xl font-extrabold text-indigo-400 font-mono mt-2">
                        {job.metadata.matchScore}
                        <span className="text-xs font-normal text-slate-400"> / 100点</span>
                      </div>
                    </div>

                    {/* Basic Info */}
                    <div className="space-y-2 text-xs">
                      <div className="bg-slate-900/60 p-2 rounded">
                        <span className="text-slate-500 block text-[11px]">想定年収</span>
                        <span className="font-mono font-semibold text-slate-200">
                          {formatSalary(job.metadata.salaryMin, job.metadata.salaryMax)}
                        </span>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded">
                        <span className="text-slate-500 block text-[11px]">ソース / 選考状況</span>
                        <span className="text-slate-200">
                          {job.metadata.agentSource} • {job.metadata.status}
                        </span>
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="space-y-1.5 text-xs bg-slate-900/40 p-3 rounded-lg border border-slate-800/60">
                      <span className="text-xs font-semibold text-indigo-300 block mb-1">
                        スコア内訳
                      </span>
                      <div className="flex justify-between">
                        <span className="text-slate-400">スキル合致 (40%)</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {job.scoreBreakdown.skillMatchRatio}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">希望条件 (30%)</span>
                        <span className="font-mono font-bold text-indigo-400">
                          {job.scoreBreakdown.conditionMatchRatio}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">成長性 (20%)</span>
                        <span className="font-mono font-bold text-purple-400">
                          {job.scoreBreakdown.careerGrowthRatio}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">環境リスク (10%)</span>
                        <span className="font-mono font-bold text-amber-400">
                          {job.scoreBreakdown.environmentRiskRatio}%
                        </span>
                      </div>
                    </div>

                    {/* Positives */}
                    <div className="space-y-1 text-xs">
                      <span className="font-semibold text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        主なポジティブ要素
                      </span>
                      <ul className="list-disc list-inside text-slate-300 text-[11px] space-y-1">
                        {job.positives.slice(0, 2).map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Qualification Advice Comparison */}
                    {job.qualificationAdvice && (
                      <div className="space-y-1 text-xs bg-cyan-950/20 p-2.5 rounded-lg border border-cyan-500/20">
                        <span className="font-semibold text-cyan-300 flex items-center gap-1 text-[11px]">
                          <GraduationCap className="h-3.5 w-3.5" />
                          推奨・必要資格
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {job.qualificationAdvice.recommendedCertifications.map((c, i) => (
                            <span key={i} className="text-[10px] bg-cyan-500/20 text-cyan-200 px-1.5 py-0.5 rounded border border-cyan-500/30">
                              🎯 {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Must Requirements */}
                    <div className="space-y-1 text-xs">
                      <span className="font-semibold text-slate-300 block text-[11px]">
                        必須要件 (Must)
                      </span>
                      <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-0.5">
                        {job.jobDetails.mustRequirements.slice(0, 3).map((m, i) => (
                          <li key={i} className="truncate">{m}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCompareOpen(false)}
                className="text-xs"
              >
                閉じる
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
