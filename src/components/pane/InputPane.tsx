import React, { useState } from "react";
import { Clipboard, Sparkles, ArrowRight, Zap, RefreshCw, Key, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgentSource } from "@/types/job";

interface InputPaneProps {
  onAnalyze: (text: string, source: AgentSource) => void;
  isAnalyzing: boolean;
  hasApiKey?: boolean;
}

const SOURCES: AgentSource[] = [
  "レバテックキャリア",
  "ビズリーチ",
  "doda",
  "リクルートエージェント",
  "マイナビIT",
  "直接応募",
  "その他",
];

const SAMPLE_JOB_TEXT = `【求人概要】
企業名: 株式会社サンプルテクノロジーズ
ポジション: クラウドアーキテクト / バックエンドリード
想定年収: 800万円〜1,100万円
勤務地: 東京都港区（フルリモート勤務可）

【業務内容】
・全社基幹システムのクラウドネイティブ化およびマイクロサービス化推進
・IaC (Terraform) によるインフラ構成管理とCI/CD基盤の刷新
・開発組織全体の生産性向上およびアーキテクチャ標準化の策定

【必須要件 (Must)】
・パブリッククラウド (Azure / AWS) の設計・構築経験 3年以上
・Go / Python 等を用いたWebアプリケーション開発経験
・CI/CDパイプラインの構築・運用経験

【歓迎要件 (Want)】
・クラウド認定資格 (AZ-305, AZ-400等) 保有
・マイクロサービスアーキテクチャの設計・移行実績
・オープンソースへのコントリビューション経験`;

export const InputPane: React.FC<InputPaneProps> = ({ onAnalyze, isAnalyzing, hasApiKey = false }) => {
  const [jobText, setJobText] = useState("");
  const [selectedSource, setSelectedSource] = useState<AgentSource>("レバテックキャリア");
  const [clipboardStatus, setClipboardStatus] = useState<string | null>(null);

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setJobText(text);
          setClipboardStatus("クリップボードから読み込みました");
          setTimeout(() => setClipboardStatus(null), 3000);
        } else {
          setClipboardStatus("クリップボードは空です");
          setTimeout(() => setClipboardStatus(null), 3000);
        }
      }
    } catch {
      setClipboardStatus("ペーストアクセス許可が拒否されました");
      setTimeout(() => setClipboardStatus(null), 3000);
    }
  };

  const handleLoadSample = () => {
    setJobText(SAMPLE_JOB_TEXT);
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
      {/* Header & Quick Action */}
      <Card className="border-indigo-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-indigo-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              求人テキスト取り込み
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasApiKey ? (
                <Badge variant="rankA" className="text-[10px] px-2 py-0.5 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Gemini API 有効
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 flex items-center gap-1 text-slate-400">
                  <Key className="h-3 w-3" />
                  Mock モード
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePasteClipboard}
                className="h-8 text-xs border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-300"
              >
                <Clipboard className="h-3.5 w-3.5 mr-1" />
                貼付
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadSample}
                className="h-8 text-xs text-slate-400 hover:text-slate-200"
              >
                サンプル
              </Button>
            </div>
          </div>
          <CardDescription>
            エージェントメールやWeb求人票のテキストをそのまま貼り付けてください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {clipboardStatus && (
            <div className="text-xs text-indigo-300 bg-indigo-950/50 border border-indigo-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2 animate-in fade-in duration-200">
              <Zap className="h-3.5 w-3.5 text-indigo-400" />
              {clipboardStatus}
            </div>
          )}

          {/* Source Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block">
              エージェント / ソース種別 (FR-103)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SOURCES.map((source) => (
                <button
                  key={source}
                  onClick={() => setSelectedSource(source)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                    selectedSource === source
                      ? "bg-indigo-600 text-white font-semibold shadow-sm"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {source}
                </button>
              ))}
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400">
                求人本文テキスト (FR-102)
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                {jobText.length} 文字
              </span>
            </div>
            <Textarea
              placeholder="求人票の本文、募集要項、スカウトメッセージ等を貼り付け..."
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              className="h-72 resize-none text-xs leading-relaxed"
            />
          </div>
        </CardContent>
        <CardFooter className="pt-2 flex justify-between items-center">
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            完全ローカルファースト処理
          </div>
          <Button
            onClick={() => onAnalyze(jobText, selectedSource)}
            disabled={!jobText.trim() || isAnalyzing}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 px-6 font-semibold"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin text-white" />
                AI解析中...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2 text-indigo-200" />
                AI解析 & Markdown生成
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
