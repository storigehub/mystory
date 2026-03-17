'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useBook, Chapter } from '@/lib/book-context';
import { TOKENS, FONT_SIZE_PRESETS } from '@/lib/design-tokens';
import { getHint } from '@/lib/interview-questions';
import { useWhisperSTT } from '@/lib/use-whisper-stt';

const uid = () => Math.random().toString(36).slice(2, 10);

/* ─────────────────────────────────────────
   블록 타입 — 텍스트 | 사진
   prose 직렬화: 텍스트 사이에 [PHOTO:id] 마커
───────────────────────────────────────── */
type TextBlock = { type: 'text'; bid: string; content: string };
type PhotoBlock = { type: 'photo'; bid: string; photoId: string };
type EditorBlock = TextBlock | PhotoBlock;

const PHOTO_SPLIT = /(\[PHOTO:[a-z0-9]+\])/;
const PHOTO_MATCH = /\[PHOTO:([a-z0-9]+)\]/;

function proseToBlocks(prose: string): EditorBlock[] {
  if (!prose) return [{ type: 'text', bid: 'tb-0', content: '' }];
  const parts = prose.split(PHOTO_SPLIT);
  const blocks: EditorBlock[] = [];
  let tc = 0;
  for (const part of parts) {
    const m = part.match(PHOTO_MATCH);
    if (m) {
      blocks.push({ type: 'photo', bid: `pb-${m[1]}`, photoId: m[1] });
    } else {
      blocks.push({ type: 'text', bid: `tb-${tc++}`, content: part });
    }
  }
  if (blocks[0]?.type !== 'text') blocks.unshift({ type: 'text', bid: 'tb-s', content: '' });
  if (blocks[blocks.length - 1]?.type !== 'text') blocks.push({ type: 'text', bid: 'tb-e', content: '' });
  return blocks;
}

function blocksToProse(blocks: EditorBlock[]): string {
  return blocks.map((b) => (b.type === 'text' ? b.content : `[PHOTO:${b.photoId}]`)).join('');
}

function totalCharCount(blocks: EditorBlock[]): number {
  return blocks
    .filter((b): b is TextBlock => b.type === 'text')
    .reduce((s, b) => s + b.content.length, 0);
}

/* ─── 아이콘 ─── */
function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 10a7 7 0 0014 0M12 18v4m-3 0h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function PhotoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

interface NormalEditorProps {
  chapter: Chapter;
  chapterIdx: number;
}

