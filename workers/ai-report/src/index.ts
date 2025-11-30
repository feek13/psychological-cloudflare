/**
 * AI Report Worker
 * Cloudflare Worker for generating psychological assessment reports using OpenRouter API
 *
 * Endpoints:
 * POST /generate - Generate an AI-powered assessment report
 */

import type {
  Env,
  ReportRequest,
  ReportResponse,
  Scores,
  QuestionWithAnswer,
  OpenRouterRequest,
  OpenRouterResponse,
} from './types';

// OpenRouter API base URL
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Free models list (ordered by priority - Nov 2025)
const MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-3-27b-it:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'qwen/qwen3-235b-a22b:free',
  'google/gemma-3n-e2b-it:free',
  'nvidia/nemotron-nano-9b-v2:free',
];

// Psychological analysis prompt template
const PSYCHOLOGICAL_ANALYSIS_PROMPT = `
你是一位专业的心理咨询师。请根据学生的测评数据和答题情况，撰写一份简洁的心理分析报告。

## 测评信息
- 量表: {scale_name}
- 总分: {total_score} | 均分: {total_mean} | 级别: {severity_level}

## 维度得分
{dimension_scores}

## 高分题目（需重点关注）
{high_score_questions}

---

请撰写包含以下 3 部分的分析报告：

### 1. 总体评估（100-150字）
简要说明心理健康状况和主要特征。

### 2. 问题分析（200-250字）
根据高分题目，分析存在的主要困扰及可能原因。

### 3. 改善建议（150-200字）
提供 3-5 条具体可行的调节方法，必要时建议寻求专业帮助。

## 要求
- 语言温和专业，避免负面标签
- 提供具体可操作的建议
- 使用 Markdown 格式
- 总字数 500-600 字

直接输出报告内容。
`;

// Severity map
const SEVERITY_MAP: Record<string, string> = {
  normal: '正常',
  mild: '轻度',
  moderate: '中度',
  severe: '重度',
};

// Severity descriptions for fallback
const SEVERITY_DESCRIPTIONS: Record<string, string> = {
  normal: '您的心理健康状况良好，请继续保持积极的生活态度。',
  mild: '您可能存在一些轻度心理困扰，建议关注自我调节，保持规律作息。',
  moderate: '您可能存在中度心理困扰，建议寻求学校心理咨询中心的专业帮助。',
  severe: '您可能存在较严重的心理困扰，强烈建议尽快寻求专业心理健康服务。',
};

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight
function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// JSON response helper
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// Build analysis prompt
function buildAnalysisPrompt(
  scaleName: string,
  scores: Scores,
  questionsWithAnswers: QuestionWithAnswer[]
): string {
  // Format dimension scores
  let dimensionText = '';
  if (scores.factor_scores) {
    for (const [key, data] of Object.entries(scores.factor_scores)) {
      const name = data.name || key;
      const meanScore = data.mean_score ?? data.mean ?? 0;
      const aboveNorm = data.above_norm ?? false;
      const status = aboveNorm ? '偏高' : '正常';
      dimensionText += `- ${name}: ${meanScore.toFixed(2)} (${status})\n`;
    }
  }

  // Filter high score questions (>=3)
  let highScoreQuestions = '';
  for (const qa of questionsWithAnswers) {
    const answer = qa.answer ?? 0;
    if (answer >= 3) {
      const content = qa.content || '未知题目';
      highScoreQuestions += `- ${content} (回答: ${answer}分)\n`;
    }
  }

  if (!highScoreQuestions) {
    highScoreQuestions = '无明显高分题目，整体表现良好';
  }

  // Get severity
  const severity = SEVERITY_MAP[scores.severity || 'normal'] || '未知';

  // Format total score and mean
  const totalScore = scores.total_score ?? 0;
  const totalMean = scores.total_mean ?? scores.mean_score ?? 0;
  const totalMeanStr = typeof totalMean === 'number' ? totalMean.toFixed(2) : String(totalMean);

  return PSYCHOLOGICAL_ANALYSIS_PROMPT
    .replace('{scale_name}', scaleName)
    .replace('{total_score}', String(totalScore))
    .replace('{total_mean}', totalMeanStr)
    .replace('{severity_level}', severity)
    .replace('{dimension_scores}', dimensionText || '无维度数据')
    .replace('{high_score_questions}', highScoreQuestions);
}

