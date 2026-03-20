'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useBook } from '@/lib/book-context';
import { TOKENS } from '@/lib/design-tokens';
import { TOPICS, getPresetCards } from '@/lib/topics-data';
import UserNav from '@/components/ui/UserNav';

const ACCENT = '#A0522D';
const ACCENT_BG = '#FBF6F1';
const ACCENT_BORDER = '#E8D0BC';
const GOLD = '#C9A96E';

export default function SelectPage() {
  const router = useRouter();
  const { state, setSelectedTopics, buildChapters } = useBook();
  const [selected, setSelected] = useState(state.selectedTopics);
  const [search, setSearch] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(TOPICS[0].category);
  const composingRef = useRef(false);

  const toggleTopic = (card: any) => {
    const exists = selected.find((s) => s.id === card.id);
    if (exists) {
      setSelected(selected.filter((s) => s.id !== card.id));
    } else {
      setSelected([...selected, { id: card.id, title: card.title, custom: false }]);
    }
  };

  const addCustom = () => {
    if (!customTitle.trim()) return;
    const newCustom = {
      id: `custom-${Math.random().toString(36).slice(2, 10)}`,
      title: customTitle.trim(),
      custom: true,
    };
    setSelected([...selected, newCustom]);
    setCustomTitle('');
    setShowCustom(false);
  };

  const applyPreset = () => {
    const presetCards = getPresetCards();
    const newSelected = [...selected];
    for (const card of presetCards) {
      if (!newSelected.find((s) => s.id === card.id)) {
        newSelected.push({ id: card.id, title: card.title, custom: false });
      }
    }
    setSelected(newSelected);
  };

  const handleDone = () => {
    setSelectedTopics(selected);
    buildChapters();
    router.push('/toc');
  };

  const filtered = search.trim()
    ? TOPICS.map((g) => ({
        ...g,
        cards: g.cards.filter((c) => c.title.includes(search)),
      })).filter((g) => g.cards.length > 0)
    : TOPICS;

  const getSelectedIndex = (cardId: string) => {
    const idx = selected.findIndex((s) => s.id === cardId);
    return idx >= 0 ? idx + 1 : 0;
  };

  const isExpanded = (cat: string) => {
    return expandedCategory === cat || search.trim().length > 0;
  };

  return (
    <div style={{ minHeight: '100dvh', background: TOKENS.bg }}>
      {/* 상단 그라디언트 진행 바 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${ACCENT}, ${GOLD})`,
          zIndex: 100,
        }}
      />

      {/* Step indicator */}
      <div
        style={{
          position: 'fixed',
          top: 2,
          left: 0,
          right: 0,
          background: TOKENS.bg,
          borderBottom: `1px solid ${TOKENS.borderLight}`,
          zIndex: 90,
        }}
      >
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
          {['주제 선택', '목차 확인', '이야기 쓰기'].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 10px',
                  borderRadius: 20,
                  background: i === 0 ? ACCENT : 'transparent',
                  border: `1px solid ${i === 0 ? ACCENT : TOKENS.borderLight}`,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: i === 0 ? '#fff' : TOKENS.muted,
                    fontFamily: TOKENS.sans,
                    letterSpacing: 0.5,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: i === 0 ? '#fff' : TOKENS.muted,
                    fontFamily: TOKENS.sans,
                  }}
                >
                  {step}
                </span>
              </div>
              {i < 2 && (
                <div style={{ width: 16, height: 1, background: TOKENS.borderLight }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 공통 사용자 네비게이션 */}
      <div style={{ paddingTop: 44 }}>
        <UserNav loginCallbackUrl="/select" />
      </div>

      {/* Sticky search header */}
      <div
        style={{
          position: 'sticky',
          top: 44,
          zIndex: 80,
          background: 'rgba(250,250,248,0.97)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${TOKENS.borderLight}`,
          padding: '16px 20px 14px',
        }}
      >
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {/* 헤더 */}
          <div style={{ marginBottom: 12 }}>
            <p
              style={{
                fontSize: 10,
                letterSpacing: 3,
                color: TOKENS.muted,
                fontFamily: TOKENS.sans,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Step 01 · Topic Selection
            </p>
            <h2
              style={{
                fontSize: 'clamp(1.15rem, 4.5vw, 1.35rem)',
                fontWeight: 400,
                fontFamily: TOKENS.serif,
                color: TOKENS.text,
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              어떤 이야기를 담을까요?
            </h2>
            {selected.length > 0 && (
              <p style={{ fontSize: 12, color: ACCENT, fontFamily: TOKENS.sans, marginTop: 3, fontWeight: 500 }}>
                {selected.length}개 주제 선택됨
              </p>
            )}
          </div>

          {/* 검색 + 직접 추가 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <svg
                width="14" height="14"
                viewBox="0 0 24 24" fill="none" stroke={TOKENS.muted}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              >
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="주제 검색..."
                aria-label="주제 검색"
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 34px',
                  border: `1px solid ${TOKENS.border}`,
                  borderRadius: 10,
                  fontSize: 15,
                  fontFamily: TOKENS.sans,
                  outline: 'none',
                  background: TOKENS.card,
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                  minHeight: 44,
                }}
                onFocus={(e) => (e.target.style.borderColor = ACCENT)}
                onBlur={(e) => (e.target.style.borderColor = TOKENS.border)}
              />
            </div>
            <button
              onClick={() => setShowCustom(!showCustom)}
              style={{
                padding: '11px 16px',
                border: `1px solid ${showCustom ? ACCENT : TOKENS.border}`,
                borderRadius: 10,
                background: showCustom ? ACCENT_BG : TOKENS.card,
                color: showCustom ? ACCENT : TOKENS.subtext,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: TOKENS.sans,
                whiteSpace: 'nowrap',
                minHeight: 44,
                fontWeight: showCustom ? 500 : 400,
                transition: 'all 0.2s',
              }}
            >
              + 직접 추가
            </button>
          </div>
        </div>
      </div>

      {/* 추천 프리셋 */}
      {selected.length === 0 && !search && (
        <div style={{ maxWidth: 600, margin: '16px auto 0', padding: '0 20px' }}>
          <div
            style={{
              padding: 20,
              background: ACCENT_BG,
              border: `1px solid ${ACCENT_BORDER}`,
              borderRadius: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: ACCENT, margin: '0 0 2px', fontFamily: TOKENS.sans }}>
                  처음이세요? 추천 주제로 시작해보세요
                </p>
                <p style={{ fontSize: 12, color: TOKENS.muted, margin: 0, fontFamily: TOKENS.sans }}>
                  많이 고를수록 더 풍성한 책이 됩니다
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {getPresetCards().map((c) => (
                <span
                  key={c.id}
                  style={{
                    padding: '6px 13px',
                    background: TOKENS.card,
                    border: `1px solid ${ACCENT_BORDER}`,
                    borderRadius: 20,
                    fontSize: 12,
                    fontFamily: TOKENS.sans,
                    color: TOKENS.subtext,
                  }}
                >
                  {c.title}
                </span>
              ))}
            </div>
            <button
              onClick={applyPreset}
              style={{
                width: '100%',
                padding: '12px 0',
                background: ACCENT,
                color: '#fff',
                border: 'none',
                borderRadius: 40,
                fontSize: 14,
                fontFamily: TOKENS.sans,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: 0.3,
                boxShadow: `0 4px 16px ${ACCENT}44`,
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.target as HTMLButtonElement).style.boxShadow = `0 8px 24px ${ACCENT}55`;
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.target as HTMLButtonElement).style.boxShadow = `0 4px 16px ${ACCENT}44`;
              }}
            >
              추천 주제 5개 한번에 선택
            </button>
          </div>
        </div>
      )}

      {/* 직접 추가 입력 */}
      {showCustom && (
        <div style={{ maxWidth: 600, margin: '12px auto 0', padding: '0 20px' }}>
          <div
            style={{
              padding: 16,
              background: ACCENT_BG,
              border: `1px solid ${ACCENT_BORDER}`,
              borderRadius: 14,
            }}
          >
            <p style={{ fontSize: 11, letterSpacing: 2, color: TOKENS.muted, fontFamily: TOKENS.sans, marginBottom: 8, textTransform: 'uppercase' }}>
              직접 추가
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="예: 나의 요리 이야기..."
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  border: `1px solid ${ACCENT_BORDER}`,
                  borderRadius: 10,
                  fontSize: 15,
                  fontFamily: TOKENS.sans,
                  outline: 'none',
                  background: TOKENS.card,
                  minHeight: 44,
                }}
                onCompositionStart={() => (composingRef.current = true)}
                onCompositionEnd={() => (composingRef.current = false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !composingRef.current) addCustom();
                }}
              />
              <button
                onClick={addCustom}
                disabled={!customTitle.trim()}
                style={{
                  padding: '12px 20px',
                  background: customTitle.trim() ? ACCENT : TOKENS.light,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontFamily: TOKENS.sans,
                  cursor: customTitle.trim() ? 'pointer' : 'default',
                  minHeight: 44,
                  fontWeight: 500,
                  transition: 'background 0.2s',
                }}
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 카테고리 아코디언 */}
      <div style={{ padding: '12px 20px 200px', maxWidth: 600, margin: '0 auto' }}>
        {filtered.map((group, gi) => {
          const expanded = isExpanded(group.category);
          const selectedCount = group.cards.filter((c) => getSelectedIndex(c.id) > 0).length;

          return (
            <div key={group.category} style={{ marginBottom: 2 }}>
              <button
                onClick={() =>
                  setExpandedCategory(expanded && !search ? null : group.category)
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  width: '100%',
                  padding: '15px 4px',
                  border: 'none',
                  borderBottom: `1px solid ${TOKENS.borderLight}`,
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  minHeight: 56,
                  transition: 'opacity 0.15s',
                }}
              >
                {/* 번호 */}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: expanded && !search ? ACCENT : TOKENS.light,
                    fontFamily: TOKENS.sans,
                    letterSpacing: 1.5,
                    minWidth: 24,
                    transition: 'color 0.2s',
                  }}
                >
                  {String(gi + 1).padStart(2, '0')}
                </span>

                {/* 텍스트 */}
                <span style={{ flex: 1 }}>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: expanded && !search ? 500 : 400,
                      color: TOKENS.text,
                      fontFamily: TOKENS.serif,
                      display: 'block',
                      lineHeight: 1.3,
                    }}
                  >
                    {group.category}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: TOKENS.muted,
                      fontFamily: TOKENS.sans,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    {group.enLabel}
                  </span>
                </span>

                {/* 선택 배지 */}
                {selectedCount > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: ACCENT,
                      background: ACCENT_BG,
                      padding: '3px 10px',
                      borderRadius: 20,
                      border: `1px solid ${ACCENT_BORDER}`,
                      fontFamily: TOKENS.sans,
                    }}
                  >
                    {selectedCount}
                  </span>
                )}

                {/* 펼치기/접기 */}
                <span
                  style={{
                    color: TOKENS.muted,
                    fontSize: 16,
                    lineHeight: 1,
                    transform: expanded ? 'rotate(45deg)' : 'rotate(0deg)',
                    transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1)',
                    display: 'inline-block',
                  }}
                >
                  +
                </span>
              </button>

              {/* 주제 카드 */}
              {expanded && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 7,
                    padding: '12px 0 16px 38px',
                  }}
                >
                  {group.cards.map((card) => {
                    const selectedIdx = getSelectedIndex(card.id);
                    const isSelected = selectedIdx > 0;

                    return (
                      <button
                        key={card.id}
                        onClick={() => toggleTopic(card)}
                        className="card-hover"
                        style={{
                          position: 'relative',
                          padding: '9px 16px',
                          border: `1.5px solid ${isSelected ? ACCENT : TOKENS.border}`,
                          borderRadius: 40,
                          background: isSelected ? TOKENS.dark : TOKENS.card,
                          color: isSelected ? '#FAFAF9' : TOKENS.text,
                          fontSize: 13,
                          cursor: 'pointer',
                          fontFamily: TOKENS.sans,
                          minHeight: 38,
                          fontWeight: isSelected ? 500 : 400,
                          transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                          boxShadow: isSelected ? `0 4px 12px ${ACCENT}33` : '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                      >
                        {isSelected && (
                          <span
                            style={{
                              position: 'absolute',
                              top: -6,
                              right: -6,
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: `linear-gradient(135deg, ${ACCENT}, ${GOLD})`,
                              color: '#fff',
                              fontSize: 9,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                            }}
                          >
                            {selectedIdx}
                          </span>
                        )}
                        {card.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 하단 고정 바 */}
      {selected.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderTop: `1px solid ${TOKENS.borderLight}`,
            padding: '12px 20px 20px',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            {/* 선택된 태그 스크롤 */}
            <div
              style={{
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                paddingBottom: 10,
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
              }}
            >
              {selected.map((s, i) => (
                <span
                  key={s.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 10px 5px 12px',
                    background: s.custom ? ACCENT_BG : TOKENS.warm,
                    border: `1px solid ${s.custom ? ACCENT_BORDER : TOKENS.borderLight}`,
                    borderRadius: 20,
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                    fontFamily: TOKENS.sans,
                    color: TOKENS.subtext,
                    flexShrink: 0,
                  }}
                >
                  <span style={{ color: ACCENT, fontWeight: 700, fontSize: 10 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {s.title}
                  <button
                    onClick={() => setSelected(selected.filter((x) => x.id !== s.id))}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 13,
                      color: TOKENS.muted,
                      cursor: 'pointer',
                      padding: '0 0 0 2px',
                      lineHeight: 1,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* 다음 버튼 */}
            <button
              onClick={handleDone}
              style={{
                width: '100%',
                padding: '14px 0',
                background: `linear-gradient(135deg, ${TOKENS.dark} 0%, #2D2926 100%)`,
                color: '#FAFAF9',
                border: 'none',
                borderRadius: 40,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: TOKENS.sans,
                letterSpacing: 0.3,
                boxShadow: '0 6px 20px rgba(26,24,22,0.2)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 10px 28px rgba(26,24,22,0.28)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(26,24,22,0.2)';
              }}
            >
              {selected.length}개 챕터로 목차 구성하기  →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
