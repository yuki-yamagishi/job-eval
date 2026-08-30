import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { InputPane } from "@/components/pane/InputPane";
import { PreviewPane } from "@/components/pane/PreviewPane";
import { JobDashboard } from "@/components/dashboard/JobDashboard";
import { ProfileSettingsView } from "@/features/profile/ProfileSettingsView";
import { analyzeJobWithProfile } from "@/services/ai/aiService";
import { useProfile } from "@/hooks/useProfile";
import { useJobs } from "@/hooks/useJobs";
import { JobAnalysisResult, AgentSource } from "@/types/job";

export function App() {
  const [activeTab, setActiveTab] = useState<string>("input");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<JobAnalysisResult | null>(null);

  // Custom Hooks for persistence
  const { profile, saveProfile, resetToDefault, isLoading, isSaving, lastSavedTime } = useProfile();
  const { jobs, saveJob, updateJobStatus, deleteJob, exportMarkdown } = useJobs();

  const handleAnalyze = async (text: string, source: AgentSource) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeJobWithProfile(text, source, profile);
      setAnalysisResult(result);
    } catch (error: unknown) {
      console.error("Analysis failed", error);
      const message = error instanceof Error ? error.message : "AI解析に失敗しました。";
      alert(`【エラー】${message}\nMockエンジンで再試行できます。`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveMarkdown = async (editedContent?: string) => {
    if (analysisResult) {
      const targetResult = editedContent
        ? { ...analysisResult, markdownContent: editedContent }
        : analysisResult;

      await saveJob(targetResult);
      await exportMarkdown(targetResult);
      alert("求人Markdownドキュメントをローカルへ保存・ダウンロードしました！");
    }
  };

  const hasApiKey = Boolean(profile.apiSettings?.geminiApiKey?.trim());

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Header Navigation */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === "input" && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Left Pane: Input (5 cols) */}
            <div className="lg:col-span-5 border-r border-slate-800/80 h-full overflow-hidden bg-slate-950/40">
              <InputPane
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
                hasApiKey={hasApiKey}
              />
            </div>

            {/* Right Pane: AI Score & Markdown Preview (7 cols) */}
            <div className="lg:col-span-7 h-full overflow-hidden">
              <PreviewPane
                analysisResult={analysisResult}
                isAnalyzing={isAnalyzing}
                onSaveMarkdown={handleSaveMarkdown}
              />
            </div>
          </div>
        )}

        {activeTab === "dashboard" && (
          <JobDashboard
            savedJobs={jobs}
            onUpdateStatus={updateJobStatus}
            onDeleteJob={deleteJob}
            onExportJob={exportMarkdown}
          />
        )}

        {activeTab === "profile" && (
          <ProfileSettingsView
            profile={profile}
            onSaveProfile={saveProfile}
            onResetProfile={resetToDefault}
            isLoading={isLoading}
            isSaving={isSaving}
            lastSavedTime={lastSavedTime}
          />
        )}
      </main>
    </div>
  );
}

export default App;
