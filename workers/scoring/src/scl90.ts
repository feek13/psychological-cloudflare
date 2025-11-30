/**
 * SCL-90 Scorer
 * SCL-90量表评分器
 *
 * SCL-90包含90道题目，分为9个因子：
 * 1. 躯体化 (Somatization): 1-12
 * 2. 强迫症状 (Obsessive-Compulsive): 13-22
 * 3. 人际关系敏感 (Interpersonal Sensitivity): 23-31
 * 4. 抑郁 (Depression): 32-44
 * 5. 焦虑 (Anxiety): 45-54
 * 6. 敌对 (Hostility): 55-60
 * 7. 恐怖 (Phobic Anxiety): 61-67
 * 8. 偏执 (Paranoid Ideation): 68-73
 * 9. 精神病性 (Psychoticism): 74-83
 * 其他项目: 84-90
 */

import type { FactorScore, SCL90Result, Question } from './types';

// 因子维度定义
const FACTORS: Record<string, {
  name: string;
  name_en: string;
  questions: number[];
  description: string;
}> = {
  somatization: {
    name: '躯体化',
    name_en: 'Somatization',
    questions: Array.from({ length: 12 }, (_, i) => i + 1),
    description: '反映身体不适感，包括心血管、胃肠道、呼吸系统等方面的主诉',
  },
  obsessive_compulsive: {
    name: '强迫症状',
    name_en: 'Obsessive-Compulsive',
    questions: Array.from({ length: 10 }, (_, i) => i + 13),
    description: '反映临床上强迫症状群，包括思维、行为和体验等方面',
  },
  interpersonal_sensitivity: {
    name: '人际关系敏感',
    name_en: 'Interpersonal Sensitivity',
    questions: Array.from({ length: 9 }, (_, i) => i + 23),
    description: '反映个体在人际交往中的不自在感和自卑感',
  },
  depression: {
    name: '抑郁',
    name_en: 'Depression',
    questions: Array.from({ length: 13 }, (_, i) => i + 32),
    description: '反映抑郁的症状群，包括生活兴趣减退、动力缺乏、活力丧失等',
  },
  anxiety: {
    name: '焦虑',
    name_en: 'Anxiety',
    questions: Array.from({ length: 10 }, (_, i) => i + 45),
    description: '反映焦虑的情绪体验，包括紧张、不安、神经过敏等',
  },
  hostility: {
    name: '敌对',
    name_en: 'Hostility',
    questions: Array.from({ length: 6 }, (_, i) => i + 55),
    description: '反映敌对思想、感情和行为，包括厌烦、争论、摔物等',
  },
  phobic_anxiety: {
    name: '恐怖',
    name_en: 'Phobic Anxiety',
    questions: Array.from({ length: 7 }, (_, i) => i + 61),
    description: '反映对特定场所、人群或物体的恐惧',
  },
  paranoid_ideation: {
    name: '偏执',
    name_en: 'Paranoid Ideation',
    questions: Array.from({ length: 6 }, (_, i) => i + 68),
    description: '反映投射思维、敌对、猜疑、被动体验和夸大',
  },
  psychoticism: {
    name: '精神病性',
    name_en: 'Psychoticism',
    questions: Array.from({ length: 10 }, (_, i) => i + 74),
    description: '反映思维、情感和行为的精神病性表现',
  },
  additional: {
    name: '其他',
    name_en: 'Additional Items',
    questions: Array.from({ length: 7 }, (_, i) => i + 84),
    description: '包括睡眠、饮食、死亡念头等其他症状',
  },
};

// 常模标准（中国常模）
const NORM_MEAN = 1.44;
const NORM_SD = 0.43;

// 因子分常模均值
const FACTOR_NORMS: Record<string, number> = {
  somatization: 1.37,
  obsessive_compulsive: 1.62,
  interpersonal_sensitivity: 1.65,
  depression: 1.50,
  anxiety: 1.39,
  hostility: 1.48,
  phobic_anxiety: 1.23,
  paranoid_ideation: 1.43,
  psychoticism: 1.29,
  additional: 1.40,
};

// 严重程度描述
const SEVERITY_DESCRIPTIONS: Record<string, string> = {
  normal: '心理状态良好，各项指标在正常范围内',
  mild: '存在一些轻度的心理困扰，建议适当调整',
  moderate: '存在中度的心理困扰，建议寻求专业帮助',
  severe: '存在较严重的心理困扰，强烈建议寻求专业帮助',
};

/**
 * 评估严重程度
 */
function assessSeverity(totalMean: number): string {
  if (totalMean < 1.5) {
    return 'normal';
  } else if (totalMean < 2.0) {
    return 'mild';
  } else if (totalMean < 3.0) {
    return 'moderate';
  } else {
    return 'severe';
  }
}

/**
 * 生成建议
 */
