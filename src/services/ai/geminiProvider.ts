import { JobAnalysisResult, AgentSource, JudgmentRank, CareerTrajectory, CorporateBenefitResearch, WebSourceItem } from "@/types/job";
import { UserProfile } from "@/types/profile";
import { AiProvider } from "./aiProvider";
import {
  buildJobAnalysisPrompt,
  buildJobReEvaluationPrompt,
  buildCareerTrajectoryPrompt,
  buildCorporateBenefitPrompt,
  GEMINI_JOB_ANALYSIS_SCHEMA,
  GEMINI_CAREER_TRAJECTORY_SCHEMA,
} from "@/core/prompt/jobAnalysisPrompt";
import { generateJobMarkdown } from "@/core/markdown/markdownGenerator";
import { inferHealthInsuranceType, extractHealthInsuranceFromText, type HealthInsuranceType } from "@/core/constants/healthInsurance";

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
  benefit_info?: {
    health_insurance_name?: string;
    has_corporate_dc?: boolean;
    annual_holidays?: string;
  };
  qualification_advice?: {
    required_certifications?: string[];
    recommended_certifications?: string[];
    advice?: string;
  };
  career_trajectory?: {
    acquired_skills?: string[];
    next_career_options?: string[];
    market_value_projection?: string;
    career_risks_or_lockin?: string;
    overall_outlook?: string;
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

const RECOMMENDED_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
];

/**
 * Test connectivity with Gemini API using provided API key and model
 */
