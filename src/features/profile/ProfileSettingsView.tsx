import React, { useState, useEffect } from "react";
import { 
  User, 
  Award, 
  Target, 
  Sliders, 
  ShieldAlert, 
  Key, 
  Save, 
  RotateCcw, 
  Plus, 
  X, 
  Check, 
  ShieldCheck, 
  DollarSign, 
  MapPin, 
  Laptop,
  Calendar,
  Activity,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  WorkStylePreference, 
  RoleLevelPreference, 
  UserProfile, 
  CertificationItem, 
  SkillItem,
  ScoringWeights,
  ScoringPresetKey,
  DEFAULT_SCORING_WEIGHTS,
  SCORING_PRESETS,
} from "@/types/profile";
import { testGeminiConnection, fetchAvailableGeminiModels } from "@/services/ai/aiService";
import { useProfile } from "@/hooks/useProfile";

const ROLE_OPTIONS: RoleLevelPreference[] = [
  "クラウドアーキテクト",
  "テックリード / リードエンジニア",
  "シニアエンジニア",
  "フルスタックエンジニア",
  "エンジニアリングマネージャー",
  "スペシャリスト / 専門職",
];

const WORK_STYLES: WorkStylePreference[] = ["フルリモート", "ハイブリッド", "出社可"];

interface ProfileSettingsViewProps {
  profile?: UserProfile;
  onSaveProfile?: (profile: UserProfile) => Promise<void>;
  onResetProfile?: () => Promise<void>;
  onRecalculateAllJobs?: (weights: ScoringWeights) => Promise<unknown>;
  isLoading?: boolean;
  isSaving?: boolean;
  lastSavedTime?: Date | null;
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  profile: propProfile,
  onSaveProfile,
  onResetProfile,
  onRecalculateAllJobs,
  isLoading: propIsLoading,
  isSaving: propIsSaving,
  lastSavedTime: propLastSavedTime,
}) => {
  // Fallback to internal hook if not passed from parent
  const hookState = useProfile();
  const profile = propProfile ?? hookState.profile;
  const isLoading = propIsLoading ?? hookState.isLoading;
  const isSaving = propIsSaving ?? hookState.isSaving;
  const lastSavedTime = propLastSavedTime ?? hookState.lastSavedTime;

  // Local editable draft state & dirty tracking
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [isDirty, setIsDirty] = useState(false);

  // Update draft and mark dirty to block external sync overrides
  const updateDraft = (updater: UserProfile | ((prev: UserProfile) => UserProfile)) => {
    setIsDirty(true);
    setDraft(updater);
  };
  
  // Skill inputs
  const [newSkill, setNewSkill] = useState("");
  const [newSkillStatus, setNewSkillStatus] = useState<"experienced" | "learning">("experienced");
  
  // Certification inputs
  const [activeCertTab, setActiveCertTab] = useState<"acquired" | "planned">("acquired");
  const [newCertName, setNewCertName] = useState("");
  const [newCertIssuer, setNewCertIssuer] = useState("");
  const [newCertStatus, setNewCertStatus] = useState<"studying" | "planned">("studying");
  const [newCertYear, setNewCertYear] = useState<string>(new Date().getFullYear().toString());
  const [newCertPeriod, setNewCertPeriod] = useState<string>("2026年Q3");

  const [newNgCondition, setNewNgCondition] = useState("");
  const [shouldRecalculateAllJobs, setShouldRecalculateAllJobs] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // API Connection test state
  const [apiTestStatus, setApiTestStatus] = useState<{
    checking: boolean;
    result: { ok: boolean; message: string; availableModels?: string[] } | null;
  }>({ checking: false, result: null });

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  // Sync draft when profile loads (BLOCKED while user is editing)
  useEffect(() => {
    if (profile && !isDirty) {
      // Ensure scoringWeights exists
      const initialWeights = profile.conditions?.scoringWeights || DEFAULT_SCORING_WEIGHTS;
      const initialPreset = profile.conditions?.scoringPreset || "standard";
      setDraft({
        ...profile,
        conditions: {
          ...profile.conditions,
          scoringPreset: initialPreset,
          scoringWeights: initialWeights,
        },
      });
    }
  }, [profile, isDirty]);

  const activePreset = draft.conditions?.scoringPreset || "standard";
  const activeWeights = draft.conditions?.scoringWeights || DEFAULT_SCORING_WEIGHTS;

  const handleSelectPreset = (presetKey: ScoringPresetKey) => {
    const preset = SCORING_PRESETS[presetKey];
    updateDraft((prev) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        scoringPreset: presetKey,
        scoringWeights: { ...preset.weights },
      },
    }));
  };

  const handleWeightChange = (key: keyof ScoringWeights, value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    updateDraft((prev) => {
      const current = prev.conditions.scoringWeights || DEFAULT_SCORING_WEIGHTS;
      return {
        ...prev,
        conditions: {
          ...prev.conditions,
          scoringPreset: "custom",
          scoringWeights: {
            ...current,
            [key]: clamped,
          },
        },
      };
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSave = async () => {
    const weightsToSave = draft.conditions?.scoringWeights || DEFAULT_SCORING_WEIGHTS;
    if (onSaveProfile) {
      await onSaveProfile(draft);
    } else {
      await hookState.saveProfile(draft);
    }
    setIsDirty(false);

    if (shouldRecalculateAllJobs && onRecalculateAllJobs) {
      try {
        await onRecalculateAllJobs(weightsToSave);
        showToast("プロファイル設定を保存し、全求人スコアを一括再計算しました！");
        return;
      } catch (err) {
        console.error("Recalculate all jobs error", err);
      }
    }
    showToast("プロファイル設定を保存しました");
  };

  const handleReset = async () => {
    if (window.confirm("プロファイル設定をデフォルト初期値にリセットしますか？")) {
      setIsDirty(false);
      if (onResetProfile) {
        await onResetProfile();
      } else {
        await hookState.resetToDefault();
      }
      showToast("初期デフォルト設定にリセットしました");
    }
  };

  const handleFetchModels = async () => {
    const key = draft.apiSettings?.geminiApiKey?.trim();
    if (!key) {
      alert("APIキーを入力してからモデル一覧を取得してください。");
      return;
    }
    setIsFetchingModels(true);
    try {
      const res = await fetchAvailableGeminiModels(key);
      if (res.ok && res.models.length > 0) {
        setAvailableModels(res.models);
        if (!res.models.includes(draft.apiSettings.geminiModel)) {
          setDraft((prev) => ({
            ...prev,
            apiSettings: { ...prev.apiSettings, geminiModel: res.models[0] },
          }));
        }
        showToast(`Googleから利用可能な ${res.models.length} 個のモデルを取得しました`);
      } else {
        alert(`モデル一覧の取得に失敗しました: ${res.message || "不明なエラー"}`);
      }
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleTestApiKey = async () => {
    const key = draft.apiSettings?.geminiApiKey?.trim();
    if (!key) {
      setApiTestStatus({
        checking: false,
        result: { ok: false, message: "APIキーが入力されていません。入力後に再テストしてください。" },
      });
      return;
    }

    setApiTestStatus({ checking: true, result: null });
    try {
      const res = await testGeminiConnection(key, draft.apiSettings?.geminiModel || "gemini-2.0-flash");
      setApiTestStatus({ checking: false, result: res });
      if (res.availableModels && res.availableModels.length > 0) {
        setAvailableModels(res.availableModels);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setApiTestStatus({ checking: false, result: { ok: false, message: `テスト失敗: ${msg}` } });
    }
  };

  // Skill handlers
  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    if (draft.skills.some((s) => s.name.toLowerCase() === newSkill.trim().toLowerCase())) return;

    const newSkillItem: SkillItem = {
      id: `s-${Date.now()}`,
      name: newSkill.trim(),
      category: "other",
      level: newSkillStatus === "experienced" ? "advanced" : "beginner",
      status: newSkillStatus,
    };

    updateDraft((prev) => ({
      ...prev,
      skills: [...prev.skills, newSkillItem],
    }));
    setNewSkill("");
  };

  const handleRemoveSkill = (id: string) => {
    updateDraft((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s.id !== id),
    }));
  };

  // Certification handlers
  const handleAddCert = () => {
    if (!newCertName.trim()) return;

    // Determine status based strictly on the active tab
    const certStatus: "acquired" | "studying" | "planned" = 
      activeCertTab === "acquired" 
        ? "acquired" 
        : (newCertStatus === "planned" ? "planned" : "studying");

    const newCertItem: CertificationItem = {
      id: `c-${Date.now()}`,
      name: newCertName.trim(),
      issuer: newCertIssuer.trim() || "認定機関",
      status: certStatus,
      yearAcquired: activeCertTab === "acquired" && newCertYear ? Number(newCertYear) || undefined : undefined,
      targetPeriod: activeCertTab === "planned" ? newCertPeriod.trim() : undefined,
    };

    updateDraft((prev) => ({
      ...prev,
      certifications: [...prev.certifications, newCertItem],
    }));

    setNewCertName("");
    setNewCertIssuer("");
  };

  const handleRemoveCert = (id: string) => {
    updateDraft((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((c) => c.id !== id),
    }));
  };

  // NG Condition handlers
  const handleAddNgCondition = () => {
    if (!newNgCondition.trim()) return;
    updateDraft((prev) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        ngConditions: [...prev.conditions.ngConditions, newNgCondition.trim()],
      },
    }));
    setNewNgCondition("");
  };

  const handleRemoveNgCondition = (index: number) => {
    updateDraft((prev) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        ngConditions: prev.conditions.ngConditions.filter((_, i) => i !== index),
      },
    }));
  };

  // Role toggle
  const handleToggleRole = (role: RoleLevelPreference) => {
    const exists = draft.conditions.preferredRoles.includes(role);
    updateDraft((prev) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        preferredRoles: exists
          ? prev.conditions.preferredRoles.filter((r) => r !== role)
          : [...prev.conditions.preferredRoles, role],
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-sm text-slate-400">プロファイル読み込み中...</div>
      </div>
    );
  }

  const acquiredCertifications = draft.certifications.filter((c) => (c.status ?? "acquired") === "acquired");
  const plannedCertifications = draft.certifications.filter((c) => (c.status ?? "acquired") !== "acquired");

  return (
    <div className="h-full p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto max-w-5xl mx-auto pb-28 sm:pb-32">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-4 sm:bottom-20 sm:right-6 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="h-4 w-4" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders className="h-5 w-5 text-indigo-400 shrink-0" />
            求職者プロファイル & 判定マトリクス設定
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            職務経歴・保有資格/学習中資格・希望年収・NG条件を定義し、AIによる客観的適合度判定と資格推薦の精度を高めます。
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {lastSavedTime && (
            <span className="text-[11px] text-slate-500 font-mono mr-1 hidden sm:inline">
              最終保存: {lastSavedTime.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-8 text-xs border-slate-700 text-slate-400 hover:text-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            初期値に戻す
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-md font-semibold"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {isSaving ? "保存中..." : "設定を保存"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Basic Information */}
        <Card className="border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-indigo-300 flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-400" />
              基本プロファイル
            </CardTitle>
            <CardDescription className="text-xs">
              候補者としての基本役職および経験年数
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">氏名 / 呼称</label>
              <Input
                value={draft.name}
                onChange={(e) => updateDraft({ ...draft, name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">専門職種 / 役職</label>
                <Input
                  value={draft.title}
                  onChange={(e) => updateDraft({ ...draft, title: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">IT実務経験年数</label>
                <Input
                  type="number"
                  value={draft.yearsOfExperience}
                  onChange={(e) =>
                    updateDraft({ ...draft, yearsOfExperience: Number(e.target.value) || 0 })
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">職歴・強みの要約</label>
              <Textarea
                value={draft.summary}
                onChange={(e) => updateDraft({ ...draft, summary: e.target.value })}
                className="h-20 text-xs resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Skills & Certifications */}
        <Card className="border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-indigo-300 flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-400" />
              スキル・保有資格 & 学習中目標 (FR-201)
            </CardTitle>
            <CardDescription className="text-xs">
              実務経験スキルと学習中資格を分離して登録
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {/* Skills */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">スキルセット</label>
                <div className="flex bg-slate-950 p-0.5 rounded border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setNewSkillStatus("experienced")}
                    className={`px-2 py-0.5 rounded transition-all ${
                      newSkillStatus === "experienced"
                        ? "bg-indigo-600 text-white font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    実務経験あり
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSkillStatus("learning")}
                    className={`px-2 py-0.5 rounded transition-all ${
                      newSkillStatus === "learning"
                        ? "bg-purple-600 text-white font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    独学・学習中
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
                {draft.skills.map((skill) => {
                  const isLearning = (skill.status ?? "experienced") !== "experienced";
                  return (
                    <Badge
                      key={skill.id}
                      variant="indigo"
                      className={`text-xs pl-2 pr-1 py-0.5 flex items-center gap-1 border ${
                        isLearning
                          ? "bg-purple-500/20 text-purple-200 border-purple-500/40"
                          : "bg-indigo-500/20 text-indigo-200 border-indigo-500/40"
                      }`}
                    >
                      <span>{skill.name}</span>
                      {isLearning && (
                        <span className="text-[9px] bg-purple-900/80 text-purple-300 px-1 rounded">学習中</span>
                      )}
                      <button
                        onClick={() => handleRemoveSkill(skill.id)}
                        className="hover:bg-slate-700/50 rounded p-0.5 text-slate-400 hover:text-rose-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={`追加するスキル (例: ${newSkillStatus === "experienced" ? "Go, AWS, Terraform" : "Rust, GraphQL"})...`}
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSkill()}
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  onClick={handleAddSkill}
                  className="h-8 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Certifications (Tabs: Acquired vs Planned) */}
            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">認定資格 & 目標資格</label>
                <div className="flex bg-slate-950 p-0.5 rounded border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setActiveCertTab("acquired")}
                    className={`px-2.5 py-0.5 rounded transition-all ${
                      activeCertTab === "acquired"
                        ? "bg-emerald-600 text-white font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    取得済み ({acquiredCertifications.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCertTab("planned")}
                    className={`px-2.5 py-0.5 rounded transition-all ${
                      activeCertTab === "planned"
                        ? "bg-purple-600 text-white font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    学習中・取得目標 ({plannedCertifications.length})
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
                {(activeCertTab === "acquired" ? acquiredCertifications : plannedCertifications).length === 0 ? (
                  <span className="text-[11px] text-slate-500 py-1 px-2">
                    {activeCertTab === "acquired" ? "取得済み資格はありません" : "現在学習中・取得目標の資格はありません"}
                  </span>
                ) : (
                  (activeCertTab === "acquired" ? acquiredCertifications : plannedCertifications).map((cert) => {
                    const isStudying = cert.status === "studying";
                    return (
                      <Badge
                        key={cert.id}
                        variant="secondary"
                        className={`text-xs pl-2 pr-1 py-0.5 flex items-center gap-1 border ${
                          activeCertTab === "acquired"
                            ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/30"
                            : isStudying
                            ? "bg-indigo-500/20 text-indigo-200 border-indigo-500/40"
                            : "bg-purple-500/20 text-purple-200 border-purple-500/40"
                        }`}
                      >
                        <span>{cert.name}</span>
                        {cert.yearAcquired && (
                          <span className="text-[9px] text-emerald-300/80 font-mono">({cert.yearAcquired}年)</span>
                        )}
                        {cert.targetPeriod && (
                          <span className="text-[9px] bg-slate-900 text-purple-300 px-1 rounded">
                            {cert.status === "studying" ? "学習中" : "目標"}: {cert.targetPeriod}
                          </span>
                        )}
                        <button
                          onClick={() => handleRemoveCert(cert.id)}
                          className="hover:bg-slate-700/50 rounded p-0.5 text-slate-400 hover:text-rose-300"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })
                )}
              </div>

              {/* Add form */}
              <div className="space-y-1.5 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Input
                      placeholder={activeCertTab === "acquired" ? "資格名 (例: AWS SAA, 応用情報)..." : "目標資格名 (例: AZ-400, CKA)..."}
                      value={newCertName}
                      onChange={(e) => setNewCertName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCert()}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="発行元 (例: AWS, IPA)"
                      value={newCertIssuer}
                      onChange={(e) => setNewCertIssuer(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCert()}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {activeCertTab === "acquired" ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <span>取得年:</span>
                      <Input
                        type="number"
                        placeholder="2024"
                        value={newCertYear}
                        onChange={(e) => setNewCertYear(e.target.value)}
                        className="h-7 w-20 text-xs font-mono"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs">
                      <select
                        value={newCertStatus}
                        onChange={(e) => setNewCertStatus(e.target.value as "studying" | "planned")}
                        className="h-7 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-1.5"
                      >
                        <option value="studying">学習中・受験準備</option>
                        <option value="planned">取得目標・予定</option>
                      </select>
                      <Input
                        placeholder="目標時期 (例: 2026年Q3, 年内)"
                        value={newCertPeriod}
                        onChange={(e) => setNewCertPeriod(e.target.value)}
                        className="h-7 text-xs flex-1"
                      />
                    </div>
                  )}

                  <Button
                    size="sm"
                    onClick={handleAddCert}
                    className="h-7 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    資格を追加
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Condition Matrix */}
        <Card className="border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-indigo-300 flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-400" />
              転職希望条件マトリクス (FR-202)
            </CardTitle>
            <CardDescription className="text-xs">
              年収レンジ、勤務形態、許容通勤条件
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {/* Target Salary */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                ターゲット想定年収 (万円)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">最低希望年収</span>
                  <Input
                    type="number"
                    value={draft.conditions.targetSalaryMin}
                    onChange={(e) =>
                      updateDraft({
                        ...draft,
                        conditions: {
                          ...draft.conditions,
                          targetSalaryMin: Number(e.target.value) || 0,
                        },
                      })
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">ターゲット年収上限</span>
                  <Input
                    type="number"
                    value={draft.conditions.targetSalaryMax}
                    onChange={(e) =>
                      updateDraft({
                        ...draft,
                        conditions: {
                          ...draft.conditions,
                          targetSalaryMax: Number(e.target.value) || 0,
                        },
                      })
                    }
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Work Style */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Laptop className="h-3.5 w-3.5 text-indigo-400" />
                希望勤務形態
              </label>
              <div className="grid grid-cols-3 gap-2">
                {WORK_STYLES.map((ws) => (
                  <button
                    key={ws}
                    onClick={() =>
                      updateDraft({
                        ...draft,
                        conditions: { ...draft.conditions, preferredWorkStyle: ws },
                      })
                    }
                    className={`text-xs py-2 rounded-lg border transition-all ${
                      draft.conditions.preferredWorkStyle === ws
                        ? "bg-indigo-600 text-white font-semibold border-indigo-500 shadow-sm"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {ws}
                  </button>
                ))}
              </div>
            </div>

            {/* Preferred Location */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-rose-400" />
                希望勤務地 / エリア
              </label>
              <Input
                value={draft.conditions.preferredLocation}
                onChange={(e) =>
                  updateDraft({
                    ...draft,
                    conditions: { ...draft.conditions, preferredLocation: e.target.value },
                  })
                }
                className="h-9 text-xs"
              />
            </div>

            {/* Preferred Roles */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-slate-300">志向するポジション</label>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_OPTIONS.map((role) => {
                  const isSelected = draft.conditions.preferredRoles.includes(role);
                  return (
                    <button
                      key={role}
                      onClick={() => handleToggleRole(role)}
                      className={`text-[11px] px-2.5 py-1 rounded-md transition-all ${
                        isSelected
                          ? "bg-indigo-600/90 text-white font-semibold border border-indigo-500"
                          : "bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {role}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3.5: Dynamic 4-Axis Weighting Profile (ADR-0004) */}
        <Card className="border-indigo-500/30 bg-gradient-to-b from-indigo-950/20 to-slate-900/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-indigo-300 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-400" />
                4軸評価の重み付けプロファイル (ADR-0004)
              </CardTitle>
              <Badge variant="outline" className="text-[11px] bg-indigo-950/60 border-indigo-500/40 text-indigo-300">
                {SCORING_PRESETS[activePreset]?.badge || "⚙️ カスタム"}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              ユーザーの転職志向（リスキリング・成長・カルチャー重視など）に応じて各軸の比率をカスタマイズ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {/* Presets Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">重視方針プリセット</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(SCORING_PRESETS) as ScoringPresetKey[]).map((key) => {
                  const preset = SCORING_PRESETS[key];
                  const isSelected = activePreset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectPreset(key)}
                      className={`text-left p-2.5 rounded-lg border transition-all ${
                        isSelected
                          ? "bg-indigo-600/30 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50"
                          : "bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                      }`}
                    >
                      <div className="text-xs font-medium flex items-center justify-between mb-0.5">
                        <span>{preset.badge}</span>
                        {isSelected && <Check className="h-3 w-3 text-indigo-400" />}
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-1 leading-tight">
                        {key === "standard" && "40 / 30 / 20 / 10%"}
                        {key === "reskilling" && "10 / 20 / 45 / 25%"}
                        {key === "wlb_culture" && "20 / 30 / 10 / 40%"}
                        {key === "salary_first" && "25 / 50 / 15 / 10%"}
                        {key === "custom" && "自由配分"}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-indigo-300/80 bg-indigo-950/40 px-3 py-1.5 rounded border border-indigo-500/20">
                💡 <strong>{SCORING_PRESETS[activePreset]?.label}</strong>: {SCORING_PRESETS[activePreset]?.description}
              </p>
            </div>

            {/* Sliders Grid */}
            <div className="space-y-3 pt-1 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
              {/* Total Weight Header */}
              {(() => {
                const total = activeWeights.skill + activeWeights.condition + activeWeights.growth + activeWeights.environment;
                const isExact100 = total === 100;
                return (
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 text-xs">
                    <span className="font-semibold text-slate-300">配分比率 (合計 100%)</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${
                        isExact100 
                          ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40" 
                          : "bg-amber-950/80 text-amber-300 border border-amber-500/40 animate-pulse"
                      }`}>
                        合計: {total}%
                      </span>
                      {!isExact100 && (
                        <button
                          type="button"
                          onClick={() => {
                            // Normalize to exact 100
                            const s = activeWeights.skill || 1;
                            const c = activeWeights.condition || 1;
                            const g = activeWeights.growth || 1;
                            const e = activeWeights.environment || 1;
                            const curTotal = s + c + g + e;
                            const normSkill = Math.round((s / curTotal) * 100);
                            const normCond = Math.round((c / curTotal) * 100);
                            const normGrowth = Math.round((g / curTotal) * 100);
                            const normEnv = 100 - (normSkill + normCond + normGrowth);
                            setDraft((prev) => ({
                              ...prev,
                              conditions: {
                                ...prev.conditions,
                                scoringPreset: "custom",
                                scoringWeights: {
                                  skill: normSkill,
                                  condition: normCond,
                                  growth: normGrowth,
                                  environment: normEnv,
                                },
                              },
                            }));
                          }}
                          className="text-[10px] text-indigo-300 hover:underline bg-indigo-900/40 px-2 py-0.5 rounded"
                        >
                          100%に自動調整
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* 1. Skill */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-1">
                    🎯 スキル・経験一致度 (Must / Want)
                  </span>
                  <span className="font-mono text-indigo-400 font-bold">{activeWeights.skill}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={activeWeights.skill}
                  onChange={(e) => handleWeightChange("skill", Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* 2. Condition */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-1">
                    💼 希望条件合致度 (年収・勤務地・リモート)
                  </span>
                  <span className="font-mono text-indigo-400 font-bold">{activeWeights.condition}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={activeWeights.condition}
                  onChange={(e) => handleWeightChange("condition", Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* 3. Growth */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-1">
                    🚀 キャリア成長性・得られる技術
                  </span>
                  <span className="font-mono text-indigo-400 font-bold">{activeWeights.growth}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={activeWeights.growth}
                  onChange={(e) => handleWeightChange("growth", Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* 4. Environment */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-1">
                    🌿 労働環境・カルチャー・リスク健全度
                  </span>
                  <span className="font-mono text-indigo-400 font-bold">{activeWeights.environment}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={activeWeights.environment}
                  onChange={(e) => handleWeightChange("environment", Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>

            {/* Batch Recalculate Checkbox */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
              <input
                type="checkbox"
                id="recalculateCheckbox"
                checked={shouldRecalculateAllJobs}
                onChange={(e) => setShouldRecalculateAllJobs(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <label htmlFor="recalculateCheckbox" className="text-xs text-slate-300 cursor-pointer select-none">
                ⚡ <strong>保存時に保存済みの全求人スコアを新しい重みで一括再計算する</strong> (Markdown Frontmatter も自動同期)
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: NG Conditions & API Settings */}
        <div className="space-y-6">
          {/* NG Conditions */}
          <Card className="border-rose-500/20 bg-rose-950/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-rose-300 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                NG条件・除外キーワード (FR-202)
              </CardTitle>
              <CardDescription className="text-xs">
                求人票に該当記載がある場合に適合スコアを大幅減点（ランクC推奨）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="space-y-1.5">
                <div className="flex flex-col gap-1.5">
                  {draft.conditions.ngConditions.map((ng, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-slate-950/70 px-3 py-1.5 rounded-lg border border-rose-500/20 text-xs text-rose-200"
                    >
                      <span>⛔ {ng}</span>
                      <button
                        onClick={() => handleRemoveNgCondition(idx)}
                        className="hover:bg-rose-500/30 rounded p-0.5 text-rose-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <Input
                    placeholder="NG条件 (例: 深夜オンコール頻発, レガシー言語固定)..."
                    value={newNgCondition}
                    onChange={(e) => setNewNgCondition(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddNgCondition()}
                    className="h-8 text-xs border-rose-500/20"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddNgCondition}
                    className="h-8 text-xs bg-rose-950 border border-rose-800 text-rose-200 hover:bg-rose-900"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gemini API Key & Connection Test */}
          <Card className="border-indigo-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-indigo-300 flex items-center gap-2">
                <Key className="h-4 w-4 text-indigo-400" />
                Google Gemini API 設定 & 接続テスト (NFR-101)
              </CardTitle>
              <CardDescription className="text-xs">
                求人情報の構造化抽出および資格推薦推論に使用する API キーとモデル
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {/* API Key input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Gemini API Key</label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Google AI Studio
                  </span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="AIzaSy..."
                    value={draft.apiSettings?.geminiApiKey || ""}
                    onChange={(e) =>
                      updateDraft({
                        ...draft,
                        apiSettings: { ...(draft.apiSettings || { geminiModel: "gemini-3.6-flash" }), geminiApiKey: e.target.value },
                      })
                    }
                    className="font-mono text-xs h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestApiKey}
                    disabled={apiTestStatus.checking || !draft.apiSettings?.geminiApiKey?.trim()}
                    className="h-9 text-xs border-indigo-500/40 hover:bg-indigo-500/20 text-indigo-300 shrink-0 font-medium"
                  >
                    {apiTestStatus.checking ? (
                      <span className="flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5 animate-spin" />
                        接続確認中...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5 text-indigo-400" />
                        接続テスト
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              {/* Model selection */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">使用 Gemini モデル</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleFetchModels}
                    disabled={isFetchingModels || !draft.apiSettings?.geminiApiKey?.trim()}
                    className="h-6 text-[11px] text-indigo-400 hover:text-indigo-200 p-1"
                  >
                    {isFetchingModels ? "モデル取得中..." : "🔄 Googleからモデル一覧を取得"}
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <select
                    value={draft.apiSettings?.geminiModel || "gemini-3.6-flash"}
                    onChange={(e) =>
                      updateDraft({
                        ...draft,
                        apiSettings: { ...(draft.apiSettings || { geminiApiKey: "" }), geminiModel: e.target.value },
                      })
                    }
                    className="w-full h-9 bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 font-mono focus:outline-none focus:border-indigo-500"
                  >
                    {availableModels.length > 0 ? (
                      availableModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="gemini-3.6-flash">gemini-3.6-flash (推奨・最新・高精度)</option>
                        <option value="gemini-3.5-flash">gemini-3.5-flash (高速・安定)</option>
                        <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (軽量・超低遅延)</option>
                        <option value="gemini-3.7-flash">gemini-3.7-flash (高機能・混雑時自動フォールバック)</option>
                      </>
                    )}
                  </select>

                  {/* Manual entry support */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-500 shrink-0">直接指定:</span>
                    <Input
                      placeholder="モデル名直接入力 (例: gemini-2.0-flash)"
                      value={draft.apiSettings?.geminiModel || ""}
                      onChange={(e) =>
                        updateDraft({
                          ...draft,
                          apiSettings: { ...(draft.apiSettings || { geminiApiKey: "" }), geminiModel: e.target.value },
                        })
                      }
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* API Test Status Banner */}
              {apiTestStatus.result && (
                <div
                  className={`text-xs p-2.5 rounded-lg border flex items-start gap-2 animate-in fade-in duration-200 ${
                    apiTestStatus.result.ok
                      ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-950/40 border-rose-500/30 text-rose-300"
                  }`}
                >
                  {apiTestStatus.result.ok ? (
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed whitespace-pre-wrap">{apiTestStatus.result.message}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>ローカル暗号化ストレージにのみ保持され外部送信されません。</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky Bottom Floating Action Bar for Mobile & Quick Save */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 z-40 shadow-2xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 px-2 sm:px-4">
          <div className="flex items-center gap-2 min-w-0">
            {isDirty ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-950/70 border border-amber-800/80 px-2.5 py-1 rounded-full animate-pulse">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                未保存の変更あり
              </span>
            ) : lastSavedTime ? (
              <span className="text-[11px] text-slate-400 truncate">
                最終保存: {lastSavedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">変更はありません</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
              className="h-9 px-3 text-xs border-slate-700 hover:bg-slate-800 text-slate-300"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              リセット
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className={`h-9 px-4 text-xs font-semibold shadow-lg transition-all flex items-center gap-1.5 ${
                isDirty
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white ring-2 ring-indigo-400/40"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-200" />
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  <span>設定を保存</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsView;
