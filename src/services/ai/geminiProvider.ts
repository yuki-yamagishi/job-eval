import { JobAnalysisResult, AgentSource, JudgmentRank } from "@/types/job";
import { UserProfile } from "@/types/profile";
import { AiProvider } from "./aiProvider";
import { buildJobAnalysisPrompt, GEMINI_JOB_ANALYSIS_SCHEMA } from "@/core/prompt/jobAnalysisPrompt";
import { generateJobMarkdown } from "@/core/markdown/markdownGenerator";

interface GeminiRawResponse {
  company?: string;
  title?: string;
  salary_min?: number;
  salary_max?: number;
  location?: string;
  is_remote?: boolean;
  match_score?: number;
  judgment?: string;
  score_breakdown?: {
    skill_match_ratio?: number;
    condition_match_ratio?: number;
    career_growth_ratio?: number;
    environment_risk_ratio?: number;
  };
  tags?: string[];
  positives?: string[];
  concerns?: string[];
  agent_questions?: string[];
  appeal_points?: string[];
  qualification_advice?: {
    required_certifications?: string[];
    recommended_certifications?: string[];
    advice?: string;
  };
  must_requirements?: string[];
  want_requirements?: string[];
  job_description?: string[];
  selection_process?: string;
}

/**
 * Fetch list of available models for the provided Gemini API key from Google
 */
export async function fetchAvailableGeminiModels(
  apiKey: string
): Promise<{ ok: boolean; models: string[]; message?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { ok: false, models: [], message: "APIキーが入力されていません。" };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : null;

  try {
    const fetchOptions: RequestInit = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey.trim(),
      },
    };
    if (controller?.signal && typeof controller.signal === "object") {
      fetchOptions.signal = controller.signal;
    }

    const response = await fetch(endpoint, fetchOptions);
    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      return {
        ok: false,
        models: [],
        message: `HTTP ${response.status}: ${errText.slice(0, 150)}`,
      };
    }

    const data = await response.json();
    const rawModels: Array<{ name: string; supportedGenerationMethods?: string[] }> = data?.models || [];
    
    // Filter models supporting generateContent
    const validModels = rawModels
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""));

    return {
      ok: true,
      models: validModels.length > 0 ? validModels : rawModels.map((m) => m.name.replace(/^models\//, "")),
    };
  } catch (err: unknown) {
    if (timeoutId) clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, models: [], message: `通信エラー: ${msg}` };
  }
}

/**
 * Test connectivity with Gemini API using provided API key and model (with 20s timeout)
 */
export async function testGeminiConnection(
  apiKey: string,
  model: string = "gemini-2.0-flash"
): Promise<{ ok: boolean; message: string; availableModels?: string[] }> {
  if (!apiKey || !apiKey.trim()) {
    return { ok: false, message: "APIキーが入力されていません。" };
  }

  const sanitizedModel = (model || "gemini-2.0-flash").replace(/^models\//, "").trim();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${sanitizedModel}:generateContent?key=${apiKey.trim()}`;
  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: "Hello" }],
      },
    ],
  };

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 20000) : null;

  try {
    const fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey.trim(),
      },
      body: JSON.stringify(requestBody),
    };
    if (controller?.signal && typeof controller.signal === "object") {
      fetchOptions.signal = controller.signal;
    }

    const response = await fetch(endpoint, fetchOptions);
    if (timeoutId) clearTimeout(timeoutId);

    if (response.ok) {
      return { 
        ok: true, 
        message: `Gemini API (${sanitizedModel}) への疎通・認証に成功しました！正常に通信可能です。` 
      };
    }

    const errorData = await response.text();
    if (response.status === 400 || response.status === 403) {
      return { ok: false, message: `認証エラー (HTTP ${response.status}): APIキーが無効か権限がありません。Google AI Studioでキーをご確認ください。` };
    } else if (response.status === 404) {
      // Fetch available models to guide user
      const modelFetch = await fetchAvailableGeminiModels(apiKey);
      const hint = modelFetch.models.length > 0 
        ? `\n利用可能なモデル一覧: ${modelFetch.models.slice(0, 5).join(", ")}`
        : "";
      return { 
        ok: false, 
        message: `モデル未検出 (HTTP 404): モデル '${sanitizedModel}' が見つかりませんでした。${hint}`,
        availableModels: modelFetch.models
      };
    } else if (response.status === 429) {
      return { ok: false, message: "レート制限エラー (HTTP 429): APIの利用上限に達しています。しばらく待ってから再試行してください。" };
    }
    return { ok: false, message: `API接続エラー (HTTP ${response.status}): ${errorData.slice(0, 150)}` };
  } catch (err: unknown) {
    if (timeoutId) clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, message: "タイムアウト: 20秒以内に応答がありませんでした。通信環境またはプロキシ設定をご確認ください。" };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `通信エラー: ${msg}` };
  }
}

export class GeminiAiProvider implements AiProvider {
  name = "GeminiAiProvider";