// Generate fallback report when AI is unavailable
function generateFallbackReport(scaleName: string, scores: Scores): string {
  const severity = scores.severity || 'normal';
  const totalScore = scores.total_score ?? 'N/A';
  const totalMean = scores.total_mean ?? scores.mean_score ?? 0;
  const meanStr = typeof totalMean === 'number' ? totalMean.toFixed(2) : String(totalMean);

  let report = `## ${scaleName} 测评分析\n\n`;
  report += `**总分**: ${totalScore} | **均分**: ${meanStr}\n\n`;
  report += `### 总体评估\n${SEVERITY_DESCRIPTIONS[severity] || SEVERITY_DESCRIPTIONS.normal}\n\n`;

  // Add factor analysis if available
  if (scores.factor_scores && Object.keys(scores.factor_scores).length > 0) {
    report += '### 各维度情况\n';
    for (const [, data] of Object.entries(scores.factor_scores)) {
      const name = data.name;
      const aboveNorm = data.above_norm ?? false;
      if (aboveNorm) {
        report += `- **${name}**: 偏高，需要关注\n`;
      }
    }
  }

  report += '\n### 建议\n';
  report += '1. 保持规律的作息时间\n';
  report += '2. 适当进行体育锻炼\n';
  report += '3. 与朋友家人保持良好沟通\n';
  report += '4. 如有需要，可预约学校心理咨询服务\n\n';
  report += '*注：AI 分析服务暂时不可用，以上为基础评估结果。如需详细分析，请稍后重试。*';

  return report;
}

// Call OpenRouter API
async function callOpenRouterAPI(
  prompt: string,
  model: string,
  apiKey: string
): Promise<string | null> {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://psychological-assessment.pages.dev',
    'X-Title': 'Psychological Assessment Platform',
  };

  const payload: OpenRouterRequest = {
    model,
    messages: [
      {
        role: 'system',
        content: '你是一位专业的心理咨询师，擅长心理测评解读。请用中文回答，语言温和专业。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  };

  const response = await fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${await response.text()}`);
  }

  const result: OpenRouterResponse = await response.json();

  if (result.choices && result.choices.length > 0) {
    return result.choices[0].message.content;
  }

  if (result.error) {
    throw new Error(result.error.message);
  }

  return null;
}

// Call API with model fallback
async function callAPIWithFallback(prompt: string, apiKey: string): Promise<{ content: string; model: string }> {
  let lastError: Error | null = null;

  for (const model of MODELS) {
    try {
      const result = await callOpenRouterAPI(prompt, model, apiKey);
      if (result) {
        return { content: result, model };
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Model ${model} failed:`, lastError.message);
      continue;
    }
  }

  throw new Error(`All models failed. Last error: ${lastError?.message}`);
}

// Main report generation handler
async function handleGenerateReport(request: Request, env: Env): Promise<Response> {
  try {
    const body: ReportRequest = await request.json();

    // Validate required fields
    if (!body.scale_name) {
      return jsonResponse({ success: false, error: 'Missing required field: scale_name' }, 400);
    }

    if (!body.scores) {
      return jsonResponse({ success: false, error: 'Missing required field: scores' }, 400);
    }

    // Check if API key is configured
    if (!env.OPENROUTER_API_KEY) {
      console.warn('OpenRouter API Key not configured, using fallback report');
      const fallbackReport = generateFallbackReport(body.scale_name, body.scores);
      const response: ReportResponse = {
        success: true,
        report: fallbackReport,
        model_used: 'fallback',
      };
      return jsonResponse(response);
    }

    // Build prompt and call API
    const prompt = buildAnalysisPrompt(
      body.scale_name,
      body.scores,
      body.questions_with_answers || []
    );

    try {
      const { content, model } = await callAPIWithFallback(prompt, env.OPENROUTER_API_KEY);
      const response: ReportResponse = {
        success: true,
        report: content,
        model_used: model,
      };
      return jsonResponse(response);
    } catch (apiError) {
      console.error('API call failed, using fallback:', apiError);
      const fallbackReport = generateFallbackReport(body.scale_name, body.scores);
      const response: ReportResponse = {
        success: true,
        report: fallbackReport,
        model_used: 'fallback',
      };
      return jsonResponse(response);
    }
  } catch (error) {
    console.error('Report generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return jsonResponse({ success: false, error: message }, 500);
  }
}

// Health check handler
function handleHealth(): Response {
  return jsonResponse({
    status: 'healthy',
    service: 'ai-report-worker',
    timestamp: new Date().toISOString(),
    models_available: MODELS.length,
  });
}

// Main fetch handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    // Route requests
    if (path === '/health' || path === '/') {
      return handleHealth();
    }

    if (path === '/generate' && request.method === 'POST') {
      return handleGenerateReport(request, env);
    }

    // 404 for unknown routes
    return jsonResponse({ success: false, error: 'Not found' }, 404);
  },
};