function generateRecommendations(
  severity: string,
  factorScores: Record<string, FactorScore>
): string[] {
  const recommendations: string[] = [];

  const severityRecommendations: Record<string, string[]> = {
    normal: [
      '您的测评结果显示心理状态良好',
      '建议保持健康的生活方式和积极的心态',
      '继续关注自己的心理健康',
    ],
    mild: [
      '测评显示您可能存在一些轻度的心理困扰',
      '建议进行适当的心理调适，如运动、冥想等',
      '如果症状持续，建议咨询心理健康专业人员',
    ],
    moderate: [
      '测评显示您可能存在中度的心理困扰',
      '强烈建议寻求专业心理咨询或心理治疗',
      '注意调整生活节奏，保证充足睡眠和休息',
    ],
    severe: [
      '测评显示您可能存在较严重的心理困扰',
      '强烈建议立即寻求专业心理健康服务',
      '必要时可以考虑精神科就诊',
      '请不要独自面对，及时寻求家人和朋友的支持',
    ],
  };

  recommendations.push(...(severityRecommendations[severity] || []));

  // 基于突出因子的建议
  const highFactors: string[] = [];
  for (const [, factorData] of Object.entries(factorScores)) {
    if (factorData.above_norm && factorData.mean_score >= 2.0) {
      highFactors.push(factorData.name);
    }
  }

  if (highFactors.length > 0) {
    recommendations.push(`特别关注以下方面: ${highFactors.join(', ')}`);
  }

  return recommendations;
}

/**
 * 计算SCL-90评分
 */
export function calculateSCL90Scores(
  answers: Record<number, number>,
  questions?: Record<string, Question>
): SCL90Result {
  // 验证答案完整性
  const answerCount = Object.keys(answers).length;
  if (answerCount !== 90) {
    throw new Error(`SCL-90需要90道题目的答案，当前只有${answerCount}道`);
  }

  // 验证答案范围
  for (const [qNum, score] of Object.entries(answers)) {
    if (score < 1 || score > 5) {
      throw new Error(`题目${qNum}的分数${score}不在1-5范围内`);
    }
  }

  // 处理反向计分
  const adjustedAnswers: Record<number, number> = {};
  if (questions) {
    for (const [qNumStr, answer] of Object.entries(answers)) {
      const qNum = parseInt(qNumStr, 10);
      let questionInfo: Question | undefined;

      // 查找对应的题目信息
      for (const qData of Object.values(questions)) {
        if (qData.order_num === qNum) {
          questionInfo = qData;
          break;
        }
      }

      if (questionInfo?.reverse_scored) {
        // SCL-90是5点量表，反向转换
        adjustedAnswers[qNum] = 6 - answer;
      } else {
        adjustedAnswers[qNum] = answer;
      }
    }
  } else {
    // 如果没有提供questions信息，使用原始答案
    for (const [qNumStr, answer] of Object.entries(answers)) {
      adjustedAnswers[parseInt(qNumStr, 10)] = answer;
    }
  }

  // 计算总分和总均分
  const totalScore = Object.values(adjustedAnswers).reduce((a, b) => a + b, 0);
  const totalMean = totalScore / 90;

  // 计算阳性项目
  const positiveItems = Object.values(adjustedAnswers).filter((score) => score >= 2);
  const positiveCount = positiveItems.length;
  const positiveMean = positiveCount > 0
    ? positiveItems.reduce((a, b) => a + b, 0) / positiveCount
    : 0;

  // 计算各因子分数
  const factorScores: Record<string, FactorScore> = {};
  const dimensionScores: Record<string, number> = {};

  for (const [factorKey, factorInfo] of Object.entries(FACTORS)) {
    const factorQuestions = factorInfo.questions;
    const factorTotal = factorQuestions.reduce(
      (sum, q) => sum + (adjustedAnswers[q] || 0),
      0
    );
    const factorMean = factorTotal / factorQuestions.length;
    const normMean = FACTOR_NORMS[factorKey] || NORM_MEAN;

    factorScores[factorKey] = {
      name: factorInfo.name,
      name_en: factorInfo.name_en,
      description: factorInfo.description,
      total_score: factorTotal,
      mean_score: Math.round(factorMean * 100) / 100,
      question_count: factorQuestions.length,
      norm_mean: normMean,
      above_norm: factorMean > normMean,
    };

    dimensionScores[factorKey] = Math.round(factorMean * 100) / 100;
  }

  // 判断严重程度
  const severity = assessSeverity(totalMean);

  // 生成建议
  const recommendations = generateRecommendations(severity, factorScores);

  // 创建 severity_info 对象
  const severityInfo = {
    level: severity,
    description: SEVERITY_DESCRIPTIONS[severity] || '',
    suggestions: recommendations,
  };

  return {
    // 基础分数
    total_score: totalScore,
    mean_score: Math.round(totalMean * 100) / 100,
    total_mean: Math.round(totalMean * 100) / 100,
    question_count: 90,

    // SCL-90 特有字段
    positive_item_count: positiveCount,
    positive_symptom_mean: Math.round(positiveMean * 100) / 100,
    factor_scores: factorScores,

    // 严重程度信息
    severity,
    severity_info: severityInfo,

    // 维度得分
    dimension_scores: dimensionScores,

    // 常模对比
    norm_comparison: {
      national_norm_mean: NORM_MEAN,
      national_norm_sd: NORM_SD,
      above_norm: totalMean > NORM_MEAN,
      z_score: Math.round(((totalMean - NORM_MEAN) / NORM_SD) * 100) / 100,
    },

    // 建议
    recommendations,
  };
}
