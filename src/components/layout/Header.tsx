import React from "react";
import { Sparkles, FileText, Settings, ShieldCheck, Radio, Briefcase } from "lucide-react";
import { SyncStatusInfo } from "@/types/sync";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  savedJobCount?: number;
  syncStatus?: SyncStatusInfo;
  onOpenSyncModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  setActiveTab, 
  savedJobCount,
  syncStatus,
  onOpenSyncModal,
}) => {
  const isSyncConnected = syncStatus?.state === "connected" && Boolean(syncStatus.roomId);

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-2 sm:px-4 flex items-center justify-between z-30 select-none">
      {/* Brand Logo */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-bold text-white tracking-wide text-sm sm:text-base">JobEval</span>
            <span className="hidden sm:inline-block text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-1.5 py-0.5 rounded border border-indigo-500/30">
              v1.0
            </span>
          </div>
        </div>
      </div>

      {/* Main Nav Tabs */}
      <div className="flex items-center bg-slate-900/90 p-1 rounded-lg border border-slate-800/80 text-xs overflow-x-auto max-w-[70vw] sm:max-w-none">
        <button
          onClick={() => setActiveTab("input")}
          title="求人取り込み & AI解析"
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md font-medium transition-all shrink-0 ${
            activeTab === "input"
              ? "bg-indigo-600 text-white shadow-sm font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:inline">求人取り込み & AI解析</span>
          <span className="inline md:hidden text-[11px]">解析</span>
        </button>
        <button
          onClick={() => setActiveTab("dashboard")}
          title="求人ドキュメント一覧"
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md font-medium transition-all shrink-0 ${
            activeTab === "dashboard"
              ? "bg-indigo-600 text-white shadow-sm font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:inline">求人ドキュメント一覧</span>
          <span className="inline md:hidden text-[11px]">一覧</span>
          {savedJobCount !== undefined && savedJobCount > 0 && (
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                activeTab === "dashboard"
                  ? "bg-white/20 text-white"
                  : "bg-slate-800 text-indigo-300 border border-slate-700"
              }`}
            >
              {savedJobCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("roadmap")}
          title="転職ロードマップ"
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md font-medium transition-all shrink-0 ${
            activeTab === "roadmap"
              ? "bg-indigo-600 text-white shadow-sm font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="text-xs shrink-0">🗺️</span>
          <span className="hidden md:inline">転職ロードマップ</span>
          <span className="inline md:hidden text-[11px]">マップ</span>
        </button>
        <button
          onClick={() => setActiveTab("career")}
          title="職務経歴・プロジェクト実績"
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md font-medium transition-all shrink-0 ${
            activeTab === "career"
              ? "bg-indigo-600 text-white shadow-sm font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Briefcase className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:inline">職務経歴・実績</span>
          <span className="inline md:hidden text-[11px]">経歴</span>
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          title="プロファイル条件設定"
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md font-medium transition-all shrink-0 ${
            activeTab === "profile"
              ? "bg-indigo-600 text-white shadow-sm font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Settings className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:inline">プロファイル条件設定</span>
          <span className="inline md:hidden text-[11px]">設定</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Real-time Sync Status Button */}
        {onOpenSyncModal && (
          <button
            onClick={onOpenSyncModal}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
              isSyncConnected
                ? "bg-emerald-950/60 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/60 shadow-sm"
                : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
            title={isSyncConnected ? `同期ルーム: ${syncStatus?.roomId}` : "端末間リアルタイム同期を設定"}
          >
            <Radio className={`h-3.5 w-3.5 ${isSyncConnected ? "text-emerald-400 animate-pulse" : "text-slate-500"}`} />
            <span className="text-[11px] font-medium hidden sm:inline">
              {isSyncConnected ? `${syncStatus?.roomId}` : "端末同期"}
            </span>
          </button>
        )}

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Local First</span>
        </div>
      </div>
    </header>
  );
};
