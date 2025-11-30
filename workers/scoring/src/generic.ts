/**
 * Generic Scorer
 * 通用量表评分器
 *
 * 支持:
 * - 反向计分
 * - 加权求和/平均
 * - 维度分数
 * - 解释配置
 */

import type {
  Question,
  ScaleConfig,
  InterpretationConfig,
  DimensionConfig,
  GenericScoreResult,
  DimensionScore,
  SeverityInfo,
} from './types';

/**
 * 根据 interpretation_config 自动判定严重程度和生成建议
 */
function applyInterpretation(
  score: number,
  interpretationConfig?: InterpretationConfig
): SeverityInfo | undefined {
  if (!interpretationConfig || !interpretationConfig.levels) {
    // 如果没有配置，返回默认的简单判定
    if (score < 10) {
      return {
        level: 'normal',
        description: '评分结果在正常范围内',
        suggestions: ['保持健康的生活方式', '继续关注心理健康'],
      };
    } else {
      return {
        level: 'mild',
        description: '可能存在一些心理困扰',
        suggestions: ['建议适当调整', '必要时寻求专业帮助'],
      };
    }
  }

  // 遍历 levels，找到匹配的区间
  const levels = interpretationConfig.levels;
  for (const level of levels) {
    const rangeMin = level.range_min ?? 0;
    const rangeMax = level.range_max ?? Infinity;

    if (rangeMin <= score && score <= rangeMax) {
      return {
        level: level.level,
        description: level.description || '',
        suggestions: level.suggestions || [],
      };
    }
  }

  // 如果没有匹配的区间，返回最后一个级别
  if (levels.length > 0) {
    const lastLevel = levels[levels.length - 1];
    return {
      level: lastLevel.level || 'severe',
      description: lastLevel.description || '评分超出预期范围',
      suggestions: lastLevel.suggestions || ['建议寻求专业帮助'],
    };
  }

  return undefined;
}

/**
 * 计算各维度得分
 */
function calculateDimensionScores(
  answers: Record<string, number>,
  questions: Record<string, Question>,
  dimensionConfig?: DimensionConfig[]
): Record<string, DimensionScore> {
  if (!questions) {
    return {};
  }

  const dimensionScores: Record<string, DimensionScore> = {};

  // 方式1: 如果有 dimension_config，按配置计算
  if (dimensionConfig && dimensionConfig.length > 0) {
    for (const dimConfig of dimensionConfig) {
      const dimName = dimConfig.name || 'Unknown';
      const dimQuestions = dimConfig.questions || [];
      const dimDescription = dimConfig.description || '';

      // 收集该维度的分数
      const dimAnswers: number[] = [];
      for (const [qId, answer] of Object.entries(answers)) {
        const question = questions[qId];
        // 匹配 order_num 或直接匹配 q_id
        if (
          (question?.order_num !== undefined && dimQuestions.includes(question.order_num)) ||
          dimQuestions.includes(parseInt(qId, 10))
        ) {
          dimAnswers.push(answer);
        }
      }

      if (dimAnswers.length > 0) {
        const dimTotal = dimAnswers.reduce((a, b) => a + b, 0);
        const dimMean = dimTotal / dimAnswers.length;
        dimensionScores[dimName] = {
          total: Math.round(dimTotal * 100) / 100,
          mean: Math.round(dimMean * 100) / 100,
          question_count: dimAnswers.length,
          description: dimDescription,
        };
      }
    }
  } else {
    // 方式2: 按题目的 dimension 字段分组
    const dimensionGroups: Record<string, number[]> = {};

    for (const [qId, answer] of Object.entries(answers)) {
      const question = questions[qId];
      const dimension = question?.dimension || question?.subdomain || question?.domain;

      if (dimension) {
        if (!dimensionGroups[dimension]) {
          dimensionGroups[dimension] = [];
        }
        dimensionGroups[dimension].push(answer);
      }
    }

    // 计算每个维度的统计信息
    for (const [dimName, dimAnswers] of Object.entries(dimensionGroups)) {
      if (dimAnswers.length > 0) {
        const dimTotal = dimAnswers.reduce((a, b) => a + b, 0);
        const dimMean = dimTotal / dimAnswers.length;
        dimensionScores[dimName] = {
          total: Math.round(dimTotal * 100) / 100,
          mean: Math.round(dimMean * 100) / 100,
          question_count: dimAnswers.length,
        };
      }
    }
  }

  return dimensionScores;
}