  async analyzeJob(
    jobText: string,
    source: AgentSource,
    profile: UserProfile
  ): Promise<JobAnalysisResult> {
    const apiKey = profile.apiSettings?.geminiApiKey?.trim();
    if (!apiKey) {
      throw new Error("Gemini API キーが設定されていません。プロファイル設定画面から入力してください。");
    }

    const rawModel = profile.apiSettings?.geminiModel || "gemini-2.0-flash";
    const model = rawModel.replace(/^models\//, "").trim();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const { systemInstruction, userPrompt } = buildJobAnalysisPrompt(jobText, source, profile);

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: GEMINI_JOB_ANALYSIS_SCHEMA,
        temperature: 0.2,
      },
    };

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 30000) : null;

    try {
      const fetchOptions: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(requestBody),
      };

      if (controller?.signal && typeof controller.signal === "object") {
        fetchOptions.signal = controller.signal;
      }

      const response = await fetch(endpoint, fetchOptions);

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 400 || response.status === 403) {
          throw new Error(`Gemini API 認証エラー (HTTP ${response.status}): APIキーをご確認ください。`);
        } else if (response.status === 404) {
          throw new Error(`Gemini API モデルエラー (HTTP 404): モデル '${model}' は利用できません。プロファイル設定で別のモデルを選択してください。`);
        } else if (response.status === 429) {
          throw new Error("Gemini API レート制限に達しました。しばらく待ってから再試行してください。");
        }
        throw new Error(`Gemini API 呼び出しエラー (HTTP ${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error("Gemini からの応答が空でした。");
      }

      const parsed: GeminiRawResponse = JSON.parse(rawText);
      return this.transformToJobAnalysisResult(parsed, source);
    } catch (err: unknown) {
      if (timeoutId) clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Gemini API 呼び出しがタイムアウトしました (30秒)。通信環境をご確認ください。");
      }
      throw err;
    }
  }

  /**
   * Defensive mapping to JobAnalysisResult
   */
  public transformToJobAnalysisResult(
    raw: GeminiRawResponse,
    source: AgentSource
  ): JobAnalysisResult {
    const today = new Date().toISOString().split("T")[0];
    const jobId = `job-${today.replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;

    const company = (raw.company || "企業名非公開").trim();
    const title = (raw.title || "エンジニア / 専門職").trim();
    const matchScore = Math.max(0, Math.min(100, Math.round(raw.match_score ?? 75)));

    // Validate judgment rank enum
    const validRanks: JudgmentRank[] = ["S (即応募推奨)", "A (即応募推奨)", "B (要確認・検討)", "C (見送り推奨)"];
    const judgment: JudgmentRank = validRanks.includes(raw.judgment as JudgmentRank)
      ? (raw.judgment as JudgmentRank)
      : matchScore >= 85 ? "A (即応募推奨)" : matchScore >= 65 ? "B (要確認・検討)" : "C (見送り推奨)";

    const scoreBreakdown = {
      skillMatchRatio: Math.round(raw.score_breakdown?.skill_match_ratio ?? 70),
      conditionMatchRatio: Math.round(raw.score_breakdown?.condition_match_ratio ?? 70),
      careerGrowthRatio: Math.round(raw.score_breakdown?.career_growth_ratio ?? 70),
      environmentRiskRatio: Math.round(raw.score_breakdown?.environment_risk_ratio ?? 80),
    };

    const metadata = {
      id: jobId,
      company,
      title,
      agentSource: source,
      dateAnalyzed: today,
      salaryMin: raw.salary_min ? Number(raw.salary_min) : undefined,
      salaryMax: raw.salary_max ? Number(raw.salary_max) : undefined,
      matchScore,
      judgment,
      status: "未検討" as const,
      tags: raw.tags && raw.tags.length > 0 ? raw.tags : ["IT", "エンジニア"],
    };

    const positives = raw.positives && raw.positives.length > 0 ? raw.positives : ["スキルと業務内容に一定の一致が見られます。"];
    const concerns = raw.concerns && raw.concerns.length > 0 ? raw.concerns : ["選考時に詳細な業務負荷の確認を推奨。"];
    const agentQuestions = raw.agent_questions && raw.agent_questions.length > 0 ? raw.agent_questions : ["プロジェクトの体制とマイルストーンについて確認。"];
    const appealPoints = raw.appeal_points && raw.appeal_points.length > 0 ? raw.appeal_points : ["これまでの開発実績と強みを訴求。"];
    const mustRequirements = raw.must_requirements || [];
    const wantRequirements = raw.want_requirements || [];
    const jobDescription = raw.job_description || [];

    const qualificationAdvice = raw.qualification_advice
      ? {
          requiredCertifications: raw.qualification_advice.required_certifications || [],
          recommendedCertifications: raw.qualification_advice.recommended_certifications || [],
          advice: raw.qualification_advice.advice || "",
        }
      : undefined;

    const markdownContent = generateJobMarkdown({
      metadata,
      scoreBreakdown,
      positives,
      concerns,
      agentQuestions,
      appealPoints,
      qualificationAdvice,
      mustRequirements,
      wantRequirements,
      jobDescription,
      selectionProcess: raw.selection_process,
    });

    return {
      metadata,
      scoreBreakdown,
      positives,
      concerns,
      agentQuestions,
      appealPoints,
      qualificationAdvice,
      jobDetails: {
        mustRequirements,
        wantRequirements,
        jobDescription,
        location: raw.location || "東京都",
        selectionProcess: raw.selection_process || "書類選考 → 面接",
      },
      markdownContent,
    };
  }
}
