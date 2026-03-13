import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
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

function loadSettings(): Settings {
  try {
    const filePath = join(process.cwd(), 'config', 'settings.json');
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return {
      stt: { mode: 'browser', whisperModel: 'whisper-1', language: 'ko', maxDurationSec: 120 },
      ui: { allowUserOverride: true, defaultFontScale: 'normal' },
    };
  }
}

/**
 * GET /api/settings
 * 공개 설정 조회 (API 키 제외)
 */
export async function GET() {
  const s = loadSettings();
  return NextResponse.json({
    stt: {
      mode: s.stt.mode,
      whisperModel: s.stt.whisperModel,
      language: s.stt.language,
      maxDurationSec: s.stt.maxDurationSec,
    },
    ui: s.ui,
  });
}
