'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ============================================================
// useWhisperSTT — MediaRecorder + Whisper API 음성인식 훅
// sttMode === 'whisper' 일 때 사용
// ============================================================

interface UseWhisperSTTResult {
  isRecording: boolean;
  isTranscribing: boolean;
  error: string | null;
  toggleRecording: () => void;
}

/**
 * @param enabled        state.sttMode === 'whisper' 일 때 true
 * @param onTranscribed  전사 완료 시 호출되는 콜백 (text: string) => void
 * @param maxDurationSec 최대 녹음 시간(초). 초과 시 자동 중지. 기본값 120
 */
export function useWhisperSTT(
  enabled: boolean,
  onTranscribed: (text: string) => void,
  maxDurationSec = 120
): UseWhisperSTTResult {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 콜백을 ref로 보관해 stale closure 방지
  const onTranscribedRef = useRef(onTranscribed);
  useEffect(() => {
    onTranscribedRef.current = onTranscribed;
  }, [onTranscribed]);

  const startRecording = useCallback(async () => {
    if (!enabled || isRecording) return;
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      // 브라우저가 지원하는 mimeType 선택
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mr = new MediaRecorder(stream, { mimeType });

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        // 마이크 스트림 해제
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const chunks = audioChunksRef.current;
        if (!chunks.length) return;

        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const audioBlob = new Blob(chunks, { type: mimeType });
        const audioFile = new File([audioBlob], `recording.${ext}`, { type: mimeType });

        setIsTranscribing(true);
        try {
          const fd = new FormData();
          fd.append('audio', audioFile);

          const res = await fetch('/api/ai/whisper/transcribe', {
            method: 'POST',
            body: fd,
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
          }

          const data = await res.json();
          if (data.text?.trim()) {
            onTranscribedRef.current(data.text.trim());
          }
        } catch (err: any) {
          console.error('Whisper 전사 실패:', err);
          setError(err.message || '음성 전사에 실패했습니다.');
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = mr;
      mr.start(1000); // 1초마다 청크 수집
      setIsRecording(true);

      // 최대 녹음 시간 초과 시 자동 중지
      if (maxDurationSec > 0) {
        maxDurationTimerRef.current = setTimeout(() => {
          if (mediaRecorderRef.current?.state === 'recording') {
            try { mediaRecorderRef.current.stop(); } catch {}
            setIsRecording(false);
          }
        }, maxDurationSec * 1000);
      }
    } catch (err: any) {
      console.error('마이크 접근 실패:', err);
      setError('마이크 접근이 거부되었습니다. 브라우저 설정을 확인해주세요.');
    }
  }, [enabled, isRecording]);

  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) return;
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
    try {
      mediaRecorderRef.current.stop();
    } catch {}
    setIsRecording(false);
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
      try { mediaRecorderRef.current?.stop(); } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { isRecording, isTranscribing, error, toggleRecording };
}