/**
 * 计算通用量表评分
 */
export function calculateGenericScore(
  answers: Record<string, number>,
  scaleConfig: ScaleConfig,
  questions?: Record<string, Question>,
  interpretationConfig?: InterpretationConfig,
  dimensionConfig?: DimensionConfig[]
): GenericScoreResult {
  const questionCount = Object.keys(answers).length;
  let totalScore: number;
  let finalScore: number;
  let usedReverseScoring = false;

  // 如果没有提供questions信息，使用简单求和
  if (!questions) {
    totalScore = Object.values(answers).reduce((a, b) => a + b, 0);
    finalScore = totalScore;
  } else {
    // 步骤1: 处理反向计分
    const adjustedAnswers: Record<string, number> = {};

    for (const [qId, answer] of Object.entries(answers)) {
      const question = questions[qId];

      if (question?.reverse_scored) {
        usedReverseScoring = true;
        // 从options中获取最大分值
        const options = question.options || [];
        if (options.length > 0) {
          const maxScore = Math.max(...options.map((opt) => opt.value));
          // 反向转换: max_score + 1 - answer
          adjustedAnswers[qId] = maxScore - answer + 1;
        } else {
          // 如果没有options，默认5点量表
          adjustedAnswers[qId] = 6 - answer;
        }
      } else {
        adjustedAnswers[qId] = answer;
      }
    }

    // 步骤2: 应用权重
    const weightedScores: Record<string, number> = {};
    let totalWeight = 0;

    for (const [qId, score] of Object.entries(adjustedAnswers)) {
      const question = questions[qId];
      const weight = question?.weight ?? 1.0;

      weightedScores[qId] = score * weight;
      totalWeight += weight;
    }

    // 步骤3: 计算总分
    totalScore = Object.values(weightedScores).reduce((a, b) => a + b, 0);

    // 步骤4: 根据评分方法计算最终分数
    const scoringMethod = scaleConfig.method || 'sum';

    if (scoringMethod === 'sum') {
      finalScore = totalScore;
    } else if (scoringMethod === 'average') {
      // 加权平均 = 总分 / 总权重
      finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    } else if (scoringMethod === 'weighted') {
      // 加权求和（已应用权重）
      finalScore = totalScore;
    } else {
      finalScore = totalScore;
    }
  }

  // 计算平均分
  const meanScore = questionCount > 0 ? totalScore / questionCount : 0;

  // 步骤5: 计算维度得分
  let dimensionScores: Record<string, DimensionScore> = {};
  if (questions) {
    const hasQuestionsWithDimension = Object.values(questions).some((q) => q.dimension);
    if (dimensionConfig || hasQuestionsWithDimension) {
      dimensionScores = calculateDimensionScores(answers, questions, dimensionConfig);
    }
  }

  // 步骤6: 判定严重程度
  const severityInfo = applyInterpretation(finalScore, interpretationConfig);

  // 返回统一格式
  return {
    // 基础分数
    total_score: Math.round(totalScore * 100) / 100,
    final_score: Math.round(finalScore * 100) / 100,
    mean_score: Math.round(meanScore * 100) / 100,
    question_count: questionCount,

    // 兼容旧字段名
    average_score: Math.round(meanScore * 100) / 100,
    total_mean: Math.round(meanScore * 100) / 100,

    // 严重程度信息
    severity: severityInfo?.level,
    severity_info: severityInfo,

    // 维度得分
    dimension_scores: dimensionScores,

    // 元信息
    scoring_method: scaleConfig.method || 'sum',
    used_weights: questions !== undefined,
    used_reverse_scoring: usedReverseScoring,
  };
}