export default function NormalEditor({ chapter, chapterIdx }: NormalEditorProps) {
  const { state, setProse, addPhoto, removePhoto, updatePhotoCaption, setPhotoFeatured } = useBook();
  const [showGuide, setShowGuide] = useState(!chapter.prose?.length);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  /* ── 블록 상태 ── chapter.id 바뀔 때만 재파싱 */
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => proseToBlocks(chapter.prose || ''));
  useEffect(() => {
    setBlocks(proseToBlocks(chapter.prose || ''));
    setShowGuide(!chapter.prose?.length);
    activeBidRef.current = 'tb-0';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.id]);

  const fileRef = useRef<HTMLInputElement>(null);
  const chapterIdxRef = useRef(chapterIdx);
  const activeBidRef = useRef<string>(blocks[0]?.bid ?? 'tb-0');
  const recognitionRef = useRef<any>(null);
  const prevTranscriptRef = useRef('');
  const taRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const fontPreset = FONT_SIZE_PRESETS[state.fontSize];
  const hint = getHint(chapter.tid);

  useEffect(() => { chapterIdxRef.current = chapterIdx; }, [chapterIdx]);

  /* ── textarea auto-grow ── */
  const growTA = (bid: string) => {
    const ta = taRefs.current[bid];
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.max(120, ta.scrollHeight) + 'px';
  };

  /* ── 텍스트 블록 업데이트 ── */
  const updateTextBlock = useCallback((bid: string, content: string) => {
    setBlocks((prev) => {
      const next = prev.map((b) => (b.bid === bid && b.type === 'text' ? { ...b, content } : b));
      setProse(chapterIdxRef.current, blocksToProse(next));
      return next;
    });
    setShowGuide(false);
  }, [setProse]);

  /* ── 사진 삽입: 특정 텍스트 블록 뒤에 ── */
  const insertPhotoAfterBlock = useCallback((bid: string, photoId: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.bid === bid);
      const at = idx === -1 ? prev.length - 1 : idx;
      const newBlocks = [...prev];
      newBlocks.splice(at + 1, 0,
        { type: 'photo', bid: `pb-${photoId}`, photoId } as PhotoBlock,
        { type: 'text', bid: `tb-${uid()}`, content: '' } as TextBlock,
      );
      setProse(chapterIdxRef.current, blocksToProse(newBlocks));
      return newBlocks;
    });
  }, [setProse]);

  /* ── 사진 블록 삭제 ── */
  const removePhotoBlock = useCallback((photoBid: string, photoId: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.bid === photoBid);
      if (idx === -1) return prev;
      const nb = [...prev];
      const prevB = nb[idx - 1];
      const nextB = nb[idx + 1];
      if (prevB?.type === 'text' && nextB?.type === 'text') {
        nb.splice(idx - 1, 3, { type: 'text', bid: prevB.bid, content: prevB.content + nextB.content } as TextBlock);
      } else {
        nb.splice(idx, 1);
      }
      removePhoto(chapterIdxRef.current, photoId);
      setProse(chapterIdxRef.current, blocksToProse(nb));
      return nb;
    });
  }, [removePhoto, setProse]);

  /* ── 파일 선택 → Cloudinary 업로드 ── */
  const [isUploading, setIsUploading] = useState(false);

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/photo', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || '업로드 실패');

      const photoId = uid();
      addPhoto(chapterIdxRef.current, { id: photoId, data: json.url, caption: '' });
      insertPhotoAfterBlock(activeBidRef.current, photoId);
    } catch (err) {
      console.error('Photo upload failed:', err);
      alert('사진 업로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddPhoto = (bid: string) => {
    activeBidRef.current = bid;
    fileRef.current?.click();
  };

  /* ── Whisper STT → 활성 블록에 텍스트 추가 ── */
  const onWhisperTranscribed = useCallback((text: string) => {
    const bid = activeBidRef.current;
    setBlocks((prev) => {
      const next = prev.map((b) => {
        if (b.bid !== bid || b.type !== 'text') return b;
        const sep = b.content && !b.content.endsWith('\n') ? '\n\n' : '';
        return { ...b, content: b.content + sep + text };
      });
      setProse(chapterIdxRef.current, blocksToProse(next));
      return next;
    });
    setShowGuide(false);
    setTimeout(() => growTA(bid), 50);
  }, [setProse]);

  const whisper = useWhisperSTT(state.sttMode === 'whisper', onWhisperTranscribed);
  const isVoiceActive = isListening || whisper.isRecording || whisper.isTranscribing;

  /* ── Browser STT 초기화 ── */
  useEffect(() => {
    if (state.sttMode !== 'browser') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = 'ko-KR'; r.continuous = true; r.interimResults = true;
    r.onresult = (e: any) => {
      let fin = '', intr = '';
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        e.results[i].isFinal ? (fin += t) : (intr += t);
      }
      setTranscript(fin + intr);
    };
    r.onerror = (e: any) => { if (e.error !== 'aborted') console.warn('STT:', e.error); setIsListening(false); };
    r.onend = () => setIsListening(false);
    recognitionRef.current = r;
    return () => { try { r.abort(); } catch {} };
  }, [state.sttMode]);

  /* Browser STT → 활성 블록에 추가 */
  useEffect(() => {
    if (!isListening && transcript && transcript !== prevTranscriptRef.current) {
      const text = transcript.trim();
      if (text) {
        const bid = activeBidRef.current;
        setBlocks((prev) => {
          const next = prev.map((b) => {
            if (b.bid !== bid || b.type !== 'text') return b;
            const sep = b.content && !b.content.endsWith('\n') ? '\n\n' : '';
            return { ...b, content: b.content + sep + text };
          });
          setProse(chapterIdxRef.current, blocksToProse(next));
          return next;
        });
        setShowGuide(false);
        setTimeout(() => growTA(bid), 50);
      }
      prevTranscriptRef.current = transcript;
    }
  }, [isListening, transcript, setProse]);

  const toggleVoice = () => {
    if (state.sttMode === 'browser') {
      if (!recognitionRef.current) return;
      if (isListening) {
        try { recognitionRef.current.stop(); } catch {} setIsListening(false);
      } else {
        setTranscript(''); prevTranscriptRef.current = '';
        try { recognitionRef.current.start(); setIsListening(true); } catch {}
      }
    } else if (state.sttMode === 'whisper') {
      whisper.toggleRecording();
    }
  };

  const charCount = totalCharCount(blocks);
  const micLabel = whisper.isTranscribing ? '전사 중...' : isVoiceActive ? '중지' : '녹음';

  const toolBtn = (active?: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '8px 14px',
    border: `1px solid ${active ? '#FECACA' : TOKENS.border}`,
    borderRadius: TOKENS.radiusSm,
    background: active ? '#FEF2F2' : TOKENS.card,
    cursor: active && whisper.isTranscribing ? 'wait' : 'pointer',
    fontSize: 13, fontFamily: TOKENS.sans,
    color: active ? '#991B1B' : TOKENS.subtext,
    minHeight: 40,
  });

  const photoAddBtn: React.CSSProperties = {
    background: 'none',
    border: `1px dashed ${TOKENS.border}`,
    borderRadius: TOKENS.radiusSm,
    padding: '7px 18px',
    fontSize: 12, fontFamily: TOKENS.sans,
    color: TOKENS.muted, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 5,
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: TOKENS.bg, borderBottom: `1px solid ${TOKENS.borderLight}`, flexShrink: 0 }}>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFileSelect} style={{ display: 'none' }} />
        <button onClick={() => handleAddPhoto(activeBidRef.current)} disabled={isUploading} style={toolBtn(isUploading)}>
          <PhotoIcon /><span>{isUploading ? '업로드 중...' : '사진'}</span>
        </button>
        {state.sttMode !== 'off' && (
          <button onClick={toggleVoice} disabled={whisper.isTranscribing} style={toolBtn(isVoiceActive)}>
            <MicIcon /><span>{micLabel}</span>
          </button>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans }}>{charCount}자</span>
        {!showGuide && (
          <button onClick={() => setShowGuide(true)} style={{ background: 'none', border: 'none', fontSize: 12, color: TOKENS.muted, cursor: 'pointer', fontFamily: TOKENS.sans, padding: '6px 8px', minHeight: 36 }}>
            도움말
          </button>
        )}
      </div>

      {/* Recording indicator */}
      {isVoiceActive && (
        <div style={{ padding: '10px 16px', background: whisper.isTranscribing ? '#EFF6FF' : '#FEF2F2', borderBottom: `1px solid ${whisper.isTranscribing ? '#BFDBFE' : '#FECACA'}`, display: 'flex', alignItems: 'center', gap: 10, fontFamily: TOKENS.sans, flexShrink: 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: whisper.isTranscribing ? '#3B82F6' : '#DC2626', animation: 'pulse 1s infinite', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: whisper.isTranscribing ? '#1E40AF' : '#991B1B' }}>
            {whisper.isTranscribing ? '전사 중...' : whisper.isRecording ? '녹음 중... (버튼을 누르면 중지)' : '음성 인식 중...'}
          </span>
          {isListening && transcript && (
            <span style={{ fontSize: 12, color: TOKENS.subtext, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{transcript}"</span>
          )}
        </div>
      )}
      {whisper.error && (
        <div style={{ padding: '8px 16px', background: '#FEF2F2', borderBottom: '1px solid #FECACA', fontSize: 12, color: '#DC2626', fontFamily: TOKENS.sans }}>
          {whisper.error}
        </div>
      )}

      {/* ── 글쓰기 영역 ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>

          {/* 챕터 헤더 */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <p style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, letterSpacing: 3, marginBottom: 6 }}>챕터</p>
            <h2 style={{ fontSize: 'clamp(1.2rem, 5vw, 1.4rem)', fontWeight: 400 }}>{chapter.title}</h2>
            <div style={{ width: 32, height: 1, background: TOKENS.accent, margin: '12px auto 0', opacity: 0.6 }} />
          </div>

          {/* 도움말 힌트 */}
          {showGuide && (
            <div style={{ background: TOKENS.accentBg, border: `1px solid ${TOKENS.accentBorder}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20, position: 'relative' }}>
              <button onClick={() => setShowGuide(false)} style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', fontSize: 16, color: TOKENS.muted, cursor: 'pointer', minWidth: 32, minHeight: 32 }}>×</button>
              <p style={{ fontSize: 14, color: TOKENS.accent, lineHeight: 1.8, fontFamily: TOKENS.sans, marginBottom: 8 }}>이 주제에 대한 기억과 이야기를 자유롭게 적어주세요.</p>
              <p style={{ fontSize: 13, color: TOKENS.subtext, fontFamily: TOKENS.sans, fontStyle: 'italic' }}>이렇게 시작해보세요: "{hint}"</p>
            </div>
          )}

          {/* ── 블록 에디터 ── */}
          {blocks.map((block, idx) => {
            const isFirstBlock = idx === 0;
            const isLastBlock = idx === blocks.length - 1;

            if (block.type === 'text') {
              return (
                <div key={block.bid}>
                  {/* 텍스트 textarea */}
                  <textarea
                    ref={(el) => { taRefs.current[block.bid] = el; }}
                    value={block.content}
                    onChange={(e) => {
                      updateTextBlock(block.bid, e.target.value);
                      const ta = e.target;
                      ta.style.height = 'auto';
                      ta.style.height = Math.max(isFirstBlock ? 200 : 80, ta.scrollHeight) + 'px';
                    }}
                    onFocus={() => { activeBidRef.current = block.bid; }}
                    placeholder={
                      isFirstBlock && !block.content ? hint
                        : !isFirstBlock && !block.content ? '계속 이야기를 이어가세요...'
                        : ''
                    }
                    style={{
                      width: '100%',
                      minHeight: isFirstBlock ? 200 : 80,
                      border: 'none', outline: 'none', resize: 'none',
                      fontSize: fontPreset.prose,
                      lineHeight: fontPreset.lineHeight,
                      color: TOKENS.text, fontFamily: TOKENS.serif,
                      background: 'transparent',
                      caretColor: TOKENS.accent,
                      display: 'block',
                    }}
                  />

                  {/* 텍스트 블록 사이 — 사진 추가 버튼 */}
                  {!isLastBlock && (
                    <div style={{ textAlign: 'center', margin: '6px 0 14px' }}>
                      <button onClick={() => handleAddPhoto(block.bid)} style={photoAddBtn}>
                        <PhotoIcon /> 사진 추가
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            // ── 사진 블록 ──
            const photo = (chapter.photos || []).find((p) => p.id === block.photoId);
            if (!photo) return null;

            return (
              <div
                key={block.bid}
                style={{
                  background: TOKENS.card,
                  borderRadius: TOKENS.radiusSm,
                  overflow: 'hidden',
                  border: `1.5px solid ${photo.isFeatured ? '#b0986a' : TOKENS.borderLight}`,
                  marginBottom: 8,
                  boxShadow: photo.isFeatured ? '0 0 0 2px rgba(176,152,106,0.25)' : TOKENS.shadowSm,
                }}
              >
                <div style={{ position: 'relative' }}>
                  <img src={photo.data} alt="" style={{ width: '100%', display: 'block', maxHeight: 320, objectFit: 'cover' }} />
                  {/* 삭제 버튼 */}
                  <button
                    onClick={() => removePhotoBlock(block.bid, block.photoId)}
                    style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,.45)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}
                    title="사진 삭제"
                  >×</button>
                  {/* 대표사진 토글 */}
                  <button
                    onClick={() => setPhotoFeatured(chapterIdxRef.current, photo.id, !photo.isFeatured)}
                    title={photo.isFeatured ? '대표사진 해제' : '대표사진으로 설정 (섹션 헤더 배경)'}
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      borderRadius: 20,
                      background: photo.isFeatured ? 'rgba(176,152,106,0.9)' : 'rgba(0,0,0,0.45)',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 10px',
                      fontSize: 12,
                      fontFamily: TOKENS.sans,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {photo.isFeatured ? '★ 대표사진' : '☆ 대표사진'}
                  </button>
                </div>
                <input
                  value={photo.caption || ''}
                  onChange={(e) => updatePhotoCaption(chapterIdxRef.current, photo.id, e.target.value)}
                  placeholder="사진 설명을 입력하세요..."
                  style={{ width: '100%', padding: '11px 14px', border: 'none', borderTop: `1px solid ${TOKENS.borderLight}`, fontSize: 13, fontFamily: TOKENS.sans, outline: 'none', color: TOKENS.subtext, background: TOKENS.card, boxSizing: 'border-box' }}
                />
              </div>
            );
          })}

          {/* 맨 아래 사진 추가 버튼 */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              onClick={() => {
                const lastTB = [...blocks].reverse().find((b) => b.type === 'text') as TextBlock | undefined;
                handleAddPhoto(lastTB?.bid ?? blocks[0].bid);
              }}
              style={photoAddBtn}
            >
              <PhotoIcon /> 사진 추가
            </button>
          </div>

          <div style={{ height: 60 }} />
        </div>
      </div>
    </div>
  );
}
