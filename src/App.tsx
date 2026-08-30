import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { InputPane } from "@/components/pane/InputPane";
import { PreviewPane } from "@/components/pane/PreviewPane";
import { JobDashboard } from "@/components/dashboard/JobDashboard";
import { CareerRoadmapView } from "@/features/roadmap/CareerRoadmapView";
import { ProfileSettingsView } from "@/features/profile/ProfileSettingsView";
import { 
  analyzeJobWithProfile, 
  reEvaluateJobWithProfile, 
  generateCareerTrajectoryWithProfile 
} from "@/services/ai/aiService";
import { generateJobMarkdown } from "@/core/markdown/markdownGenerator";
import { useProfile } from "@/hooks/useProfile";
import { useJobs } from "@/hooks/useJobs";
import { JobAnalysisResult, AgentSource } from "@/types/job";

export function App() {
  const [activeTab, setActiveTab] = useState<string>("input");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReEvaluating, setIsReEvaluating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<JobAnalysisResult | null>(null);

  // Custom Hooks for persistence
  const { profile, saveProfile, resetToDefault, isLoading, isSaving, lastSavedTime } = useProfile();
  const { jobs, fetchJobs, saveJob, updateJobStatus, importJobFromMarkdown, deleteJob, exportMarkdown } = useJobs();

  const handleAnalyze = async (text: string, source: AgentSource) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeJobWithProfile(text, source, profile);
      setAnalysisResult(result);
      // Auto-save immediately to local storage on successful analysis
      await saveJob(result);
    } catch (error: unknown) {
      console.error("Analysis failed", error);
      const message = error instanceof Error ? error.message : "AI解析に失敗しました。";
      alert(`【エラー】${message}\nMockエンジンで再試行できます。`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReEvaluate = async (userFeedback: string) => {
    if (!analysisResult) return;
    setIsReEvaluating(true);
    try {
      const updatedResult = await reEvaluateJobWithProfile(analysisResult, userFeedback, profile);
      setAnalysisResult(updatedResult);
      // Auto-update storage
      await saveJob(updatedResult);
    } catch (error: unknown) {
      console.error("Re-evaluation failed", error);
      const message = error instanceof Error ? error.message : "AI再評価に失敗しました。";
      alert(`【再評価エラー】${message}`);
    } finally {
      setIsReEvaluating(false);
    }
  };

  const handleGenerateCareerTrajectory = async (job: JobAnalysisResult) => {
    try {
      const trajectory = await generateCareerTrajectoryWithProfile(job, profile);
      const updatedMarkdown = generateJobMarkdown({
        metadata: job.metadata,
        scoreBreakdown: job.scoreBreakdown,
        positives: job.positives,
        concerns: job.concerns,
        agentQuestions: job.agentQuestions,
        appealPoints: job.appealPoints,
        qualificationAdvice: job.qualificationAdvice,
        careerTrajectory: trajectory,
        mustRequirements: job.jobDetails.mustRequirements,
        wantRequirements: job.jobDetails.wantRequirements,
        jobDescription: job.jobDetails.jobDescription,
        selectionProcess: job.jobDetails.selectionProcess,
      });

      const updatedJob: JobAnalysisResult = {
        ...job,
        careerTrajectory: trajectory,
        markdownContent: updatedMarkdown,
      };

      setAnalysisResult(updatedJob);
      await saveJob(updatedJob);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("Generating career trajectory failed:", err);
      alert(`キャリア展望の生成に失敗しました:\n${err.message}`);
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

  const handleSelectJobForPreview = (job: JobAnalysisResult) => {
    setAnalysisResult(job);
    setActiveTab("input");
  };

  const handleImportMarkdown = async (markdownContent: string) => {
    try {
      const imported = await importJobFromMarkdown(markdownContent);
      setAnalysisResult(imported);
      setActiveTab("input");
    } catch (err) {
      console.error("Failed to import markdown", err);
      alert("Markdownファイルのインポートに失敗しました。");
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
                isReEvaluating={isReEvaluating}
                onSaveMarkdown={handleSaveMarkdown}
                onReEvaluate={handleReEvaluate}
                onGenerateCareerTrajectory={handleGenerateCareerTrajectory}
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
            onSelectJobForPreview={handleSelectJobForPreview}
            onImportMarkdown={handleImportMarkdown}
          />
        )}

        {activeTab === "roadmap" && (
          <CareerRoadmapView
            savedJobs={jobs}
            profile={profile}
            onSelectJobForPreview={handleSelectJobForPreview}
            onUpdateStatus={updateJobStatus}
            onRefreshJobs={fetchJobs}
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
