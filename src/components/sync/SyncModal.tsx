import React, { useState, useEffect } from "react";
import { 
  Smartphone, 
  Laptop, 
  QrCode, 
  RefreshCw, 
  Check, 
  Copy, 
  ShieldCheck, 
  X, 
  Radio 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SyncStatusInfo, CloudSyncConfig } from "@/types/sync";

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: SyncStatusInfo;
  syncConfig: CloudSyncConfig;
  onUpdateConfig: (config: CloudSyncConfig) => Promise<void>;
  onGenerateRoomId: () => string;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  syncStatus,
  syncConfig,
  onUpdateConfig,
  onGenerateRoomId,
}) => {
  const [inputRoomId, setInputRoomId] = useState(syncConfig.roomId || "");
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setInputRoomId(syncConfig.roomId || "");
  }, [syncConfig.roomId]);

  if (!isOpen) return null;

  // Ensure shareable URL points to the public cloud deployment (job-eval.pages.dev)
  // even when the user is running on localhost, 127.0.0.1, or Tauri desktop app.
  const getShareableUrl = (roomId: string): string => {
    if (!roomId) return "";
    const publicCloudOrigin = "https://job-eval.pages.dev";
    if (typeof window === "undefined") return `${publicCloudOrigin}?sync=${encodeURIComponent(roomId)}`;
    
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "" || window.location.protocol === "tauri:";
    const origin = isLocal ? publicCloudOrigin : window.location.origin;
    return `${origin}?sync=${encodeURIComponent(roomId)}`;
  };

  const shareableUrl = inputRoomId ? getShareableUrl(inputRoomId) : "";

  const handleCopyUrl = async () => {
    if (!shareableUrl) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareableUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (e) {
      console.warn("Failed to copy URL", e);
    }
  };

  const handleGenerate = () => {
    const newRoom = onGenerateRoomId();
    setInputRoomId(newRoom);
  };

  const handleConnect = async () => {
    if (!inputRoomId.trim()) return;
    setIsSaving(true);
    try {
      await onUpdateConfig({
        ...syncConfig,
        enabled: true,
        roomId: inputRoomId.trim().toUpperCase(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setIsSaving(true);
    try {
      await onUpdateConfig({
        ...syncConfig,
        enabled: false,
        roomId: "",
      });
      setInputRoomId("");
    } finally {
      setIsSaving(false);
    }
  };

  const isConnected = syncStatus.state === "connected" && Boolean(syncStatus.roomId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Radio className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                複数端末 リアルタイム同期
                {isConnected ? (
                  <Badge variant="outline" className="text-emerald-400 border-emerald-800/80 bg-emerald-950/40 text-[10px]">
                    🟢 同期接続中
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-400 border-slate-700 bg-slate-800 text-[10px]">
                    ☁️ ローカル単体動作
                  </Badge>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">PC とスマホ（複数デバイス）で求人・ステータスを即時共有</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Visual Device Pair Animation */}
          <div className="flex items-center justify-around p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div className="flex flex-col items-center gap-1.5">
              <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-200 border border-slate-700">
                <Laptop className="h-5 w-5 text-indigo-400" />
              </div>
              <span className="text-[11px] font-medium text-slate-300">PC ブラウザ</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className={`h-1.5 w-16 rounded-full transition-all ${isConnected ? "bg-gradient-to-r from-indigo-500 via-emerald-400 to-indigo-500 animate-pulse" : "bg-slate-800"}`} />
              <span className="text-[10px] font-mono text-slate-500">
                {isConnected ? "双方向リアルタイム" : "未接続"}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-200 border border-slate-700">
                <Smartphone className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="text-[11px] font-medium text-slate-300">スマホ端末</span>
            </div>
          </div>

          {/* Connection Controls */}
          <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
            <label className="text-xs font-semibold text-slate-300 block">
              同期ルームID (Room Code)
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="例: JE-8492"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
                className="h-10 font-mono font-bold tracking-wider text-sm bg-slate-900 border-slate-700 uppercase"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                className="h-10 px-3 text-xs border-slate-700 text-slate-300 hover:text-white shrink-0"
                title="新しいルームコードを発行"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                自動発行
              </Button>
            </div>

            {isConnected ? (
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleDisconnect}
                  disabled={isSaving}
                  variant="outline"
                  className="w-full h-9 text-xs border-rose-800/80 text-rose-400 hover:bg-rose-950/40 hover:text-rose-200"
                >
                  同期を切断（ローカル単体に戻す）
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={!inputRoomId.trim() || isSaving}
                className="w-full h-9 text-xs bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-semibold shadow-md shadow-indigo-500/20"
              >
                {isSaving ? "接続中..." : "このルームIDでリアルタイム同期を開始"}
              </Button>
            )}
          </div>

          {/* Quick Share Link for Mobile */}
          {inputRoomId.trim() && (
            <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-indigo-300 flex items-center gap-1.5">
                  <QrCode className="h-3.5 w-3.5" />
                  スマホですぐ開く連携リンク
                </span>
                <span className="text-[10px] text-slate-400">URLを開くだけで自動同期</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareableUrl}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-300 select-all"
                />
                <Button
                  size="sm"
                  onClick={handleCopyUrl}
                  className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
                >
                  {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied ? "コピー済" : "URLコピー"}
                </Button>
              </div>
            </div>
          )}

          {/* Safety & Local First Guarantee & PWA Offline Boot */}
          <div className="space-y-2">
            <div className="flex items-start gap-2 p-2.5 text-[11px] text-slate-400 bg-slate-950/30 rounded-lg border border-slate-800/60">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <p>
                端末間同期はルームID単位で E2EE 完全暗号化（AES-GCM）されます。PC の電源を切った後でもスマホで最新データが自動復元されます。
              </p>
            </div>

            <div className="flex items-start gap-2 p-2.5 text-[11px] text-indigo-300 bg-indigo-950/20 rounded-lg border border-indigo-900/40">
              <Smartphone className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              <p>
                <span className="font-semibold text-white">📲 スマホのホーム画面に追加:</span> Safari / Chrome の「ホーム画面に追加」を行うと、地下鉄や機内モード（完全圏外）でも 0秒で即起動して求人を閲覧・操作できます。
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <Button
            size="sm"
            onClick={onClose}
            className="h-8 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
};
