import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface Settings {
  stt: {
    mode: 'browser' | 'whisper' | 'off';
    whisperApiKey?: string;
    whisperModel: string;
    language: string;
    maxDurationSec: number;
  };
  ui: {
    allowUserOverride: boolean;
    defaultFontScale: 'normal' | 'large';
  };
}

const SETTINGS_PATH = join(process.cwd(), 'config', 'settings.json');

function loadSettings(): Settings {
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch {
    return {
      stt: { mode: 'browser', whisperModel: 'whisper-1', language: 'ko', maxDurationSec: 120 },
      ui: { allowUserOverride: true, defaultFontScale: 'normal' },
    };
  }
}

function saveSettings(s: Settings) {
  writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2), 'utf-8');
}

function maskKey(key?: string): string {
  if (!key || key.length < 8) return '****';
  return key.slice(0, 7) + '****' + key.slice(-4);
}

function checkAuth(req: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false; // require env var

  const auth = req.headers.get('x-admin-password');
  return auth === adminPassword;
}

/**
 * GET /api/admin/settings
 * 관리자 설정 전체 조회 (API 키는 마스킹)
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const s = loadSettings();
  return NextResponse.json({
    stt: {
      mode: s.stt.mode,
      whisperApiKey: maskKey(s.stt.whisperApiKey),
      whisperModel: s.stt.whisperModel,
      language: s.stt.language,
      maxDurationSec: s.stt.maxDurationSec,
    },
    ui: s.ui,
  });
}

/**
 * POST /api/admin/settings
 * 관리자 설정 변경
 * Body: partial Settings (whisperApiKey 빈 문자열이면 기존 유지)
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const body = await req.json();
  const current = loadSettings();
  const updated: string[] = [];

  if (body.stt) {
    if (body.stt.mode !== undefined) {
      current.stt.mode = body.stt.mode;
      updated.push('stt.mode');
    }
    // Only update API key if a non-empty value is provided
    if (body.stt.whisperApiKey && body.stt.whisperApiKey !== maskKey(current.stt.whisperApiKey)) {
      current.stt.whisperApiKey = body.stt.whisperApiKey;
      updated.push('stt.whisperApiKey');
    }
    if (body.stt.whisperModel !== undefined) {
      current.stt.whisperModel = body.stt.whisperModel;
      updated.push('stt.whisperModel');
    }
    if (body.stt.language !== undefined) {
      current.stt.language = body.stt.language;
      updated.push('stt.language');
    }
    if (body.stt.maxDurationSec !== undefined) {
      current.stt.maxDurationSec = body.stt.maxDurationSec;
      updated.push('stt.maxDurationSec');
    }
  }

  if (body.ui) {
    if (body.ui.allowUserOverride !== undefined) {
      current.ui.allowUserOverride = body.ui.allowUserOverride;
      updated.push('ui.allowUserOverride');
    }
    if (body.ui.defaultFontScale !== undefined) {
      current.ui.defaultFontScale = body.ui.defaultFontScale;
      updated.push('ui.defaultFontScale');
    }
  }

  try {
    saveSettings(current);
  } catch {
    return NextResponse.json({ error: '설정 저장 실패' }, { status: 500 });
  }

  return NextResponse.json({ success: true, updated });
}
