import React from "react";
import { Sparkles, FileText, Settings, ShieldCheck } from "lucide-react";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 flex items-center justify-between z-30 select-none">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wide text-base">JobEval-MD</span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
              v1.0 Local
            </span>
          </div>
        </div>
      </div>

      {/* Main Nav Tabs */}
      <div className="flex items-center bg-slate-900/90 p-1 rounded-lg border border-slate-800/80 text-xs">
        <button
          onClick={() => setActiveTab("input")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-all ${
            activeTab === "input"
              ? "bg-indigo-600 text-white shadow-sm font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>求人取り込み & AI解析</span>
        </button>
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-all ${
            activeTab === "dashboard"
              ? "bg-indigo-600 text-white shadow-sm font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>求人ドキュメント一覧</span>
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-all ${
            activeTab === "profile"
              ? "bg-indigo-600 text-white shadow-sm font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          <span>プロファイル条件設定</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Local First</span>
        </div>
      </div>
    </header>
  );
};
