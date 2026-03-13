// ============================================================
// Whisper STT API — 음성을 한글 텍스트로 전사
// POST /api/ai/whisper/transcribe
//
// 클라이언트에서 녹음한 음성(webm/wav/mp3)을 받아
// OpenAI Whisper API로 한국어 전사 후 반환
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

interface TranscribeResponse {
  /** 전사된 텍스트 */
  text: string;
  /** 전사에 걸린 시간(ms) */
  duration: number;
  /** 언어 감지 결과 */
  language: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // multipart/form-data로 음성 파일 수신
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'audio 파일이 필요합니다.' },
        { status: 400 }
      );
    }

    // 파일 크기 제한 (25MB — Whisper API 제한)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: '음성 파일이 너무 큽니다. (최대 25MB)' },
        { status: 413 }
      );
    }

    // OpenAI Whisper API 호출
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile, audioFile.name || 'recording.webm');
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', 'ko'); // 한국어 강제 지정
    whisperFormData.append('response_format', 'verbose_json');
    whisperFormData.append(
      'prompt',
      '이것은 한국인 어르신의 자서전 인터뷰 녹음입니다. ' +
        '자연스러운 구어체 한국어로 전사해주세요. ' +
        '고유명사, 지명, 인명은 정확하게 표기해주세요.'
    );

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      const errorData = await whisperResponse.text();
      console.error('Whisper API error:', errorData);
      return NextResponse.json(
        { error: '음성 전사에 실패했습니다.', detail: errorData },
        { status: 502 }
      );
    }

    const whisperData = await whisperResponse.json();
    const duration = Date.now() - startTime;

    const response: TranscribeResponse = {
      text: whisperData.text || '',
      duration,
      language: whisperData.language || 'ko',
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Whisper transcribe error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', detail: error.message },
      { status: 500 }
    );
  }
}

// ── GET 핸들러: 상태 확인용 ──

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'whisper-stt',
    supportedFormats: ['webm', 'wav', 'mp3', 'mp4', 'm4a', 'ogg', 'flac'],
    maxFileSize: '25MB',
    language: 'ko',
  });
}
