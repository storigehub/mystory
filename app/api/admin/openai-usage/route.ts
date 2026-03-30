import { NextRequest, NextResponse } from 'next/server';

function checkAuth(req: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return req.headers.get('x-admin-password') === adminPassword;
}

/**
 * GET /api/admin/openai-usage
 * OpenAI API 키 상태 확인 + 이번 달 사용량 조회
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    return NextResponse.json({
      status: 'no_key',
      model,
      maskedKey: null,
      usage: null,
    });
  }

  const maskedKey = `sk-...${apiKey.slice(-6)}`;

  // API 키 유효성 확인 (모델 목록 조회)
  let keyValid = false;
  try {
    const modelsRes = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    keyValid = modelsRes.ok;
  } catch {
    keyValid = false;
  }

  // 이번 달 사용량 조회 (dashboard billing API)
  let usage: { totalCost: number; currency: string; startDate: string; endDate: string } | null = null;
  try {
    const now = new Date();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const usageRes = await fetch(
      `https://api.openai.com/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (usageRes.ok) {
      const data = await usageRes.json();
      usage = {
        totalCost: (data.total_usage ?? 0) / 100, // cents → dollars
        currency: 'USD',
        startDate,
        endDate,
      };
    }
  } catch {
    // usage API may not be available for all key types
  }

  // 크레딧 잔액 조회
  let balance: { available: number; currency: string } | null = null;
  try {
    const subRes = await fetch('https://api.openai.com/dashboard/billing/subscription', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (subRes.ok) {
      const data = await subRes.json();
      if (data.hard_limit_usd !== undefined) {
        balance = {
          available: data.hard_limit_usd,
          currency: 'USD',
        };
      }
    }
  } catch {
    // ignore
  }

  return NextResponse.json({
    status: keyValid ? 'ok' : 'invalid',
    model,
    maskedKey,
    usage,
    balance,
  });
}
