/**
 * Scoring Worker
 * Cloudflare Worker for psychological assessment scoring
 *
 * Endpoints:
 * POST /score - Calculate scores for an assessment
 */

import { calculateSCL90Scores } from './scl90';
import { calculateGenericScore } from './generic';
import type { ScoringRequest, ScoringResponse } from './types';

export interface Env {
  // Add environment bindings here if needed
}

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

// Error response helper
function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ success: false, error: message }, status);
}

// Main scoring handler
async function handleScore(request: Request): Promise<Response> {
  try {
    const body: ScoringRequest = await request.json();

    // Validate required fields
    if (!body.scale_code) {
      return errorResponse('Missing required field: scale_code');
    }

    if (!body.answers || Object.keys(body.answers).length === 0) {
      return errorResponse('Missing required field: answers');
    }

    let result;
    const scaleCode = body.scale_code.toUpperCase();

    // Route to appropriate scorer
    if (scaleCode === 'SCL-90' || scaleCode === 'SCL90') {
      // Convert string keys to number keys for SCL-90
      const numericAnswers: Record<number, number> = {};
      for (const [key, value] of Object.entries(body.answers)) {
        numericAnswers[parseInt(key, 10)] = value;
      }

      result = calculateSCL90Scores(numericAnswers, body.questions);
    } else {
      // Use generic scorer for all other scales
      const scaleConfig = body.scale_config || { method: 'sum' };

      result = calculateGenericScore(
        body.answers,
        scaleConfig,
        body.questions,
        body.interpretation_config,
        body.dimension_config
      );
    }

    // Return scores field to match frontend expected format
    return jsonResponse({
      success: true,
      scores: result,
    });
  } catch (error) {
    console.error('Scoring error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return errorResponse(message, 500);
  }
}

// Health check handler
function handleHealth(): Response {
  return jsonResponse({
    status: 'healthy',
    service: 'scoring-worker',
    timestamp: new Date().toISOString(),
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

    if (path === '/score' && request.method === 'POST') {
      return handleScore(request);
    }

    // 404 for unknown routes
    return errorResponse('Not found', 404);
  },
};
