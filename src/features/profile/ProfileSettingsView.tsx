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
  Laptop 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useProfile } from "@/hooks/useProfile";
import { WorkStylePreference, RoleLevelPreference } from "@/types/profile";

const ROLE_OPTIONS: RoleLevelPreference[] = [
  "クラウドアーキテクト",
  "テックリード / リードエンジニア",
  "シニアエンジニア",
  "フルスタックエンジニア",
  "エンジニアリングマネージャー",
  "スペシャリスト / 専門職",
];

const WORK_STYLES: WorkStylePreference[] = ["フルリモート", "ハイブリッド", "出社可"];

export const ProfileSettingsView: React.FC = () => {
  const {
    profile,
    isLoading,
    isSaving,
    lastSavedTime,
    saveProfile,
    resetToDefault,
  } = useProfile();

  // Local editable draft state
  const [draft, setDraft] = useState(profile);
  const [newSkill, setNewSkill] = useState("");
  const [newCert, setNewCert] = useState("");
  const [newNgCondition, setNewNgCondition] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync draft when profile loads
  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSave = async () => {
    await saveProfile(draft);
    showToast("プロファイル設定をローカルへ保存しました");
  };

  const handleReset = async () => {
    if (window.confirm("プロファイル設定をデフォルト初期値にリセットしますか？")) {
      await resetToDefault();
      showToast("初期デフォルト設定にリセットしました");
    }
  };

  // Skill handlers
  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    if (draft.skills.some((s) => s.name.toLowerCase() === newSkill.trim().toLowerCase())) return;

    setDraft((prev) => ({
      ...prev,
      skills: [
        ...prev.skills,
        {
          id: `s-${Date.now()}`,
          name: newSkill.trim(),
          category: "other",
          level: "advanced",
        },
      ],
    }));
    setNewSkill("");
  };

  const handleRemoveSkill = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s.id !== id),
    }));
  };

  // Certification handlers
  const handleAddCert = () => {
    if (!newCert.trim()) return;
    setDraft((prev) => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        {
          id: `c-${Date.now()}`,
          name: newCert.trim(),
          issuer: "Certified Authority",
        },
      ],
    }));
    setNewCert("");
  };

  const handleRemoveCert = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((c) => c.id !== id),
    }));
  };

  // NG Condition handlers
  const handleAddNgCondition = () => {
    if (!newNgCondition.trim()) return;
    setDraft((prev) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        ngConditions: [...prev.conditions.ngConditions, newNgCondition.trim()],
      },
    }));
    setNewNgCondition("");
  };

  const handleRemoveNgCondition = (index: number) => {
    setDraft((prev) => ({
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
    setDraft((prev) => ({
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

  return (
    <div className="h-full p-6 space-y-6 overflow-y-auto max-w-5xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="h-4 w-4" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders className="h-5 w-5 text-indigo-400" />
            求職者プロファイル & 判定マトリクス設定
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            職務経歴・希望年収・勤務形態・NG条件を定義し、AIによる客観的適合度判定の精度を高めます。
          </p>
        </div>

        <div className="flex items-center gap-2">
          {lastSavedTime && (
            <span className="text-[11px] text-slate-500 font-mono mr-2">
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
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">専門職種 / 役職</label>
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">IT実務経験年数</label>
                <Input
                  type="number"
                  value={draft.yearsOfExperience}
                  onChange={(e) =>
                    setDraft({ ...draft, yearsOfExperience: Number(e.target.value) || 0 })
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">職歴・強みの要約</label>
              <Textarea
                value={draft.summary}
                onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
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
              保有スキル & 認定資格 (FR-201)
            </CardTitle>
            <CardDescription className="text-xs">
              AIが求人票のMust/Want要件と照合する技術スタック
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {/* Skills */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">技術スタック (言語・FW・インフラ)</label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
                {draft.skills.map((skill) => (
                  <Badge
                    key={skill.id}
                    variant="indigo"
                    className="text-xs pl-2 pr-1 py-0.5 flex items-center gap-1 bg-indigo-500/20 text-indigo-200 border-indigo-500/40"
                  >
                    <span>{skill.name}</span>
                    <button
                      onClick={() => handleRemoveSkill(skill.id)}
                      className="hover:bg-indigo-500/40 rounded p-0.5 text-indigo-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="追加するスキル (例: Rust, GraphQL, Docker)..."
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

            {/* Certifications */}
            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <label className="text-xs font-semibold text-slate-300">保有資格 (IPA / クラウド認定)</label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
                {draft.certifications.map((cert) => (
                  <Badge
                    key={cert.id}
                    variant="secondary"
                    className="text-xs pl-2 pr-1 py-0.5 flex items-center gap-1 bg-purple-500/20 text-purple-200 border-purple-500/40"
                  >
                    <span>{cert.name}</span>
                    <button
                      onClick={() => handleRemoveCert(cert.id)}
                      className="hover:bg-purple-500/40 rounded p-0.5 text-purple-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="追加する資格 (例: AZ-400, AWS SAA, ネットワークスペシャリスト)..."
                  value={newCert}
                  onChange={(e) => setNewCert(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCert()}
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  onClick={handleAddCert}
                  className="h-8 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
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
                      setDraft({
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
                      setDraft({
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
                      setDraft({
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
                  setDraft({
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
                          : "bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800"
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

          {/* Gemini API Key */}
          <Card className="border-indigo-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-indigo-300 flex items-center gap-2">
                <Key className="h-4 w-4 text-indigo-400" />
                Google Gemini API 設定 (NFR-101)
              </CardTitle>
              <CardDescription className="text-xs">
                求人情報の構造化抽出および推論に使用する API キー
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Gemini API Key</label>
                <Input
                  type="password"
                  placeholder="AIzaSy..."
                  value={draft.apiSettings.geminiApiKey}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      apiSettings: { ...draft.apiSettings, geminiApiKey: e.target.value },
                    })
                  }
                  className="font-mono text-xs h-9"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>ローカル暗号化ストレージにのみ保持され外部送信されません。</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
