'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBook } from '@/lib/book-context';
import { TOKENS } from '@/lib/design-tokens';
import { TOPICS, getPresetCards } from '@/lib/topics-data';

export default function SelectPage() {
  const router = useRouter();
  const { state, setSelectedTopics, buildChapters } = useBook();
  const [selected, setSelected] = useState(state.selectedTopics);
  const [search, setSearch] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(TOPICS[0].category);

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

  const handleBack = () => {
    router.back();
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

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    color: TOKENS.muted,
    marginBottom: 6,
    fontFamily: TOKENS.sans,
    letterSpacing: 2,
  };

  return (
    <div style={{ minHeight: '100dvh', background: TOKENS.bg }}>
      {/* Sticky header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: `rgba(250, 250, 248, 0.97)`,
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${TOKENS.borderLight}`,
          padding: '16px 16px 12px',
        }}
      >
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <label style={labelStyle}>주제 선택</label>
          <h2 style={{ fontSize: 'clamp(1.1rem, 4.5vw, 1.3rem)', fontWeight: 400, margin: '4px 0 4px' }}>
            이야기할 주제를 선택하세요
          </h2>
          <p style={{ fontSize: 12, color: TOKENS.muted, fontFamily: TOKENS.sans, marginBottom: 12 }}>
            많이 고를수록 풍성한 책이 됩니다.{' '}
            {selected.length > 0 && (
              <strong style={{ color: TOKENS.accent }}>현재 {selected.length}개 선택됨</strong>
            )}
          </p>

          {/* Search and custom button */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="주제 검색..."
              aria-label="주제 검색"
              style={{
                flex: 1,
                padding: '11px 14px',
                border: `1px solid ${TOKENS.border}`,
                borderRadius: TOKENS.radiusSm,
                fontSize: 16,
                fontFamily: TOKENS.sans,
                outline: 'none',
                background: TOKENS.card,
                minHeight: 44,
              }}
            />
            <button
              onClick={() => setShowCustom(!showCustom)}
              style={{
                padding: '11px 14px',
                border: `1px solid ${showCustom ? TOKENS.accent : TOKENS.border}`,
                borderRadius: TOKENS.radiusSm,
                background: showCustom ? TOKENS.accentBg : TOKENS.card,
                color: showCustom ? TOKENS.accent : TOKENS.subtext,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: TOKENS.sans,
                whiteSpace: 'nowrap',
                minHeight: 44,
              }}
            >
              + 직접 추가
            </button>
          </div>
        </div>
      </div>

      {/* Preset suggestion */}
      {selected.length === 0 && !search && (
        <div style={{ maxWidth: 560, margin: '12px auto 0', padding: '0 16px' }}>
          <div
            style={{
              padding: '16px',
              background: TOKENS.accentBg,
              border: `1px solid ${TOKENS.accentBorder}`,
              borderRadius: 10,
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 500, color: TOKENS.accent, marginBottom: 8, fontFamily: TOKENS.sans }}>
              처음이세요? 추천 5개로 시작해보세요
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {getPresetCards().map((c) => (
                <span
                  key={c.id}
                  style={{
                    padding: '6px 12px',
                    background: TOKENS.card,
                    border: `1px solid ${TOKENS.accentBorder}`,
                    borderRadius: 5,
                    fontSize: 13,
                    fontFamily: TOKENS.sans,
                    color: TOKENS.text,
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
                padding: 12,
                background: TOKENS.accent,
                color: '#fff',
                border: 'none',
                borderRadius: TOKENS.radiusSm,
                fontSize: 14,
                fontFamily: TOKENS.sans,
                fontWeight: 500,
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              추천 주제 5개 한번에 선택
            </button>
          </div>
        </div>
      )}

      {/* Custom input */}
      {showCustom && (
        <div style={{ maxWidth: 560, margin: '10px auto 0', padding: '0 16px' }}>
          <div
            style={{
              padding: 16,
              background: TOKENS.accentBg,
              border: `1px solid ${TOKENS.accentBorder}`,
              borderRadius: 10,
            }}
          >
            <label style={labelStyle}>직접 추가</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="예: 나의 요리 이야기..."
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  border: `1px solid ${TOKENS.accentBorder}`,
                  borderRadius: TOKENS.radiusSm,
                  fontSize: 16,
                  fontFamily: TOKENS.sans,
                  outline: 'none',
                  minHeight: 44,
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addCustom();
                }}
              />
              <button
                onClick={addCustom}
                disabled={!customTitle.trim()}
                style={{
                  padding: '12px 18px',
                  background: customTitle.trim() ? TOKENS.accent : '#ccc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: TOKENS.radiusSm,
                  fontSize: 14,
                  fontFamily: TOKENS.sans,
                  cursor: customTitle.trim() ? 'pointer' : 'default',
                  minHeight: 44,
                }}
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category list */}
      <div style={{ padding: '8px 16px 200px', maxWidth: 560, margin: '0 auto' }}>
        {filtered.map((group, gi) => {
          const expanded = isExpanded(group.category);
          const selectedCount = group.cards.filter((c) => getSelectedIndex(c.id) > 0).length;

          return (
            <div key={group.category}>
              <button
                onClick={() =>
                  setExpandedCategory(expanded && !search ? null : group.category)
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '14px 2px',
                  border: 'none',
                  borderBottom: `1px solid ${TOKENS.borderLight}`,
                  background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: TOKENS.sans,
                  textAlign: 'left',
                  minHeight: 52,
                }}
              >
                <span style={{ fontSize: 11, color: TOKENS.muted, fontWeight: 600, letterSpacing: 2, minWidth: 26 }}>
                  {String(gi + 1).padStart(2, '0')}
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ fontSize: 15, fontWeight: 500, color: TOKENS.text, fontFamily: TOKENS.serif }}>
                    {group.category}
                  </span>
                  <br />
                  <span style={{ fontSize: 10, color: TOKENS.muted, letterSpacing: 1.5 }}>{group.enLabel}</span>
                </span>
                {selectedCount > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: TOKENS.sans,
                      fontWeight: 600,
                      color: TOKENS.accent,
                      background: TOKENS.accentBg,
                      padding: '3px 10px',
                      borderRadius: 20,
                      border: `1px solid ${TOKENS.accentBorder}`,
                    }}
                  >
                    {selectedCount}
                  </span>
                )}
                <span style={{ color: TOKENS.muted, fontSize: 12 }}>{expanded ? '−' : '+'}</span>
              </button>

              {/* Cards */}
              {expanded && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 0 14px 38px' }}>
                  {group.cards.map((card) => {
                    const selectedIdx = getSelectedIndex(card.id);
                    const isSelected = selectedIdx > 0;

                    return (
                      <button
                        key={card.id}
                        onClick={() => toggleTopic(card)}
                        style={{
                          position: 'relative',
                          padding: '10px 16px',
                          border: `1px solid ${isSelected ? TOKENS.dark : TOKENS.border}`,
                          borderRadius: TOKENS.radiusSm,
                          background: isSelected ? TOKENS.dark : TOKENS.card,
                          color: isSelected ? '#FAFAF9' : TOKENS.text,
                          fontSize: 14,
                          cursor: 'pointer',
                          fontFamily: TOKENS.sans,
                          minHeight: 42,
                        }}
                      >
                        {isSelected && (
                          <span
                            style={{
                              position: 'absolute',
                              top: -6,
                              right: -6,
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: TOKENS.accent,
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
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

      {/* Bottom button bar */}
      {selected.length > 0 && (
        <div
          className="sa-b-lg"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: TOKENS.card,
            borderTop: `1px solid ${TOKENS.border}`,
            padding: '10px 16px 14px',
            boxShadow: '0 -6px 24px rgba(0,0,0,.05)',
          }}
        >
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10 }}>
              {selected.map((s, i) => (
                <span
                  key={s.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    background: s.custom ? TOKENS.accentBg : TOKENS.warm,
                    border: s.custom ? `1px solid ${TOKENS.accentBorder}` : 'none',
                    borderRadius: 5,
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                    fontFamily: TOKENS.sans,
                    color: TOKENS.subtext,
                  }}
                >
                  <span style={{ color: TOKENS.accent, fontWeight: 700 }}>{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                  <button
                    onClick={() => setSelected(selected.filter((x) => x.id !== s.id))}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 11,
                      color: TOKENS.muted,
                      cursor: 'pointer',
                      padding: '2px 0 2px 4px',
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <button
              onClick={handleDone}
              style={{
                width: '100%',
                padding: 14,
                background: TOKENS.dark,
                color: '#FAFAF9',
                border: 'none',
                borderRadius: TOKENS.radiusSm,
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: TOKENS.sans,
                minHeight: 50,
              }}
            >
              {selected.length}개 챕터로 목차 구성
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
