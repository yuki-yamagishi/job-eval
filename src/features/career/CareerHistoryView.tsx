import React, { useState, useEffect } from "react";
import {
  Briefcase,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Copy,
  Check,
  Save,
  RotateCcw,
  Calendar,
  Users,
  Code2,
  Target,
  FileText,
  Loader2,
  Building2,
  X,
  Layers,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  UserProfile,
  CompanyExperience,
  ProjectExperience,
  StarEpisode,
  DEVELOPMENT_PHASES,
} from "@/types/profile";
import { useProfile } from "@/hooks/useProfile";

interface CareerHistoryViewProps {
  profile?: UserProfile;
  onSaveProfile?: (profile: UserProfile) => Promise<void>;
  isLoading?: boolean;
  isSaving?: boolean;
  lastSavedTime?: Date | null;
}

export const CareerHistoryView: React.FC<CareerHistoryViewProps> = ({
  profile: propProfile,
  onSaveProfile,
  isLoading: propIsLoading,
  isSaving: propIsSaving,
  lastSavedTime: propLastSavedTime,
}) => {
  const hookState = useProfile();
  const profile = propProfile ?? hookState.profile;
  const isLoading = propIsLoading ?? (propProfile ? false : hookState.isLoading);
  const isSaving = propIsSaving ?? hookState.isSaving;
  const lastSavedTime = propLastSavedTime ?? hookState.lastSavedTime;

  // Local state with dirty tracking
  const [draftCompanies, setDraftCompanies] = useState<CompanyExperience[]>(profile.companies || []);
  const [isDirty, setIsDirty] = useState(false);

  // Expanded companies state (default: all open)
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({
    ...(profile.companies || []).reduce((acc, c) => ({ ...acc, [c.id]: true }), {}),
  });

  // Editing state for Company modal/inline
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyExperience | null>(null);

  // Editing state for Project modal
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [activeCompanyIdForProject, setActiveCompanyIdForProject] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectExperience | null>(null);
  const [projectSkillInput, setProjectSkillInput] = useState("");

  // AI Polish state per episode ID
  const [polishingEpisodeId, setPolishingEpisodeId] = useState<string | null>(null);

  // Markdown Export Modal
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync draft when profile loads (BLOCKED if dirty)
  useEffect(() => {
    if (profile && !isDirty) {
      const comps = profile.companies || [];
      setDraftCompanies(comps);
      setExpandedCompanies((prev) => {
        const next = { ...prev };
        comps.forEach((c) => {
          if (next[c.id] === undefined) next[c.id] = true;
        });
        return next;
      });
    }
  }, [profile, isDirty]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const updateCompanies = (updater: CompanyExperience[] | ((prev: CompanyExperience[]) => CompanyExperience[])) => {
    setIsDirty(true);
    setDraftCompanies(updater);
  };

  const toggleExpand = (companyId: string) => {
    setExpandedCompanies((prev) => ({
      ...prev,
      [companyId]: !prev[companyId],
    }));
  };

  // Company CRUD
  const handleOpenAddCompany = () => {
    setEditingCompany({
      id: `comp-${Date.now()}`,
      companyName: "",
      employmentType: "正社員",
      startDate: new Date().toISOString().slice(0, 7),
      isCurrent: true,
      department: "",
      description: "",
      projects: [],
    });
    setIsCompanyModalOpen(true);
  };

  const handleOpenEditCompany = (company: CompanyExperience) => {
    setEditingCompany({ ...company });
    setIsCompanyModalOpen(true);
  };

  const handleSaveCompanyModal = () => {
    if (!editingCompany || !editingCompany.companyName.trim()) {
      alert("会社名を入力してください。");
      return;
    }
    updateCompanies((prev) => {
      const exists = prev.some((c) => c.id === editingCompany.id);
      if (exists) {
        return prev.map((c) => (c.id === editingCompany.id ? editingCompany : c));
      } else {
        return [editingCompany, ...prev];
      }
    });
    setExpandedCompanies((prev) => ({ ...prev, [editingCompany.id]: true }));
    setIsCompanyModalOpen(false);
    setEditingCompany(null);
  };

  const handleDeleteCompany = (companyId: string) => {
    if (window.confirm("この会社と関連するすべてのプロジェクト実績を削除しますか？")) {
      updateCompanies((prev) => prev.filter((c) => c.id !== companyId));
    }
  };

  // Helper to normalize starEpisodes from project
  const normalizeEpisodes = (proj: ProjectExperience): StarEpisode[] => {
    if (proj.starEpisodes && proj.starEpisodes.length > 0) {
      return proj.starEpisodes.map((ep) => ({ ...ep }));
    }
    if (proj.situation || proj.action || proj.result) {
      return [
        {
          id: `star-init-${Date.now()}`,
          theme: "主要な課題解決と成果",
          situation: proj.situation || "",
          action: proj.action || "",
          result: proj.result || "",
        },
      ];
    }
    return [
      {
        id: `star-init-${Date.now()}`,
        theme: "",
        situation: "",
        action: "",
        result: "",
      },
    ];
  };

  // Project CRUD
  const handleOpenAddProject = (companyId: string) => {
    setActiveCompanyIdForProject(companyId);
    setEditingProject({
      id: `proj-${Date.now()}`,
      title: "",
      role: "",
      teamSize: "",
      startDate: new Date().toISOString().slice(0, 7),
      isCurrent: true,
      phases: ["基本設計 / アーキテクチャ", "実装・コーディング"],
      skills: [],
      starEpisodes: [
        {
          id: `star-${Date.now()}`,
          theme: "",
          situation: "",
          action: "",
          result: "",
        },
      ],
      situation: "",
      action: "",
      result: "",
    });
    setProjectSkillInput("");
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (companyId: string, project: ProjectExperience) => {
    setActiveCompanyIdForProject(companyId);
    setEditingProject({
      ...project,
      phases: project.phases ? [...project.phases] : [],
      skills: [...project.skills],
      starEpisodes: normalizeEpisodes(project),
    });
    setProjectSkillInput("");
    setIsProjectModalOpen(true);
  };

  const handleSaveProjectModal = () => {
    if (!editingProject || !activeCompanyIdForProject) return;
    if (!editingProject.title.trim()) {
      alert("プロジェクト名を入力してください。");
      return;
    }

    // Auto-commit any unsaved skill input before saving
    let finalSkills = [...editingProject.skills];
    if (projectSkillInput.trim()) {
      const pendingSkills = projectSkillInput
        .trim()
        .split(/[,、\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      pendingSkills.forEach((s) => {
        if (!finalSkills.includes(s)) {
          finalSkills.push(s);
        }
      });
    }

    // Set backward compatibility fields from first episode
    const firstEp = editingProject.starEpisodes?.[0];
    const projectToSave: ProjectExperience = {
      ...editingProject,
      skills: finalSkills,
      situation: firstEp ? firstEp.situation : editingProject.situation || "",
      action: firstEp ? firstEp.action : editingProject.action || "",
      result: firstEp ? firstEp.result : editingProject.result || "",
    };

    updateCompanies((prev) =>
      prev.map((c) => {
        if (c.id !== activeCompanyIdForProject) return c;
        const exists = c.projects.some((p) => p.id === projectToSave.id);
        const updatedProjects = exists
          ? c.projects.map((p) => (p.id === projectToSave.id ? projectToSave : p))
          : [projectToSave, ...c.projects];
        return { ...c, projects: updatedProjects };
      })
    );

    setProjectSkillInput("");
    setIsProjectModalOpen(false);
    setEditingProject(null);
    setActiveCompanyIdForProject(null);
  };

  const handleDeleteProject = (companyId: string, projectId: string) => {
    if (window.confirm("このプロジェクト実績を削除しますか？")) {
      updateCompanies((prev) =>
        prev.map((c) => {
          if (c.id !== companyId) return c;
          return { ...c, projects: c.projects.filter((p) => p.id !== projectId) };
        })
      );
    }
  };

  // Phases toggle
  const handleTogglePhase = (phase: string) => {
    if (!editingProject) return;
    const currentPhases = editingProject.phases || [];
    const updated = currentPhases.includes(phase)
      ? currentPhases.filter((p) => p !== phase)
      : [...currentPhases, phase];
    setEditingProject({ ...editingProject, phases: updated });
  };

  // Skills Tags (Supports comma-separation and quick selection)
  const handleAddSkillTag = (customSkill?: string) => {
    if (!editingProject) return;
    const rawInput = (customSkill ?? projectSkillInput).trim();
    if (!rawInput) return;

    const newSkills = rawInput
      .split(/[,、\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (newSkills.length === 0) return;

    const updated = [...editingProject.skills];
    newSkills.forEach((s) => {
      if (!updated.includes(s)) {
        updated.push(s);
      }
    });

    setEditingProject({
      ...editingProject,
      skills: updated,
    });
    if (!customSkill) {
      setProjectSkillInput("");
    }
  };

  const handleRemoveSkillTag = (skillToRemove: string) => {
    if (!editingProject) return;
    setEditingProject({
      ...editingProject,
      skills: editingProject.skills.filter((s) => s !== skillToRemove),
    });
  };

  // STAR Episodes handlers
  const handleAddStarEpisode = () => {
    if (!editingProject) return;
    const newEp: StarEpisode = {
      id: `star-${Date.now()}`,
      theme: "",
      situation: "",
      action: "",
      result: "",
    };
    setEditingProject({
      ...editingProject,
      starEpisodes: [...(editingProject.starEpisodes || []), newEp],
    });
  };

  const handleUpdateStarEpisode = (episodeId: string, field: keyof StarEpisode, value: string) => {
    if (!editingProject) return;
    const updated = (editingProject.starEpisodes || []).map((ep) =>
      ep.id === episodeId ? { ...ep, [field]: value } : ep
    );
    setEditingProject({ ...editingProject, starEpisodes: updated });
  };

  const handleDeleteStarEpisode = (episodeId: string) => {
    if (!editingProject) return;
    if ((editingProject.starEpisodes || []).length <= 1) {
      alert("少なくとも1つのSTARエピソードが必要です。");
      return;
    }
    const updated = (editingProject.starEpisodes || []).filter((ep) => ep.id !== episodeId);
    setEditingProject({ ...editingProject, starEpisodes: updated });
  };

  // AI Polish for a specific episode using Gemini
  const handleAiPolishEpisode = async (episode: StarEpisode) => {
    if (!editingProject) return;
    const apiKey = profile.apiSettings?.geminiApiKey?.trim();
    if (!apiKey) {
      alert("AI文章整形を利用するには、「プロファイル条件設定」画面で Gemini API キーを設定してください。");
      return;
    }

    setPolishingEpisodeId(episode.id);
    try {
      const model = profile.apiSettings?.geminiModel || "gemini-3.6-flash";
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const prompt = `あなたはIT業界のプロフェッショナルな職務経歴書コンサルタントです。
以下のエンジニアのプロジェクト実績エピソード（状況・課題、自身の工夫や行動、成果）を読み、
STAR法（Situation & Task, Action, Result）に基づいた、説得力とビジネスインパクトのある簡潔明瞭な文章にブラッシュアップしてください。

【プロジェクト基本情報】
- プロジェクト名: ${editingProject.title}
- 担当役割/ポジション: ${editingProject.role}
- 担当工程: ${(editingProject.phases || []).join(", ") || "未指定"}
- チーム規模: ${editingProject.teamSize || "未記載"}
- 使用技術スタック: ${editingProject.skills.join(", ") || "未記載"}

【エピソード下書き】
- テーマ/課題概要: ${episode.theme || "（未記入）"}
- 状況・課題 (Situation): ${episode.situation || "（未記入）"}
- 行動・工夫 (Action): ${episode.action || "（未記入）"}
- 成果・インパクト (Result): ${episode.result || "（未記入）"}

必ず以下のJSON形式のみを出力してください（Markdownのコードフェンスは含めないでください）。
{
  "theme": "テーマ（20文字程度の簡潔で魅力的な見出し）",
  "situation": "ブラッシュアップされた課題・背景文（2〜3文程度）",
  "action": "ブラッシュアップされた自身の工夫・主導した施策（2〜3文程度）",
  "result": "ブラッシュアップされた定量的成果・ビジネス貢献度（2〜3文程度）"
}`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`APIリクエスト失敗 (${res.status}): ${errorText}`);
      }

      const resData = await res.json();
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
      const cleaned = rawText.replace(/```json\n?|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      setEditingProject((prev) => {
        if (!prev) return prev;
        const updated = (prev.starEpisodes || []).map((ep) =>
          ep.id === episode.id
            ? {
                ...ep,
                theme: parsed.theme || ep.theme,
                situation: parsed.situation || ep.situation,
                action: parsed.action || ep.action,
                result: parsed.result || ep.result,
              }
            : ep
        );
        return { ...prev, starEpisodes: updated };
      });
      showToast("✨ AIによるSTAR文章のブラッシュアップが完了しました！");
    } catch (err: unknown) {
      console.error("AI Polish failed", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`AI整形エラー: ${msg}`);
    } finally {
      setPolishingEpisodeId(null);
    }
  };

  // Generate Resume Markdown
  const generateResumeMarkdown = (): string => {
    let md = `# 職務経歴書 (Curriculum Vitae)\n\n`;
    md += `氏名: ${profile.name || "未設定"}  \n`;
    md += `役職/専門: ${profile.title || "エンジニア"} (IT実務経験: ${profile.yearsOfExperience}年)  \n`;
    md += `最終更新日: ${new Date().toLocaleDateString("ja-JP")}\n\n`;

    if (profile.summary) {
      md += `## 職務要約\n${profile.summary}\n\n`;
    }

    if (profile.skills && profile.skills.length > 0) {
      md += `## スキルセット\n`;
      md += profile.skills.map((s) => `- **${s.name}**: ${s.level || "実務経験"} (${s.yearsOfExperience ? `${s.yearsOfExperience}年` : "経験あり"})`).join("\n") + "\n\n";
    }

    if (profile.certifications && profile.certifications.length > 0) {
      md += `## 資格・認定\n`;
      md += profile.certifications.map((c) => `- ${c.name} (${c.issuer}${c.yearAcquired ? ` / ${c.yearAcquired}年` : ""})`).join("\n") + "\n\n";
    }

    md += `## 職務経歴・プロジェクト実績\n\n`;

    if (!draftCompanies || draftCompanies.length === 0) {
      md += `_登録された職務経歴はありません_\n`;
      return md;
    }

    draftCompanies.forEach((comp, compIdx) => {
      const period = `${comp.startDate} 〜 ${comp.isCurrent ? "現在" : comp.endDate || ""}`;
      md += `### ${compIdx + 1}. ${comp.companyName} (${period})\n`;
      md += `- **雇用形態**: ${comp.employmentType || "正社員"}\n`;
      if (comp.department) md += `- **所属・役職**: ${comp.department}\n`;
      if (comp.description) md += `- **事業内容**: ${comp.description}\n`;
      md += `\n`;

      if (!comp.projects || comp.projects.length === 0) {
        md += `  _プロジェクト実績の登録はありません_\n\n`;
      } else {
        comp.projects.forEach((proj, projIdx) => {
          const projPeriod = `${proj.startDate} 〜 ${proj.isCurrent ? "参画中" : proj.endDate || ""}`;
          md += `#### 【PJ.${projIdx + 1}】${proj.title} (${projPeriod})\n`;
          md += `- **役割・ポジション**: ${proj.role}\n`;
          if (proj.teamSize) md += `- **チーム規模**: ${proj.teamSize}\n`;
          if (proj.phases && proj.phases.length > 0) {
            md += `- **担当開発工程**: ${proj.phases.join(", ")}\n`;
          }
          if (proj.skills && proj.skills.length > 0) {
            md += `- **使用技術スタック**: ${proj.skills.join(", ")}\n`;
          }

          const episodes = proj.starEpisodes && proj.starEpisodes.length > 0
            ? proj.starEpisodes
            : (proj.situation || proj.action || proj.result)
            ? [{ id: "fallback", theme: "", situation: proj.situation || "", action: proj.action || "", result: proj.result || "" }]
            : [];

          if (episodes.length > 0) {
            episodes.forEach((ep, epIdx) => {
              const epHeader = ep.theme ? `【成果エピソード ${epIdx + 1}: ${ep.theme}】` : `【成果エピソード ${epIdx + 1}】`;
              md += `\n${epHeader}\n`;
              if (ep.situation) md += `- **📌 直面した課題 (Situation)**: ${ep.situation}\n`;
              if (ep.action) md += `- **💡 自身の工夫・行動 (Action)**: ${ep.action}\n`;
              if (ep.result) md += `- **🏆 達成成果 (Result)**: ${ep.result}\n`;
            });
          }
          md += `\n`;
        });
      }
    });

    return md;
  };

  const handleCopyMarkdown = async () => {
    const md = generateResumeMarkdown();
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      showToast("職務経歴書 Markdown をクリップボードにコピーしました！");
    } catch {
      alert("クリップボードへのコピーに失敗しました。");
    }
  };

  // Save changes to profile
  const handleSaveAll = async () => {
    const updatedProfile: UserProfile = {
      ...profile,
      companies: draftCompanies,
      updatedAt: new Date().toISOString(),
    };

    if (onSaveProfile) {
      await onSaveProfile(updatedProfile);
    } else {
      await hookState.saveProfile(updatedProfile);
    }

    setIsDirty(false);
    showToast("職務経歴・プロジェクト実績を保存しました");
  };

  const handleResetToDefault = () => {
    if (window.confirm("職務経歴を初期値のサンプルデータにリセットしますか？")) {
      const defaultComps = hookState.profile?.companies || [];
      setDraftCompanies(defaultComps);
      setIsDirty(false);
      showToast("初期データにリセットしました");
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-sm text-slate-400">職務経歴データを読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="h-full p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto max-w-5xl mx-auto pb-28 sm:pb-32">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-4 sm:bottom-20 sm:right-6 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="h-4 w-4" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-indigo-400 shrink-0" />
            職務経歴・プロジェクト実績 (工程・複数STAR対応)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            1社複数プロジェクト、担当開発工程（要件定義〜運用保守）、および1案件内の複数STAR成果エピソードを管理。
            AI求人適合度判定に自動注入され、職務経歴書Markdownの一括出力にも対応します。
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewModalOpen(true)}
            className="h-8 text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/20"
          >
            <FileText className="h-3.5 w-3.5 mr-1 text-indigo-400" />
            経歴書プレビュー / 出力
          </Button>
          <Button
            size="sm"
            onClick={handleOpenAddCompany}
            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-md font-semibold"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            会社を追加
          </Button>
        </div>
      </div>

      {/* Companies & Projects List */}
      {draftCompanies.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/30 text-center p-8">
          <Building2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">職務経歴が登録されていません</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            所属企業を追加し、その中で担当したプロジェクト実績や開発工程を登録しましょう。
          </p>
          <Button size="sm" onClick={handleOpenAddCompany} className="text-xs bg-indigo-600 hover:bg-indigo-500">
            <Plus className="h-3.5 w-3.5 mr-1" />
            最初の会社を登録する
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {draftCompanies.map((company, cIndex) => {
            const isExpanded = expandedCompanies[company.id] ?? true;
            const periodStr = `${company.startDate} 〜 ${company.isCurrent ? "現在" : company.endDate || ""}`;

            return (
              <Card key={company.id} className="border-slate-800 bg-slate-900/50 shadow-md transition-all">
                {/* Company Header */}
                <div className="p-3 sm:p-4 flex items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-950/40">
                  <div
                    className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 cursor-pointer select-none"
                    onClick={() => toggleExpand(company.id)}
                  >
                    <button className="text-slate-400 hover:text-slate-200">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          #{cIndex + 1}
                        </span>
                        <h3 className="text-sm font-bold text-slate-100 truncate">{company.companyName}</h3>
                        {company.employmentType && (
                          <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                            {company.employmentType}
                          </Badge>
                        )}
                        {company.isCurrent && (
                          <Badge variant="indigo" className="text-[10px] bg-emerald-950/80 text-emerald-300 border-emerald-800/80">
                            在籍中
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="h-3 w-3 text-slate-500" />
                          {periodStr}
                        </span>
                        {company.department && <span>• {company.department}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenAddProject(company.id)}
                      className="h-7 text-xs text-indigo-400 hover:text-indigo-200 hover:bg-indigo-950/40 px-2"
                      title="この会社にプロジェクトを追加"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      <span className="hidden sm:inline">PJ追加</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditCompany(company)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200"
                      title="会社情報を編集"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCompany(company.id)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400"
                      title="会社を削除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Company Content & Projects */}
                {isExpanded && (
                  <CardContent className="p-3 sm:p-4 space-y-3 pt-3">
                    {company.description && (
                      <p className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 leading-relaxed">
                        <span className="font-semibold text-slate-300 mr-1">事業内容:</span>
                        {company.description}
                      </p>
                    )}

                    {/* Project Cards */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5" />
                          参画プロジェクト実績 ({company.projects.length}件)
                        </span>
                        <button
                          onClick={() => handleOpenAddProject(company.id)}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          プロジェクトを追加
                        </button>
                      </div>

                      {company.projects.length === 0 ? (
                        <div className="border border-dashed border-slate-800 rounded-lg p-4 text-center">
                          <p className="text-xs text-slate-500 mb-2">まだプロジェクト実績が登録されていません</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenAddProject(company.id)}
                            className="h-7 text-xs border-slate-700 text-slate-300"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            最初のプロジェクトを登録
                          </Button>
                        </div>
                      ) : (
                        company.projects.map((proj, pIndex) => {
                          const projPeriod = `${proj.startDate} 〜 ${proj.isCurrent ? "参画中" : proj.endDate || ""}`;
                          const episodes = proj.starEpisodes && proj.starEpisodes.length > 0
                            ? proj.starEpisodes
                            : (proj.situation || proj.action || proj.result)
                            ? [{ id: "fb", theme: "主要実績", situation: proj.situation || "", action: proj.action || "", result: proj.result || "" }]
                            : [];

                          return (
                            <div
                              key={proj.id}
                              className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 sm:p-3.5 space-y-2.5 relative group hover:border-slate-700 transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800/60 px-1.5 py-0.2 rounded">
                                      PJ {pIndex + 1}
                                    </span>
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-200">{proj.title}</h4>
                                    {proj.isCurrent && (
                                      <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-800/60 px-1.5 rounded">
                                        参画中
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap">
                                    <span className="font-mono text-slate-400">{projPeriod}</span>
                                    <span>•</span>
                                    <span className="text-slate-300 font-medium">{proj.role}</span>
                                    {proj.teamSize && (
                                      <>
                                        <span>•</span>
                                        <span className="flex items-center gap-0.5 text-slate-400">
                                          <Users className="h-3 w-3" />
                                          {proj.teamSize}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenEditProject(company.id, proj)}
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200"
                                    title="プロジェクトを編集"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteProject(company.id, proj.id)}
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400"
                                    title="プロジェクトを削除"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Phases (担当開発工程) */}
                              {proj.phases && proj.phases.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                  <Layers className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                                  <span className="text-[10px] text-slate-400 font-medium">担当工程:</span>
                                  {proj.phases.map((phase) => (
                                    <span
                                      key={phase}
                                      className="text-[10px] bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 px-1.5 py-0.2 rounded"
                                    >
                                      {phase}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Skills */}
                              {proj.skills && proj.skills.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                  <Code2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                  <span className="text-[10px] text-slate-400 font-medium">技術:</span>
                                  {proj.skills.map((skill) => (
                                    <span
                                      key={skill}
                                      className="text-[10px] bg-slate-900 text-indigo-300 border border-slate-700/80 px-1.5 py-0.2 rounded"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* STAR Episodes Cards */}
                              <div className="space-y-2 pt-1">
                                {episodes.map((ep, eIdx) => (
                                  <div
                                    key={ep.id}
                                    className="bg-slate-900/50 border border-slate-800/70 rounded-md p-2.5 space-y-1.5"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-800/60 px-1.5 rounded">
                                        成果エピソード {eIdx + 1}
                                      </span>
                                      {ep.theme && (
                                        <span className="text-xs font-semibold text-slate-200 truncate">
                                          {ep.theme}
                                        </span>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-xs">
                                      {ep.situation && (
                                        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/60 space-y-1">
                                          <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                                            <span>📌</span> 課題 (S)
                                          </span>
                                          <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
                                            {ep.situation}
                                          </p>
                                        </div>
                                      )}
                                      {ep.action && (
                                        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/60 space-y-1">
                                          <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                                            <span>💡</span> 工夫・行動 (A)
                                          </span>
                                          <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
                                            {ep.action}
                                          </p>
                                        </div>
                                      )}
                                      {ep.result && (
                                        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/60 space-y-1">
                                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                            <span>🏆</span> 成果 (R)
                                          </span>
                                          <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
                                            {ep.result}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Add/Edit Company */}
      {isCompanyModalOpen && editingCompany && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <Card className="w-full max-w-lg border-slate-800 bg-slate-900 shadow-2xl">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-400" />
                所属企業情報の編集
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">会社名 <span className="text-rose-400">*</span></label>
                <Input
                  value={editingCompany.companyName}
                  onChange={(e) => setEditingCompany({ ...editingCompany, companyName: e.target.value })}
                  placeholder="例: 株式会社テクノロジー"
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">雇用形態</label>
                  <select
                    value={editingCompany.employmentType || "正社員"}
                    onChange={(e) =>
                      setEditingCompany({
                        ...editingCompany,
                        employmentType: e.target.value as CompanyExperience["employmentType"],
                      })
                    }
                    className="w-full h-8 bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2"
                  >
                    <option value="正社員">正社員</option>
                    <option value="契約社員">契約社員</option>
                    <option value="業務委託">業務委託</option>
                    <option value="フリーランス">フリーランス</option>
                    <option value="その他">その他</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">所属部署 / 役職</label>
                  <Input
                    value={editingCompany.department || ""}
                    onChange={(e) => setEditingCompany({ ...editingCompany, department: e.target.value })}
                    placeholder="例: 開発本部 / テックリード"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">入社年月 (YYYY-MM)</label>
                  <Input
                    value={editingCompany.startDate}
                    onChange={(e) => setEditingCompany({ ...editingCompany, startDate: e.target.value })}
                    placeholder="2022-04"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-semibold">退社年月</label>
                    <label className="flex items-center gap-1 text-[11px] text-indigo-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingCompany.isCurrent ?? false}
                        onChange={(e) =>
                          setEditingCompany({
                            ...editingCompany,
                            isCurrent: e.target.checked,
                            endDate: e.target.checked ? undefined : editingCompany.endDate || "",
                          })
                        }
                      />
                      在籍中
                    </label>
                  </div>
                  <Input
                    value={editingCompany.isCurrent ? "在籍中" : editingCompany.endDate || ""}
                    disabled={editingCompany.isCurrent}
                    onChange={(e) => setEditingCompany({ ...editingCompany, endDate: e.target.value })}
                    placeholder="2024-03"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">事業内容・企業概要</label>
                <Textarea
                  value={editingCompany.description || ""}
                  onChange={(e) => setEditingCompany({ ...editingCompany, description: e.target.value })}
                  placeholder="例: BtoB SaaSプラットフォームの開発・提供、AI導入コンサルティング"
                  className="h-16 text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setIsCompanyModalOpen(false)} className="h-8 text-xs">
                  キャンセル
                </Button>
                <Button size="sm" onClick={handleSaveCompanyModal} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 font-semibold">
                  確定
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Add/Edit Project */}
      {isProjectModalOpen && editingProject && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <Card className="w-full max-w-3xl border-slate-800 bg-slate-900 shadow-2xl max-h-[92vh] flex flex-col my-auto">
            <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between shrink-0">
              <CardTitle className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-400" />
                プロジェクト実績の編集（工程・複数STAR対応）
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 pt-3 text-xs overflow-y-auto flex-1 pr-3">
              {/* Basic Project Info */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">プロジェクト名 / 業務概要 <span className="text-rose-400">*</span></label>
                <Input
                  value={editingProject.title}
                  onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                  placeholder="例: EC基幹システムの大規模マイクロサービス刷新とGo言語化"
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">担当役割 / ポジション</label>
                  <Input
                    value={editingProject.role}
                    onChange={(e) => setEditingProject({ ...editingProject, role: e.target.value })}
                    placeholder="例: テックリード / 設計・実装・レビュー"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">チーム規模</label>
                  <Input
                    value={editingProject.teamSize || ""}
                    onChange={(e) => setEditingProject({ ...editingProject, teamSize: e.target.value })}
                    placeholder="例: 7名 (自社5名, 委託2名)"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">開始年月 (YYYY-MM)</label>
                  <Input
                    value={editingProject.startDate}
                    onChange={(e) => setEditingProject({ ...editingProject, startDate: e.target.value })}
                    placeholder="2023-04"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-semibold">終了年月</label>
                    <label className="flex items-center gap-1 text-[11px] text-indigo-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingProject.isCurrent ?? false}
                        onChange={(e) =>
                          setEditingProject({
                            ...editingProject,
                            isCurrent: e.target.checked,
                            endDate: e.target.checked ? undefined : editingProject.endDate || "",
                          })
                        }
                      />
                      参画中
                    </label>
                  </div>
                  <Input
                    value={editingProject.isCurrent ? "参画中" : editingProject.endDate || ""}
                    disabled={editingProject.isCurrent}
                    onChange={(e) => setEditingProject({ ...editingProject, endDate: e.target.value })}
                    placeholder="2024-03"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Development Phases (担当開発工程) */}
              <div className="space-y-1.5 p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-slate-200 font-semibold flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-cyan-400" />
                    担当開発工程（フェーズ）
                  </label>
                  <span className="text-[10px] text-slate-500">ワンタップで複数選択</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {DEVELOPMENT_PHASES.map((phase) => {
                    const isSelected = (editingProject.phases || []).includes(phase);
                    return (
                      <button
                        key={phase}
                        type="button"
                        onClick={() => handleTogglePhase(phase)}
                        className={`text-[11px] px-2.5 py-1 rounded-md border transition-all font-medium flex items-center gap-1 ${
                          isSelected
                            ? "bg-cyan-950 border-cyan-600 text-cyan-200 shadow-sm"
                            : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-cyan-300" />}
                        {phase}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Skills Tags (資格・スキル設定準拠UI) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-200 font-semibold flex items-center gap-1.5">
                    <Code2 className="h-3.5 w-3.5 text-indigo-400" />
                    使用技術・スキルスタック ({editingProject.skills.length})
                  </label>
                  <span className="text-[10px] text-slate-500">カンマ区切りで複数一括登録可</span>
                </div>

                {/* スキル一覧表示エリア */}
                <div className="flex flex-wrap gap-1.5 min-h-[40px] max-h-28 overflow-y-auto p-2 bg-slate-950/80 rounded-lg border border-slate-800">
                  {editingProject.skills.length === 0 ? (
                    <span className="text-[11px] text-slate-500 py-0.5 px-1">
                      使用技術・スキルがまだ登録されていません
                    </span>
                  ) : (
                    editingProject.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="indigo"
                        className="text-xs pl-2.5 pr-1.5 py-0.5 flex items-center gap-1 bg-indigo-950/80 text-indigo-200 border border-indigo-700/60"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkillTag(skill)}
                          className="hover:bg-slate-700/50 rounded p-0.5 text-slate-400 hover:text-rose-300"
                          title={`${skill} を削除`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>

                {/* 入力欄 ＋ 独立した「＋ 追加」ボタン */}
                <div className="flex gap-2">
                  <Input
                    value={projectSkillInput}
                    onChange={(e) => setProjectSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkillTag();
                      }
                    }}
                    placeholder="追加するスキル (例: Go, AWS, Docker / カンマ区切り可)..."
                    className="h-8 text-xs bg-slate-950 border-slate-700 flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAddSkillTag()}
                    className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 shrink-0 font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>追加</span>
                  </Button>
                </div>

                {/* クイック候補チップ（保有スキルからワンタップ追加） */}
                {profile.skills && profile.skills.length > 0 && (
                  <div className="space-y-1 pt-0.5">
                    <div className="text-[10px] text-slate-400">💡 登録済みスキルからワンタップ追加:</div>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                      {profile.skills
                        .filter((s) => !editingProject.skills.includes(s.name))
                        .slice(0, 15)
                        .map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleAddSkillTag(s.name)}
                            className="text-[10px] px-2 py-0.5 bg-slate-900/90 hover:bg-indigo-950 border border-slate-800 hover:border-indigo-600 text-slate-300 hover:text-indigo-200 rounded transition-all flex items-center gap-0.5"
                          >
                            <Plus className="h-2.5 w-2.5 text-indigo-400" />
                            {s.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Multiple STAR Episodes */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span>🎯</span>
                      実績エピソード (STAR法誘導)
                      <span className="text-[11px] font-mono text-indigo-400 font-normal">
                        ({(editingProject.starEpisodes || []).length}件)
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      1つのプロジェクト内で解決した複数の課題や異なる成果を個別に記録できます
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddStarEpisode}
                    className="h-7 text-[11px] border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    エピソードを追加
                  </Button>
                </div>

                <div className="space-y-3">
                  {(editingProject.starEpisodes || []).map((episode, epIndex) => {
                    const isPolishingThis = polishingEpisodeId === episode.id;

                    return (
                      <div
                        key={episode.id}
                        className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2.5 relative shadow-sm"
                      >
                        {/* Episode Card Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/80 px-1.5 py-0.5 rounded shrink-0">
                              エピソード #{epIndex + 1}
                            </span>
                            <Input
                              value={episode.theme || ""}
                              onChange={(e) => handleUpdateStarEpisode(episode.id, "theme", e.target.value)}
                              placeholder="実績テーマ (例: DBコネクション枯渇解消とレイテンシ改善)"
                              className="h-7 text-xs flex-1 bg-slate-900 border-slate-700 font-semibold text-slate-200"
                            />
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAiPolishEpisode(episode)}
                              disabled={isPolishingThis}
                              className="h-7 text-[11px] bg-purple-950/60 border-purple-700/80 text-purple-300 hover:bg-purple-900/60 flex items-center gap-1"
                            >
                              {isPolishingThis ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  AI文章整形中...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3 w-3 text-purple-400" />
                                  ✨ AI文章整形
                                </>
                              )}
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteStarEpisode(episode.id)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400"
                              title="このエピソードを削除"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* STAR Inputs */}
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <label className="text-amber-400 font-semibold flex items-center gap-1">
                              <span>📌</span> 状況・課題 (Situation & Task)
                            </label>
                            <Textarea
                              value={episode.situation || ""}
                              onChange={(e) => handleUpdateStarEpisode(episode.id, "situation", e.target.value)}
                              placeholder="例: 秒間1,000reqのアクセス急増時にAPIレイテンシが2.5秒超へ悪化し、DB接続枯渇が発生していた。"
                              className="h-14 text-xs resize-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-indigo-400 font-semibold flex items-center gap-1">
                              <span>💡</span> 自身の工夫・技術的行動 (Action)
                            </label>
                            <Textarea
                              value={episode.action || ""}
                              onChange={(e) => handleUpdateStarEpisode(episode.id, "action", e.target.value)}
                              placeholder="例: DDDに基づきサービス境界を分離しGo製マイクロサービスへ移行。pgBouncerとコネクションプール最適化を主導。"
                              className="h-14 text-xs resize-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-emerald-400 font-semibold flex items-center gap-1">
                              <span>🏆</span> 達成した定量的成果 (Result)
                            </label>
                            <Textarea
                              value={episode.result || ""}
                              onChange={(e) => handleUpdateStarEpisode(episode.id, "result", e.target.value)}
                              placeholder="例: APIレスポンスを92%短縮（p99で180ms）。インフラ費用月額28%削減、障害ゼロを達成。"
                              className="h-14 text-xs resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>

            <div className="flex justify-end gap-2 p-3 border-t border-slate-800 shrink-0 bg-slate-950/60">
              <Button variant="outline" size="sm" onClick={() => setIsProjectModalOpen(false)} className="h-8 text-xs">
                キャンセル
              </Button>
              <Button size="sm" onClick={handleSaveProjectModal} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 font-semibold">
                プロジェクトを保存
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal: Resume Markdown Preview & Export */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <Card className="w-full max-w-3xl border-slate-800 bg-slate-900 shadow-2xl max-h-[85vh] flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between shrink-0">
              <div>
                <CardTitle className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-400" />
                  職務経歴書 (Markdown) プレビュー & 出力
                </CardTitle>
                <CardDescription className="text-xs">
                  全社・全プロジェクト・担当工程・複数STARエピソードから生成された職務経歴書テキストです
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={handleCopyMarkdown}
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "コピー完了！" : "経歴書をコピー"}
              </Button>
            </CardHeader>
            <CardContent className="p-4 overflow-y-auto flex-1 font-mono text-xs bg-slate-950 text-slate-300 whitespace-pre-wrap leading-relaxed select-all">
              {generateResumeMarkdown()}
            </CardContent>
            <div className="flex justify-end p-3 border-t border-slate-800 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setIsPreviewModalOpen(false)} className="h-8 text-xs">
                閉じる
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Sticky Bottom Action Bar for Mobile & Quick Access */}
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
              onClick={handleResetToDefault}
              disabled={isSaving}
              className="h-9 px-3 text-xs border-slate-700 hover:bg-slate-800 text-slate-300"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              初期値
            </Button>

            <Button
              size="sm"
              onClick={handleSaveAll}
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
                  <span>経歴を保存</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareerHistoryView;
