import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  FileCheck, 
  Copy, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Building2, 
  Code,
  Columns,
  Check,
  Download,
  FolderOpen,
  GraduationCap,
  TrendingUp,
  Rocket,
  Compass,
  ShieldAlert,
  Layers,
  RotateCw,
  Sliders
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { JobAnalysisResult, JudgmentRank } from "@/types/job";
import { UserProfile, ScoringPresetKey, SCORING_PRESETS, DEFAULT_SCORING_WEIGHTS } from "@/types/profile";
import { getStandardMarkdownFilename, parseJobMarkdown } from "@/core/markdown/markdownGenerator";
import { recalculateScoreWithWeights } from "@/core/scoring/scoringEngine";

interface PreviewPaneProps {
  analysisResult: JobAnalysisResult | null;
  isAnalyzing: boolean;
  isReEvaluating?: boolean;
  userProfile?: UserProfile;
  onSaveMarkdown?: (markdownContent: string) => void;
  onReEvaluate?: (feedback: string) => Promise<void>;
  onGenerateCareerTrajectory?: (job: JobAnalysisResult) => Promise<void>;
}

type ViewMode = "rich" | "split" | "raw";

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  analysisResult,
  isAnalyzing,
  isReEvaluating = false,
  userProfile,
  onSaveMarkdown,
  onReEvaluate,
  onGenerateCareerTrajectory,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("rich");
  const [editedMarkdown, setEditedMarkdown] = useState<string>("");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [userFeedbackText, setUserFeedbackText] = useState("");
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isGeneratingTrajectory, setIsGeneratingTrajectory] = useState(false);

  const [selectedLens, setSelectedLens] = useState<ScoringPresetKey | "current">("current");

  // Sync markdown content when analysisResult changes
  useEffect(() => {
    if (analysisResult?.markdownContent) {
      setEditedMarkdown(analysisResult.markdownContent);
    }
  }, [analysisResult]);

  const showCopyToast = (msg: string) => {
    setCopyStatus(msg);
    setTimeout(() => setCopyStatus(null), 2500);
  };

  const handleCopyFull = () => {
    if (editedMarkdown) {
      navigator.clipboard.writeText(editedMarkdown);
      showCopyToast("Markdown全文をコピーしました");
    }
  };

  const handleCopyQuestions = () => {
    if (analysisResult?.agentQuestions && analysisResult.agentQuestions.length > 0) {
      const text = analysisResult.agentQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n");
      navigator.clipboard.writeText(text);
      showCopyToast("エージェントへの逆質問をコピーしました");
    }
  };

  const handleCopyAppealPoints = () => {
    if (analysisResult?.appealPoints && analysisResult.appealPoints.length > 0) {
      const text = analysisResult.appealPoints.map((a) => `- ${a}`).join("\n");
      navigator.clipboard.writeText(text);
      showCopyToast("応募時アピールポイントをコピーしました");
    }
  };

  const handleSave = () => {
    if (editedMarkdown && onSaveMarkdown) {
      onSaveMarkdown(editedMarkdown);
    }
  };

  const getRankBadgeVariant = (judgment?: JudgmentRank) => {
    if (!judgment) return "secondary";
    if (judgment.startsWith("S")) return "rankS";
    if (judgment.startsWith("A")) return "rankA";
    if (judgment.startsWith("B")) return "rankB";
    return "rankC";
  };

  if (isAnalyzing) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 space-y-4 text-center">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <Sparkles className="h-6 w-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-200">AIが求人票を構造化 & 評価中...</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            職務要件の抽出、多軸スコアリング、リスク判定、エージェント逆質問文を自動生成しています。
          </p>
        </div>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-800 rounded-xl m-4 bg-slate-950/40">
        <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3">
          <FileCheck className="h-6 w-6 text-slate-500" />
        </div>
        <h3 className="text-sm font-semibold text-slate-300">解析結果のリアルタイムプレビュー</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          左ペインに求人情報を入力し「AI解析 & Markdown生成」ボタンを押すと、ここに判定結果・スプリット編集・Obsidian Vault保存が表示されます。
        </p>
      </div>
    );
  }

  const { metadata, scoreBreakdown, positives, concerns, agentQuestions, appealPoints } = analysisResult;
  const standardFilename = getStandardMarkdownFilename(metadata);
  const parsedMarkdown = parseJobMarkdown(editedMarkdown);

  // Dynamic lens recalculation
  const profileWeights = userProfile?.conditions?.scoringWeights || DEFAULT_SCORING_WEIGHTS;
  const activeWeights = selectedLens === "current" 
    ? profileWeights 
    : SCORING_PRESETS[selectedLens]?.weights || profileWeights;

  const hasNg = concerns?.some((c) => c.includes("NG条件")) ?? false;
  const recalculated = recalculateScoreWithWeights(scoreBreakdown, activeWeights, hasNg);
  const displayScore = selectedLens === "current" && metadata.matchScore !== undefined 
    ? metadata.matchScore 
    : recalculated.totalScore;
  const displayJudgment = selectedLens === "current" && metadata.judgment 
    ? metadata.judgment 
    : recalculated.judgment;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-950/60 relative">
      {/* Toast Notification */}
      {copyStatus && (
        <div className="absolute top-14 right-4 bg-indigo-600 text-white text-xs px-3.5 py-2 rounded-lg shadow-xl flex items-center gap-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
          <Check className="h-3.5 w-3.5" />
          <span>{copyStatus}</span>
        </div>
      )}

      {/* Top Bar Actions */}
      <div className="h-12 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/70 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant={getRankBadgeVariant(displayJudgment)}>
            {displayJudgment}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span className="font-semibold text-slate-200 truncate max-w-[200px]">
              {metadata.company}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-[11px] font-mono text-slate-400 truncate max-w-[180px]">
              {standardFilename}
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md font-medium">
            <CheckCircle2 className="h-3 w-3" />
            ローカル保存済
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode("rich")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === "rich" ? "bg-indigo-600 text-white shadow-sm font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              リッチ表示
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                viewMode === "split" ? "bg-indigo-600 text-white shadow-sm font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Columns className="h-3 w-3" />
              スプリット編集
            </button>
            <button
              onClick={() => setViewMode("raw")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                viewMode === "raw" ? "bg-indigo-600 text-white shadow-sm font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Code className="h-3 w-3" />
              Markdown
            </button>
          </div>

          {/* Quick Copy Dropdown / Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyFull}
            className="h-8 text-xs border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            全文コピー
          </Button>

          {/* Save to Vault / Local Button */}
          <Button
            size="sm"
            onClick={handleSave}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md font-semibold"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Obsidian/Vault保存
          </Button>
        </div>
      </div>

      {/* Main Content Area based on View Mode */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Mode 1: Rich Summary View */}
        {viewMode === "rich" && (
          <>
            {/* Dynamic Lens / Weighting Simulation Selector */}
            <div className="bg-slate-900/80 border border-indigo-500/20 p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-semibold">
                <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                <span>評価視点 (Lens):</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  onClick={() => setSelectedLens("current")}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                    selectedLens === "current"
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-sm font-semibold"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  🎯 保存時基準 ({profileWeights.skill}/{profileWeights.condition}/{profileWeights.growth}/{profileWeights.environment}%)
                </button>
                <button
                  onClick={() => setSelectedLens("reskilling")}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                    selectedLens === "reskilling"
                      ? "bg-cyan-600 text-white border-cyan-500 shadow-sm font-semibold"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  🚀 リスキリング重視 (成長45% / 環境25%)
                </button>
                <button
                  onClick={() => setSelectedLens("wlb_culture")}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                    selectedLens === "wlb_culture"
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-sm font-semibold"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  🌿 カルチャー・WLB重視 (環境40%)
                </button>
                <button
                  onClick={() => setSelectedLens("salary_first")}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                    selectedLens === "salary_first"
                      ? "bg-amber-600 text-white border-amber-500 shadow-sm font-semibold"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  💰 待遇重視 (条件50%)
                </button>
              </div>
            </div>

            {/* AI Summary Header Card */}
            <Card className="border-indigo-500/20 bg-gradient-to-r from-slate-900/90 via-slate-900/95 to-slate-950/90">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium mb-1">
                      <Building2 className="h-3.5 w-3.5" />
                      <span>{metadata.agentSource} 求人票</span>
                      <span>•</span>
                      <span>解析日: {metadata.dateAnalyzed}</span>
                      {selectedLens !== "current" && (
                        <span className="text-cyan-300 bg-cyan-950/60 border border-cyan-800 px-1.5 py-0.2 rounded text-[10px]">
                          ⚡ 視点シミュレーション中
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      {metadata.title}
                    </h2>
                    <p className="text-xs text-slate-300 font-medium">
                      {metadata.company}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-medium">
                      {selectedLens === "current" ? "総合適合スコア" : "シミュレーションスコア"}
                    </div>
                    <div className="text-3xl font-extrabold text-indigo-400 font-mono tracking-tight">
                      {displayScore}
                      <span className="text-sm font-normal text-slate-400"> / 100</span>
                    </div>
                  </div>
                </div>

                {/* Score Breakdown Bar */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 block text-[11px]">スキル合致 ({activeWeights.skill}%)</span>
                    <span className="font-bold text-emerald-400 font-mono text-sm">{scoreBreakdown.skillMatchRatio}%</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 block text-[11px]">希望条件 ({activeWeights.condition}%)</span>
                    <span className="font-bold text-indigo-400 font-mono text-sm">{scoreBreakdown.conditionMatchRatio}%</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 block text-[11px]">キャリア成長 ({activeWeights.growth}%)</span>
                    <span className="font-bold text-cyan-400 font-mono text-sm">{scoreBreakdown.careerGrowthRatio}%</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 block text-[11px]">環境・リスク ({activeWeights.environment}%)</span>
                    <span className="font-bold text-amber-400 font-mono text-sm">{scoreBreakdown.environmentRiskRatio}%</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {metadata.tags.map((tag) => (
                    <Badge key={tag} variant="indigo" className="text-[11px] px-2 py-0.5">
                      #{tag}
                    </Badge>
                  ))}
                </div>

                {/* Feedback History If Exists */}
                {analysisResult.feedbackHistory && analysisResult.feedbackHistory.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    <span className="text-[11px] font-semibold text-indigo-300 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      フィードバック反映履歴 ({analysisResult.feedbackHistory.length}件)
                    </span>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {analysisResult.feedbackHistory.map((fb, idx) => (
                        <div key={idx} className="bg-slate-950/80 p-1.5 rounded text-[11px] flex items-center justify-between border border-slate-800">
                          <span className="text-slate-300 truncate max-w-[320px]">💬 {fb.feedback}</span>
                          <span className="text-indigo-400 font-mono font-bold shrink-0 ml-2">
                            {fb.previousScore}点 ➔ {fb.newScore}点
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Feedback & Re-evaluation Card */}
            <Card className="border-indigo-500/30 bg-slate-900/60 shadow-md">
              <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  💡 AI評価へのフィードバック & 再評価
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFeedbackOpen(!isFeedbackOpen)}
                  className="h-6 text-[11px] text-indigo-400 hover:text-white"
                >
                  {isFeedbackOpen ? "閉じる" : "＋ フィードバックを入力"}
                </Button>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2.5">
                {isFeedbackOpen ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="例: 「必須要件のPythonは独学＋個人開発で1年実績があります」「年収650万円以上であれば許容できます」「オンコール対応も可能です」"
                      value={userFeedbackText}
                      onChange={(e) => setUserFeedbackText(e.target.value)}
                      className="text-xs min-h-[70px] bg-slate-950 border-slate-700"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsFeedbackOpen(false)}
                        className="h-7 text-xs border-slate-700"
                      >
                        キャンセル
                      </Button>
                      <Button
                        size="sm"
                        disabled={!userFeedbackText.trim() || isReEvaluating}
                        onClick={async () => {
                          if (onReEvaluate && userFeedbackText.trim()) {
                            await onReEvaluate(userFeedbackText.trim());
                            setUserFeedbackText("");
                            setIsFeedbackOpen(false);
                          }
                        }}
                        className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                      >
                        {isReEvaluating ? "再計算中..." : "🚀 フィードバックを反映して再評価"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    「実はこのスキルの経験がある」「この希望条件は許容できる」などのフィードバックを入力すると、AIが適合スコアやアピールポイントを即座に再計算・更新します。
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Positives & Concerns */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-emerald-500/20 bg-emerald-950/10">
                <CardHeader className="p-3 pb-2 border-emerald-500/20">
                  <CardTitle className="text-xs text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ポジティブ要素 (アピール点)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <ul className="text-xs space-y-1.5 text-slate-300">
                    {positives.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-amber-500/20 bg-amber-950/10">
                <CardHeader className="p-3 pb-2 border-amber-500/20">
                  <CardTitle className="text-xs text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    懸念点・リスク要素
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <ul className="text-xs space-y-1.5 text-slate-300">
                    {concerns.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Agent Questions with dedicated Copy Button */}
            <Card className="border-indigo-500/20 bg-slate-900/60">
              <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between border-b border-slate-800/80">
                <CardTitle className="text-xs text-indigo-300 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
                  エージェントへの逆質問・確認事項 (手戻り防止)
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyQuestions}
                  className="h-6 text-[11px] px-2 text-indigo-300 hover:text-white hover:bg-indigo-600/30"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  質問のみコピー
                </Button>
              </CardHeader>
              <CardContent className="p-3 pt-2">
                <ol className="text-xs space-y-1.5 text-slate-300">
                  {agentQuestions.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-slate-950/40 p-2 rounded border border-slate-800/60">
                      <span className="font-mono font-bold text-indigo-400 text-xs shrink-0">{idx + 1}.</span>
                      <span className="leading-relaxed">{q}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* Appeal Points with dedicated Copy Button */}
            <Card className="border-purple-500/20 bg-slate-900/60">
              <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between border-b border-slate-800/80">
                <CardTitle className="text-xs text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  応募時アピールポイント案
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyAppealPoints}
                  className="h-6 text-[11px] px-2 text-purple-300 hover:text-white hover:bg-purple-600/30"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  アピール点コピー
                </Button>
              </CardHeader>
              <CardContent className="p-3 pt-2">
                <ul className="text-xs space-y-1.5 text-slate-300">
                  {appealPoints.map((ap, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-slate-950/40 p-2 rounded border border-slate-800/60">
                      <span className="font-bold text-purple-400 text-xs shrink-0">•</span>
                      <span className="leading-relaxed">{ap}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Qualification & Skill Gap Advice Card */}
            {analysisResult.qualificationAdvice && (
              <Card className="border-cyan-500/25 bg-gradient-to-br from-slate-900/90 via-slate-900/95 to-cyan-950/20">
                <CardHeader className="p-3 pb-2 border-b border-slate-800/80">
                  <CardTitle className="text-xs text-cyan-300 flex items-center gap-1.5 font-semibold">
                    <GraduationCap className="h-4 w-4 text-cyan-400" />
                    資格・スキルギャップ補強アクション (求人最適化アドバイス)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-2 space-y-2.5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {/* Required / Mentioned Certs */}
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                      <span className="text-[11px] text-slate-400 font-medium block mb-1">
                        求人票の指定・関連資格
                      </span>
                      {analysisResult.qualificationAdvice.requiredCertifications.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {analysisResult.qualificationAdvice.requiredCertifications.map((c, i) => (
                            <Badge key={i} variant="secondary" className="text-[11px] px-2 py-0.5 bg-slate-800 text-slate-200">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">特になし（実務経験重視）</span>
                      )}
                    </div>

                    {/* Recommended Certs to Gain */}
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-cyan-500/20">
                      <span className="text-[11px] text-cyan-300 font-medium block mb-1">
                        アピール強化・推奨取得資格
                      </span>
                      {analysisResult.qualificationAdvice.recommendedCertifications.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {analysisResult.qualificationAdvice.recommendedCertifications.map((c, i) => (
                            <Badge key={i} variant="indigo" className="text-[11px] px-2 py-0.5 bg-cyan-500/20 text-cyan-200 border-cyan-500/40 font-medium">
                              🎯 {c}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">現状の保有資格で十分アピール可能</span>
                      )}
                    </div>
                  </div>

                  {/* Strategic Advice Text */}
                  {analysisResult.qualificationAdvice.advice && (
                    <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed">
                      <span className="text-cyan-400 font-semibold mr-1.5">💡 戦略アドバイス:</span>
                      <span>{analysisResult.qualificationAdvice.advice}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Career Trajectory Card (中長期キャリア展望 & 次の転職先) */}
            {analysisResult.careerTrajectory ? (
              <Card className="border-indigo-500/30 bg-gradient-to-br from-slate-900/95 via-indigo-950/20 to-purple-950/30 shadow-lg shadow-indigo-950/20">
                <CardHeader className="p-3.5 pb-2.5 border-b border-indigo-500/20 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs text-indigo-300 flex items-center gap-1.5 font-bold">
                    <Rocket className="h-4 w-4 text-indigo-400" />
                    🚀 入社後のキャリア展望 & 次のキャリアパス (Career Trajectory)
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="indigo" className="text-[10px] bg-indigo-950 border-indigo-700/60 text-indigo-300">
                      2〜3年後の市場価値
                    </Badge>
                    {onGenerateCareerTrajectory && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isGeneratingTrajectory}
                        onClick={async () => {
                          if (!analysisResult) return;
                          setIsGeneratingTrajectory(true);
                          try {
                            await onGenerateCareerTrajectory(analysisResult);
                          } finally {
                            setIsGeneratingTrajectory(false);
                          }
                        }}
                        className="h-6 px-2 text-[10px] text-indigo-300 hover:text-white hover:bg-indigo-600/30 border border-indigo-500/30"
                      >
                        <RotateCw className={`h-3 w-3 mr-1 ${isGeneratingTrajectory ? "animate-spin" : ""}`} />
                        {isGeneratingTrajectory ? "再生成中..." : "再生成"}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-3.5 pt-3 space-y-3">
                  {/* Market Value & Future Salary */}
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-indigo-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs text-slate-300 font-semibold">将来の想定市場価値:</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/40">
                      {analysisResult.careerTrajectory.marketValueProjection}
                    </span>
                  </div>

                  {/* 2-3 Years Acquired Skills */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                      <Layers className="h-3.5 w-3.5 text-indigo-400" />
                      <span>2〜3年で身につく市場価値の高い希少スキル:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {analysisResult.careerTrajectory.acquiredSkills.map((skill, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-[11px] px-2.5 py-1 bg-slate-900 border border-indigo-500/30 text-indigo-200 font-medium"
                        >
                          💎 {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Next Career Options (Next Exit) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                      <Compass className="h-3.5 w-3.5 text-purple-400" />
                      <span>この会社を経て次に狙える上位職種・進路 (Next Exit):</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {analysisResult.careerTrajectory.nextCareerOptions.map((opt, i) => (
                        <div
                          key={i}
                          className="bg-slate-950/60 p-2 rounded-lg border border-purple-500/20 text-xs text-purple-200 flex items-center gap-1.5"
                        >
                          <span className="text-purple-400 font-bold">➔</span>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Career Risks / Lock-in */}
                  {analysisResult.careerTrajectory.careerRisksOrLockin && (
                    <div className="bg-amber-950/20 p-2.5 rounded-lg border border-amber-500/30 text-xs text-amber-200 leading-relaxed flex items-start gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-amber-300 block mb-0.5">キャリア上の留意点・リスク:</span>
                        <span>{analysisResult.careerTrajectory.careerRisksOrLockin}</span>
                      </div>
                    </div>
                  )}

                  {/* Overall Outlook */}
                  {analysisResult.careerTrajectory.overallOutlook && (
                    <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed">
                      <span className="text-indigo-400 font-semibold mr-1.5">🎯 中長期戦略総括:</span>
                      <span>{analysisResult.careerTrajectory.overallOutlook}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* On-Demand Generate Banner */
              <Card className="border-indigo-500/30 bg-gradient-to-r from-slate-950 via-indigo-950/20 to-purple-950/20 border-dashed">
                <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <Rocket className="h-4 w-4 text-indigo-400" />
                      🚀 中長期キャリア展望・次の転職先 (Career Trajectory)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      この求人に入社した場合の「2〜3年で身につく希少スキル」「次の転職先候補」「将来想定年収」をAI専用プロンプトで深掘り生成します。
                    </p>
                  </div>
                  {onGenerateCareerTrajectory && (
                    <Button
                      size="sm"
                      disabled={isGeneratingTrajectory}
                      onClick={async () => {
                        if (!analysisResult) return;
                        setIsGeneratingTrajectory(true);
                        try {
                          await onGenerateCareerTrajectory(analysisResult);
                        } finally {
                          setIsGeneratingTrajectory(false);
                        }
                      }}
                      className="shrink-0 h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                    >
                      {isGeneratingTrajectory ? (
                        <>
                          <Sparkles className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          展望を生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                          ✨ キャリア展望をAI生成
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Full Markdown Render Preview */}
            <Card className="border-slate-800 bg-slate-900/40">
              <CardHeader className="p-3 pb-2 border-slate-800 flex flex-row items-center justify-between">
                <CardTitle className="text-xs text-slate-400 flex items-center gap-1.5">
                  <FileCheck className="h-3.5 w-3.5 text-slate-400" />
                  レンダリング表示 (生成されたMarkdown)
                </CardTitle>
                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                  <FolderOpen className="h-3 w-3" />
                  Obsidian / Logseq 互換
                </div>
              </CardHeader>
              <CardContent className="p-4 markdown-body text-xs">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {parsedMarkdown.body}
                </ReactMarkdown>
              </CardContent>
            </Card>
          </>
        )}

        {/* Mode 2: Live Split Editor Mode (FR-402) */}
        {viewMode === "split" && (
          <div className="grid grid-cols-2 gap-4 h-[calc(100vh-140px)]">
            <div className="flex flex-col h-full space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-indigo-300">
                  Markdown エディタ (メモ追記・手動編集)
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {editedMarkdown.length} 文字
                </span>
              </div>
              <Textarea
                value={editedMarkdown}
                onChange={(e) => setEditedMarkdown(e.target.value)}
                className="flex-1 h-full resize-none font-mono text-xs leading-relaxed bg-slate-950 p-3"
                placeholder="Markdownを直接編集..."
              />
            </div>
            <div className="flex flex-col h-full space-y-2 overflow-hidden">
              <label className="text-xs font-semibold text-slate-400">
                リアルタイム同期プレビュー
              </label>
              <div className="flex-1 overflow-y-auto bg-slate-950/80 p-4 rounded-xl border border-slate-800 markdown-body text-xs">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {parsedMarkdown.body}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* Mode 3: Raw Markdown Mode */}
        {viewMode === "raw" && (
          <div className="h-full bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-mono text-slate-400">Raw Frontmatter + Markdown</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyFull}
                className="h-7 text-xs border-slate-700"
              >
                <Copy className="h-3 w-3 mr-1" />
                コピー
              </Button>
            </div>
            <pre className="text-xs font-mono text-indigo-200 leading-relaxed overflow-x-auto whitespace-pre-wrap select-all">
              {editedMarkdown}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
