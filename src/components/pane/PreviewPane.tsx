import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  FileCheck, 
  Copy, 
  Save, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Building2, 
  Code
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JobAnalysisResult, JudgmentRank } from "@/types/job";

interface PreviewPaneProps {
  analysisResult: JobAnalysisResult | null;
  isAnalyzing: boolean;
  onSaveMarkdown?: (markdownContent: string) => void;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  analysisResult,
  isAnalyzing,
  onSaveMarkdown,
}) => {
  const [viewMode, setViewMode] = useState<"preview" | "raw">("preview");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (analysisResult?.markdownContent) {
      navigator.clipboard.writeText(analysisResult.markdownContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
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
            職務要件の抽出、100点満点スコアリング、リスク判定、エージェントへの確認質問文を自動生成しています。
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
          左ペインに求人情報を入力し「AI解析 & Markdown生成」ボタンを押すと、ここに判定結果とMarkdownプレビューが表示されます。
        </p>
      </div>
    );
  }

  const { metadata, scoreBreakdown, positives, concerns, agentQuestions, appealPoints, markdownContent } = analysisResult;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-950/60">
      {/* Top Bar Actions */}
      <div className="h-12 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/60 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant={getRankBadgeVariant(metadata.judgment)}>
            {metadata.judgment}
          </Badge>
          <span className="text-xs font-semibold text-slate-200 truncate max-w-[220px]">
            {metadata.company} - {metadata.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode("preview")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === "preview" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              リッチ表示
            </button>
            <button
              onClick={() => setViewMode("raw")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                viewMode === "raw" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Code className="h-3 w-3" />
              Markdown
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-8 text-xs border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            {copied ? "コピー完了" : "コピー"}
          </Button>

          <Button
            size="sm"
            onClick={() => onSaveMarkdown?.(markdownContent)}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm font-medium"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            Obsidian/ローカル保存
          </Button>
        </div>
      </div>

      {/* Main Preview Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {viewMode === "preview" ? (
          <>
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
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      {metadata.title}
                    </h2>
                    <p className="text-xs text-slate-300 font-medium">
                      {metadata.company}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-medium">総合適合スコア</div>
                    <div className="text-3xl font-extrabold text-indigo-400 font-mono tracking-tight">
                      {metadata.matchScore}
                      <span className="text-sm font-normal text-slate-400"> / 100</span>
                    </div>
                  </div>
                </div>

                {/* Score Breakdown Bar */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 block text-[11px]">スキル合致 (40%)</span>
                    <span className="font-bold text-emerald-400 font-mono text-sm">{scoreBreakdown.skillMatchRatio}%</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 block text-[11px]">希望条件 (30%)</span>
                    <span className="font-bold text-indigo-400 font-mono text-sm">{scoreBreakdown.conditionMatchRatio}%</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 block text-[11px]">キャリア成長 (20%)</span>
                    <span className="font-bold text-purple-400 font-mono text-sm">{scoreBreakdown.careerGrowthRatio}%</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 block text-[11px]">環境リスク (10%)</span>
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

            {/* Agent Questions */}
            <Card className="border-indigo-500/20 bg-slate-900/60">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-xs text-indigo-300 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
                  エージェントへの逆質問・確認事項 (手戻り防止)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
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

            {/* Appeal Points */}
            <Card className="border-purple-500/20 bg-slate-900/60">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-xs text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  応募時アピールポイント案
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
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

            {/* Full Markdown Render Preview */}
            <Card className="border-slate-800 bg-slate-900/40">
              <CardHeader className="p-3 pb-2 border-slate-800">
                <CardTitle className="text-xs text-slate-400 flex items-center gap-1.5">
                  <FileCheck className="h-3.5 w-3.5 text-slate-400" />
                  レンダリング表示 (生成されたMarkdown)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 markdown-body text-xs">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {markdownContent}
                </ReactMarkdown>
              </CardContent>
            </Card>
          </>
        ) : (
          /* Raw Markdown Editor/Viewer */
          <div className="h-full bg-slate-950 p-4 rounded-xl border border-slate-800">
            <pre className="text-xs font-mono text-indigo-200 leading-relaxed overflow-x-auto whitespace-pre-wrap">
              {markdownContent}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