export async function testGeminiConnection(
  apiKey: string,
  model: string = "gemini-3.5-flash-lite"
): Promise<{ ok: boolean; message: string; availableModels?: string[] }> {
  if (!apiKey || !apiKey.trim()) {
    return { ok: false, message: "APIキーが入力されていません。" };
  }

  const sanitizedModel = (model || "gemini-3.6-flash").replace(/^models\//, "").trim();
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
  const timeoutId = controller ? setTimeout(() => controller.abort(), 12000) : null;

  try {
    const fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
        message: `Gemini API (${sanitizedModel}) への接続・認証に成功しました！正常に応答が得られました。` 
      };
    }

    const errorData = await response.text();
    let errorJson: { error?: { code?: number; message?: string } } | null = null;
    try {
      errorJson = JSON.parse(errorData);
    } catch {
      // plain text
    }

    const errorMsg = errorJson?.error?.message || errorData;

    if (response.status === 400 || response.status === 403) {
      return { ok: false, message: `認証エラー (HTTP ${response.status}): APIキーが無効か権限がありません。Google AI Studioでキーをご確認ください。` };
    } else if (response.status === 404) {
      return { 
        ok: false, 
        message: `モデル未検出 (HTTP 404): モデル '${sanitizedModel}' は提供終了または存在しません。「gemini-3.6-flash」または「gemini-3.5-flash」をお試しください。`
      };
    } else if (response.status === 503) {
      return { 
        ok: false, 
        message: `Googleサーバー高負荷 (HTTP 503): モデル '${sanitizedModel}' が混雑しています。「gemini-3.6-flash」や「gemini-3.5-flash」を選択してください。` 
      };
    } else if (response.status === 429) {
      return { ok: false, message: "レート制限エラー (HTTP 429): APIの利用上限に達しています。しばらく待ってから再試行してください。" };
    }
    return { ok: false, message: `API接続エラー (HTTP ${response.status}): ${errorMsg.slice(0, 150)}` };
  } catch (err: unknown) {
    if (timeoutId) clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, message: `タイムアウト: モデル '${sanitizedModel}' の応答に12秒以上かかりました。高速な「gemini-3.6-flash」または「gemini-3.5-flash」をお試しください。` };
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

    const primaryModel = (profile.apiSettings?.geminiModel || "gemini-3.5-flash-lite").replace(/^models\//, "").trim();
    const thinkingLevel = profile.apiSettings?.thinkingLevel || "low";
    
    // Fallback list of models if primary model suffers from 503 high demand or timeout
    const candidateModels = Array.from(new Set([primaryModel, ...RECOMMENDED_MODELS]));
    let lastError: Error | null = null;

    for (const model of candidateModels) {
      try {
        return await this.callGeminiModel(jobText, source, profile, apiKey, model, thinkingLevel);
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`Gemini model ${model} failed, trying fallback model...`, lastError.message);
      }
    }

    throw lastError || new Error("Gemini API での解析に失敗しました。");
  }

  async reEvaluateJob(
    previousResult: JobAnalysisResult,
    userFeedback: string,
    profile: UserProfile
  ): Promise<JobAnalysisResult> {
    const apiKey = profile.apiSettings?.geminiApiKey?.trim();
    if (!apiKey) {
      throw new Error("Gemini API キーが設定されていません。プロファイル設定画面から入力してください。");
    }

    const primaryModel = (profile.apiSettings?.deepEvalModel || profile.apiSettings?.geminiModel || "gemini-3.8-flash").replace(/^models\//, "").trim();
    const thinkingLevel = profile.apiSettings?.thinkingLevel || "medium";
    const candidateModels = Array.from(new Set([primaryModel, ...RECOMMENDED_MODELS]));
    let lastError: Error | null = null;

    const { systemInstruction, userPrompt } = buildJobReEvaluationPrompt(previousResult, userFeedback, profile);

    for (const model of candidateModels) {
      try {
        const raw = await this.executeGeminiRequest(apiKey, model, systemInstruction, userPrompt, thinkingLevel);
        const newResult = this.transformToJobAnalysisResult(raw, previousResult.metadata.agentSource);
        
        // Preserve original job ID, status, and append feedback history
        const updatedHistory = [
          ...(previousResult.feedbackHistory || []),
          {
            date: new Date().toISOString(),
            feedback: userFeedback,
            previousScore: previousResult.metadata.matchScore,
            newScore: newResult.metadata.matchScore,
          },
        ];

        return {
          ...newResult,
          metadata: {
            ...newResult.metadata,
            id: previousResult.metadata.id,
            status: previousResult.metadata.status,
            rejectReason: previousResult.metadata.rejectReason,
          },
          originalJobText: previousResult.originalJobText,
          feedbackHistory: updatedHistory,
        };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`Gemini re-evaluation model ${model} failed, trying fallback...`, lastError.message);
      }
    }

    throw lastError || new Error("Gemini API での再評価に失敗しました。");
  }

  async generateCareerTrajectory(
    jobResult: JobAnalysisResult,
    profile: UserProfile
  ): Promise<CareerTrajectory> {
    const apiKey = profile.apiSettings?.geminiApiKey?.trim();
    if (!apiKey) {
      throw new Error("Gemini API キーが設定されていません。プロファイル設定画面から入力してください。");
    }

    const primaryModel = (profile.apiSettings?.deepEvalModel || profile.apiSettings?.geminiModel || "gemini-3.8-flash").replace(/^models\//, "").trim();
    const candidateModels = Array.from(new Set([primaryModel, ...RECOMMENDED_MODELS]));
    let lastError: Error | null = null;

    const { systemInstruction, userPrompt } = buildCareerTrajectoryPrompt(jobResult, profile);

    for (const model of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
            responseSchema: GEMINI_CAREER_TRAJECTORY_SCHEMA,
            temperature: 0.2,
            thinkingConfig: {
              thinkingLevel: profile.apiSettings?.thinkingLevel === "minimal" ? "low" : (profile.apiSettings?.thinkingLevel || "medium"),
            },
          },
        };

        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 20000) : null;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: controller?.signal,
        });
        if (timeoutId) clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Gemini API エラー (HTTP ${response.status})`);
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error("Gemini からの応答が空でした。");

        const raw = JSON.parse(rawText);
        return {
          acquiredSkills: raw.acquired_skills || ["モダンアーキテクチャの設計・構築経験"],
          nextCareerOptions: raw.next_career_options || ["スタッフエンジニア", "EM / VPoE"],
          marketValueProjection: raw.market_value_projection || "想定年収: 1,000万〜1,300万円",
          careerRisksOrLockin: raw.career_risks_or_lockin,
          overallOutlook: raw.overall_outlook || "技術的専門性を活かした市場価値向上が見込めます。",
        };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`Gemini career trajectory model ${model} failed, trying fallback...`, lastError.message);
      }
    }

    throw lastError || new Error("Gemini API でのキャリア展望生成に失敗しました。");
  }

  async researchCorporateBenefits(
    jobResult: JobAnalysisResult,
    profile: UserProfile
  ): Promise<CorporateBenefitResearch> {
    const apiKey = profile.apiSettings?.geminiApiKey?.trim();
    if (!apiKey) {
      throw new Error("Gemini API キーが設定されていません。プロファイル設定画面から入力してください。");
    }

    const primaryModel = (profile.apiSettings?.researchModel || "gemini-3.5-flash-lite").replace(/^models\//, "").trim();
    const candidateModels = Array.from(new Set([primaryModel, ...RECOMMENDED_MODELS]));
    let lastError: Error | null = null;

    const { systemInstruction, userPrompt } = buildCorporateBenefitPrompt(jobResult);

    for (const model of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
          tools: [
            {
              googleSearch: {},
            },
          ],
          generationConfig: {
            temperature: 0.1,
            thinkingConfig: {
              thinkingLevel: "minimal",
            },
          },
        };

        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 25000) : null;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: controller?.signal,
        });
        if (timeoutId) clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API エラー (HTTP ${response.status}): ${errText.slice(0, 150)}`);
        }

        const data = await response.json();
        const candidate = data?.candidates?.[0];
        const rawText = candidate?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error("Gemini からの応答が空でした。");

        // Extract sources from groundingMetadata
        const sources: WebSourceItem[] = [];
        const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];
        for (const chunk of groundingChunks) {
          if (chunk.web?.uri) {
            sources.push({
              title: chunk.web.title || chunk.web.uri,
              url: chunk.web.uri,
            });
          }
        }

        interface RawBenefitResearchJson {
          company_name?: string;
          health_insurance?: {
            type?: HealthInsuranceType;
            name?: string;
            confidence?: string;
            benefits?: string[];
            notes?: string;
          };
          corporate_dc?: {
            has_dc?: boolean | string;
            matching_contribution?: boolean;
            db_plan?: boolean;
            details?: string;
          };
          work_environment?: {
            annual_holidays?: string;
            paid_leave_rate?: string;
            side_job_allowed?: boolean | string;
            notes?: string[];
          };
          summary_advice?: string;
        }

        // Parse JSON from raw text (handling markdown code blocks if present)
        let parsed: RawBenefitResearchJson = {};
        try {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]) as RawBenefitResearchJson;
          } else {
            parsed = JSON.parse(rawText) as RawBenefitResearchJson;
          }
        } catch {
          // Fallback parsing if plain text was returned
          const inferredType = inferHealthInsuranceType(undefined, rawText);
          parsed = {
            company_name: jobResult.metadata.company,
            health_insurance: {
              type: inferredType,
              name: inferredType === "tjk" ? "東京都情報サービス産業健康保険組合 (TJK)" : inferredType === "its" ? "関東ITソフトウェア健康保険組合 (ITS健保)" : "全国健康保険協会 (協会けんぽ)",
              confidence: "medium",
              benefits: ["Web調査結果サマリーを参照"],
              notes: rawText.slice(0, 200),
            },
            corporate_dc: {
              has_dc: rawText.includes("確定拠出年金") || rawText.includes("企業型DC"),
              details: rawText.slice(0, 200),
            },
            summary_advice: rawText.slice(0, 300),
          };
        }

        const rawHealthName = parsed.health_insurance?.name || "要確認";
        const healthType = parsed.health_insurance?.type || inferHealthInsuranceType(rawHealthName, rawText);
        const validConfidences = ["high", "medium", "low"] as const;
        const rawConfidence = parsed.health_insurance?.confidence;
        const confidence: "high" | "medium" | "low" =
          rawConfidence && (validConfidences as readonly string[]).includes(rawConfidence)
            ? (rawConfidence as "high" | "medium" | "low")
            : "medium";

        const normalizeBooleanOrUnknown = (val: unknown): boolean | "不明" => {
          if (val === true || val === false) return val;
          return "不明";
        };

        return {
          companyName: parsed.company_name || jobResult.metadata.company,
          researchedAt: new Date().toISOString(),
          healthInsurance: {
            type: healthType,
            name: rawHealthName,
            confidence,
            benefits: Array.isArray(parsed.health_insurance?.benefits) ? parsed.health_insurance.benefits : [],
            notes: parsed.health_insurance?.notes,
          },
          corporateDC: {
            hasDC: normalizeBooleanOrUnknown(parsed.corporate_dc?.has_dc),
            matchingContribution: parsed.corporate_dc?.matching_contribution,
            dbPlan: parsed.corporate_dc?.db_plan,
            details: parsed.corporate_dc?.details || "詳細不明",
          },
          workEnvironment: parsed.work_environment ? {
            annualHolidays: parsed.work_environment.annual_holidays,
            paidLeaveRate: parsed.work_environment.paid_leave_rate,
            sideJobAllowed: normalizeBooleanOrUnknown(parsed.work_environment.side_job_allowed),
            notes: Array.isArray(parsed.work_environment.notes) ? parsed.work_environment.notes : [],
          } : undefined,
          sources: sources.length > 0 ? sources : [
            {
              title: `${jobResult.metadata.company} Web検索結果`,
              url: `https://www.google.com/search?q=${encodeURIComponent(jobResult.metadata.company + " 福利厚生 健康保険 企業型DC")}`,
            },
          ],
          summaryAdvice: parsed.summary_advice || "Web公開情報に基づく福利厚生サマリーです。",
        };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`Gemini research benefits model ${model} failed, trying fallback...`, lastError.message);
      }
    }

    throw lastError || new Error("Gemini API での福利厚生Web調査に失敗しました。");
  }

  private async executeGeminiRequest(
    apiKey: string,
    model: string,
    systemInstruction: string,
    userPrompt: string,
    thinkingLevel: string = "low"
  ): Promise<GeminiRawResponse> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const generationConfig: Record<string, unknown> = {
      responseMimeType: "application/json",
      responseSchema: GEMINI_JOB_ANALYSIS_SCHEMA,
      temperature: 0.2,
    };
    if (thinkingLevel) {
      generationConfig.thinkingConfig = { thinkingLevel };
    }

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
      generationConfig,
    };

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 20000) : null;

    try {
      const fetchOptions: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
        } else if (response.status === 503) {
          throw new Error(`Gemini API (HTTP 503): モデル '${model}' が混雑しています。`);
        } else if (response.status === 404) {
          throw new Error(`Gemini API (HTTP 404): モデル '${model}' は利用できません。`);
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

      return JSON.parse(rawText);
    } catch (err: unknown) {
      if (timeoutId) clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Gemini API 呼び出しがタイムアウトしました (${model})。`);
      }
      throw err;
    }
  }

  private async callGeminiModel(
    jobText: string,
    source: AgentSource,
    profile: UserProfile,
    apiKey: string,
    model: string,
    thinkingLevel: string = "low"
  ): Promise<JobAnalysisResult> {
    const { systemInstruction, userPrompt } = buildJobAnalysisPrompt(jobText, source, profile);
    const parsed = await this.executeGeminiRequest(apiKey, model, systemInstruction, userPrompt, thinkingLevel);
    const result = this.transformToJobAnalysisResult(parsed, source, jobText);
    return {
      ...result,
      originalJobText: jobText,
    };
  }

  /**
   * Defensive mapping to JobAnalysisResult
   */
  public transformToJobAnalysisResult(
    raw: GeminiRawResponse,
    source: AgentSource,
    originalJobText?: string
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

    const careerTrajectory = raw.career_trajectory
      ? {
          acquiredSkills: raw.career_trajectory.acquired_skills || [],
          nextCareerOptions: raw.career_trajectory.next_career_options || [],
          marketValueProjection: raw.career_trajectory.market_value_projection || "",
          careerRisksOrLockin: raw.career_trajectory.career_risks_or_lockin,
          overallOutlook: raw.career_trajectory.overall_outlook || "",
        }
      : undefined;

    // Extract initial corporate benefit research if health insurance or DC is mentioned in job text or raw response
    let benefitResearch: CorporateBenefitResearch | undefined = undefined;
    const extractedInsurance = extractHealthInsuranceFromText(
      raw.benefit_info?.health_insurance_name || originalJobText || ""
    );
    if (extractedInsurance) {
      benefitResearch = {
        companyName: company,
        researchedAt: new Date().toISOString(),
        healthInsurance: {
          type: extractedInsurance.type,
          name: extractedInsurance.name,
          confidence: extractedInsurance.confidence,
          benefits: extractedInsurance.benefits,
          notes: extractedInsurance.notes,
        },
        corporateDC: {
          hasDC: raw.benefit_info?.has_corporate_dc ?? (originalJobText?.includes("確定拠出年金") || originalJobText?.includes("企業型DC") ? true : "不明"),
          details: raw.benefit_info?.has_corporate_dc ? "求人票に導入記載あり" : "求人票記載情報",
        },
        workEnvironment: raw.benefit_info?.annual_holidays ? {
          annualHolidays: raw.benefit_info.annual_holidays,
        } : undefined,
        sources: [],
        summaryAdvice: `${company} は求人票記載情報に基づき ${extractedInsurance.name} に加入しています。`,
      };
    }

    const markdownContent = generateJobMarkdown({
      metadata,
      scoreBreakdown,
      positives,
      concerns,
      agentQuestions,
      appealPoints,
      qualificationAdvice,
      careerTrajectory,
      benefitResearch,
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
      careerTrajectory,
      benefitResearch,
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
