'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useBook } from '@/lib/book-context';
import { TOKENS } from '@/lib/design-tokens';

const OnboardingModal = dynamic(() => import('@/components/OnboardingModal'), { ssr: false, loading: () => null });

/* ─── 정적 데이터 ───────────────────────────────────────── */

const PILLARS = [
  {
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=720&q=80',
    fallback: '#7C6A5A',
    tag: '쉬운 대화',
    title: '말하듯 편하게,\nAI가 이끌어갑니다',
    desc: '글쓰기 실력은 필요 없습니다. AI가 질문하면 말씀하시듯 편하게 대답하기만 하면 됩니다.',
  },
  {
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=720&q=80',
    fallback: '#5A6A5A',
    tag: '아름다운 책',
    title: '이야기가 한 권의\n책이 됩니다',
    desc: '나누신 이야기가 아름답게 정리되어 언제든 다시 읽을 수 있는 책으로 완성됩니다.',
  },
  {
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=720&q=80',
    fallback: '#5A5A6A',
    tag: '가족과 공유',
    title: '소중한 이야기를\n가족과 나눕니다',
    desc: '링크 하나로 가족 모두가 읽을 수 있습니다. 멀리 사는 가족과도 함께 만들어갈 수 있어요.',
  },
];

const STEPS = [
  {
    n: '01',
    title: '주제 선택',
    label: 'Choose',
    desc: '탄생, 학창시절, 사랑, 인생 등 72가지 테마에서 내 이야기와 맞는 것을 골라보세요.',
  },
  {
    n: '02',
    title: 'AI와 대화',
    label: 'Talk',
    desc: 'AI가 질문을 드리면 말씀하시듯 편하게 대답하세요. 음성으로도 이야기할 수 있어요.',
  },
  {
    n: '03',
    title: '책 완성',
    label: 'Finish',
    desc: '이야기가 아름다운 책으로 완성됩니다. PDF로 저장하고 가족과 함께 나눠보세요.',
  },
];

const SCENARIOS = [
  {
    image: 'https://images.unsplash.com/photo-1609220136736-443140cfeaa8?w=720&q=80',
    fallback: '#8B7355',
    tag: '선물',
    title: '부모님께 드리는\n가장 특별한 선물',
    desc: '평생의 이야기를 한 권의 책으로.\n자녀가 드릴 수 있는 가장 따뜻한 선물입니다.',
  },
  {
    image: 'https://images.unsplash.com/photo-1603539947678-cd3954ed515d?w=720&q=80',
    fallback: '#6B7B6B',
    tag: '유산',
    title: '자녀에게 남기는\n소중한 이야기',
    desc: '내 삶의 지혜와 기억을 다음 세대에게.\n말로만 전하던 이야기를 영원히 남깁니다.',
  },
  {
    image: 'https://images.unsplash.com/photo-1511895426328-dc8714191011?w=720&q=80',
    fallback: '#7B6B8B',
    tag: '기억',
    title: '잊고 싶지 않은\n소중한 순간들',
    desc: '결혼, 육아, 여행의 기억들.\n함께한 시간이 책이 되어 영원히 남습니다.',
  },
  {
    image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=720&q=80',
    fallback: '#5B6B7B',
    tag: '역사',
    title: '우리 가족의\n역사를 기록합니다',
    desc: '뿌리와 이야기, 가족만의 문화까지.\n아름다운 책으로 대대로 전해집니다.',
  },
];

const FAQS = [
  {
    q: '글을 잘 못 써도 괜찮나요?',
    a: '전혀 문제없습니다. AI가 질문을 드리면 말하듯 편하게 대답만 하시면 됩니다. 별도의 글쓰기 실력이 필요하지 않아요.',
  },
  {
    q: 'AI가 이야기를 대신 써주나요?',
    a: 'AI는 기억을 이끌어내는 질문을 드리는 역할만 합니다. 이야기의 주인공은 언제나 본인이세요. 작성된 글은 어르신의 말투와 표현이 그대로 담깁니다.',
  },
  {
    q: '완성된 책은 어떻게 보존되나요?',
    a: '로그인하시면 클라우드에 안전하게 저장됩니다. PDF로 내려받거나 가족과 링크로 공유할 수 있습니다. 언제든지 다시 열어볼 수 있어요.',
  },
  {
    q: '가족과 어떻게 함께할 수 있나요?',
    a: '링크 하나로 가족 누구나 읽을 수 있습니다. 인터뷰어로 초대하면 가족이 직접 질문을 추가할 수도 있어요. 멀리 사는 가족과도 함께 만들어갈 수 있습니다.',
  },
];

/* ─── 공통 스타일 ────────────────────────────────────────── */

const SECTION_PAD: React.CSSProperties = { padding: '88px 24px' };
const MAX_W: React.CSSProperties = { maxWidth: 1080, margin: '0 auto', width: '100%' };
const MAX_W_NARROW: React.CSSProperties = { maxWidth: 520, margin: '0 auto', width: '100%' };

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 4,
  color: TOKENS.accent,
  fontFamily: TOKENS.sans,
  marginBottom: 14,
  textTransform: 'uppercase' as const,
  fontWeight: 500,
};

const SECTION_H2: React.CSSProperties = {
  fontFamily: TOKENS.serif,
  fontSize: 'clamp(1.5rem, 4vw, 2rem)',
  fontWeight: 300,
  letterSpacing: '-0.025em',
  color: TOKENS.text,
  wordBreak: 'keep-all' as const,
  lineHeight: 1.3,
};

/* ─── 컴포넌트 ───────────────────────────────────────────── */

export default function LandingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { state, setTitle, setAuthor, restoreFromDb } = useBook();

  const [title, setTitleLocal] = useState(state.title);
  const [author, setAuthorLocal] = useState(state.author);
  const [hasSaved, setHasSaved] = useState(false);
  const [dbBook, setDbBook] = useState<{ id: string; title: string; author: string } | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [dbDismissed, setDbDismissed] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const isLoggedIn = status === 'authenticated';

  useEffect(() => {
    setHasSaved(state.chapters.length > 0);
  }, [state.chapters.length]);

  useEffect(() => {
    const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseConfigured || state.chapters.length > 0 || dbDismissed) return;
    setIsCheckingDb(true);
    fetch('/api/books')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const firstBook = data?.books?.[0] ?? data?.book ?? null;
        if (firstBook) setDbBook(firstBook);
      })
      .catch(() => {})
      .finally(() => setIsCheckingDb(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleStart = () => {
    setTitle(title);
    setAuthor(author);
    router.push('/select');
  };

  const handleContinue = () => {
    if (state.chapters.length > 0) router.push('/write');
  };

  const handleRestoreFromDb = async () => {
    if (!dbBook) return;
    setIsRestoring(true);
    const ok = await restoreFromDb(dbBook.id);
    setIsRestoring(false);
    if (ok) router.push('/write');
  };

  const handleDismissDb = () => {
    setDbBook(null);
    setDbDismissed(true);
  };

  const scrollToStart = () => {
    document.getElementById('start-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ fontFamily: TOKENS.sans, color: TOKENS.text, background: '#FFF' }}>

      {/* ━━━━━━━━ ONBOARDING MODAL ━━━━━━━━━━━━━━━━━━━━━━━ */}
      <OnboardingModal onClose={() => {}} onStart={scrollToStart} />

      {/* ━━━━━━━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 100,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          background: scrolled ? 'rgba(250,250,248,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? `1px solid ${TOKENS.borderLight}` : '1px solid transparent',
          transition: 'background 0.35s, border-color 0.35s, backdrop-filter 0.35s',
        }}
      >
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: TOKENS.serif,
            fontSize: 17,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            color: TOKENS.text,
          }}
        >
          나의이야기
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isLoggedIn ? (
            <button
              onClick={() => router.push('/my')}
              style={{
                background: 'transparent',
                border: `1px solid ${TOKENS.border}`,
                borderRadius: 40,
                padding: '7px 18px',
                fontSize: 13,
                cursor: 'pointer',
                color: TOKENS.subtext,
                fontFamily: TOKENS.sans,
                fontWeight: 400,
                transition: 'border-color 0.2s, color 0.2s',
              }}
            >
              내 책 보관함
            </button>
          ) : (
            <button
              onClick={() => router.push('/login?callbackUrl=%2F')}
              style={{
                background: TOKENS.dark,
                color: '#FAFAF9',
                border: 'none',
                borderRadius: 40,
                padding: '8px 20px',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: TOKENS.sans,
                fontWeight: 500,
              }}
            >
              로그인
            </button>
          )}
        </div>
      </header>

      {/* ━━━━━━━━ SECTION 1 — HERO ━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        style={{
          minHeight: '100dvh',
          background: 'linear-gradient(155deg, #FAFAF8 0%, #F2ECE4 55%, #E8DDD0 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '120px 24px 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 배경 장식 원 */}
        <div style={{
          position: 'absolute', top: '-10%', right: '-5%',
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,94,52,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-8%', left: '-8%',
          width: 360, height: 360, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,94,52,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* 장식선 */}
        <div className="hero-content" style={{ marginBottom: 28 }}>
          <div style={{ width: 1, height: 52, background: TOKENS.text, margin: '0 auto', opacity: 0.12 }} />
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: TOKENS.text, margin: '5px auto 0', opacity: 0.12 }} />
        </div>

        <p className="hero-content" style={{ ...SECTION_LABEL, marginBottom: 20 }}>
          My Story
        </p>

        <h1
          className="hero-content"
          style={{
            fontFamily: TOKENS.serif,
            fontSize: 'clamp(2.5rem, 9vw, 4rem)',
            fontWeight: 300,
            lineHeight: 1.2,
            letterSpacing: '-0.03em',
            color: TOKENS.text,
            marginBottom: 28,
            wordBreak: 'keep-all',
          }}
        >
          당신의 삶이<br />
          한 권의 책이 됩니다
        </h1>

        <p
          className="hero-sub"
          style={{
            fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
            color: TOKENS.subtext,
            lineHeight: 1.85,
            maxWidth: 380,
            marginBottom: 44,
            wordBreak: 'keep-all',
            fontFamily: TOKENS.sans,
            fontWeight: 300,
          }}
        >
          소중한 기억을 AI와의 대화로 이야기하세요.<br />
          그 이야기가 가족과 함께할 책이 됩니다.
        </p>

        <div className="hero-cta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <button
            className="cta-btn"
            onClick={scrollToStart}
            style={{
              background: TOKENS.dark,
              color: '#FAFAF9',
              border: 'none',
              borderRadius: 40,
              padding: '17px 44px',
              fontSize: 15,
              fontFamily: TOKENS.sans,
              fontWeight: 500,
              cursor: 'pointer',
              letterSpacing: '0.01em',
              boxShadow: '0 6px 28px rgba(26,24,22,0.18)',
            }}
          >
            내 이야기 시작하기
          </button>

          {isLoggedIn && (
            <button
              onClick={() => router.push('/my')}
              style={{
                background: 'transparent',
                color: TOKENS.subtext,
                border: 'none',
                fontSize: 13,
                fontFamily: TOKENS.sans,
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                fontWeight: 400,
              }}
            >
              이전에 쓴 책 보러가기
            </button>
          )}
        </div>

        {/* 스크롤 힌트 */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            left: '50%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            animation: 'scrollBounce 2.4s ease-in-out infinite',
          }}
        >
          <span style={{ fontSize: 9, letterSpacing: 3, color: TOKENS.muted, fontFamily: TOKENS.sans, textTransform: 'uppercase' }}>
            Scroll
          </span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 8l5 5 5-5" stroke={TOKENS.muted} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ━━━━━━━━ SECTION 2 — WHY ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ ...SECTION_PAD, background: '#FFF' }}>
        <div style={MAX_W}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={SECTION_LABEL}>Why Mystory</p>
            <h2 style={SECTION_H2}>이야기는 사라지지 않습니다</h2>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            {PILLARS.map((p, i) => (
              <div
                key={i}
                className="card-hover"
                style={{
                  flex: '1 1 280px',
                  maxWidth: 340,
                  borderRadius: 20,
                  overflow: 'hidden',
                  boxShadow: '0 6px 32px rgba(0,0,0,0.13)',
                  position: 'relative',
                  minHeight: 440,
                  background: p.fallback,
                  cursor: 'default',
                }}
              >
                {/* 배경 이미지 */}
                <img
                  src={p.image}
                  alt={p.tag}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    transition: 'transform 0.5s ease',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                {/* 그라디언트 오버레이 */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(160deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.18) 40%, rgba(0,0,0,0.72) 100%)',
                  }}
                />
                {/* 태그 (상단) */}
                <div
                  style={{
                    position: 'absolute',
                    top: 24,
                    left: 24,
                    background: 'rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: 40,
                    padding: '5px 14px',
                    fontSize: 11,
                    color: '#FFF',
                    fontFamily: TOKENS.sans,
                    letterSpacing: 1.5,
                    fontWeight: 500,
                  }}
                >
                  {p.tag}
                </div>
                {/* 본문 (하단) */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '28px 28px 32px',
                    color: '#FFF',
                  }}
                >
                  <h3
                    style={{
                      fontFamily: TOKENS.serif,
                      fontSize: 'clamp(1.1rem, 3vw, 1.3rem)',
                      fontWeight: 300,
                      marginBottom: 10,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.35,
                      whiteSpace: 'pre-line',
                      wordBreak: 'keep-all',
                    }}
                  >
                    {p.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      lineHeight: 1.75,
                      color: 'rgba(255,255,255,0.8)',
                      fontFamily: TOKENS.sans,
                      fontWeight: 300,
                      wordBreak: 'keep-all',
                    }}
                  >
                    {p.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━ SECTION 3 — HOW IT WORKS ━━━━━━━━━━━━━━━ */}
      <section style={{ ...SECTION_PAD, background: TOKENS.warm }}>
        <div style={MAX_W}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <p style={SECTION_LABEL}>How It Works</p>
            <h2 style={SECTION_H2}>이렇게 만들어집니다</h2>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
            {STEPS.map((step, i) => (
              <div
                key={i}
                style={{
                  flex: '1 1 220px',
                  maxWidth: 320,
                  textAlign: 'center',
                  padding: '0 36px 32px',
                  position: 'relative',
                }}
              >
                {/* 워터마크 번호 */}
                <div
                  style={{
                    position: 'absolute',
                    top: -16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 100,
                    fontFamily: TOKENS.serif,
                    fontWeight: 300,
                    color: 'rgba(26,24,22,0.045)',
                    lineHeight: 1,
                    pointerEvents: 'none',
                    userSelect: 'none',
                    letterSpacing: '-0.04em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {step.n}
                </div>

                {/* 아웃라인 원 */}
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    border: `1.5px solid ${TOKENS.border}`,
                    background: TOKENS.warm,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <span
                    style={{
                      fontFamily: TOKENS.serif,
                      fontSize: 13,
                      fontWeight: 300,
                      color: TOKENS.subtext,
                      letterSpacing: '0.07em',
                    }}
                  >
                    {step.n}
                  </span>
                </div>

                {/* 영문 라벨 */}
                <p
                  style={{
                    fontSize: 9,
                    letterSpacing: 3.5,
                    color: TOKENS.accent,
                    fontFamily: TOKENS.sans,
                    textTransform: 'uppercase' as const,
                    marginBottom: 10,
                    fontWeight: 500,
                  }}
                >
                  {step.label}
                </p>

                <h3
                  style={{
                    fontFamily: TOKENS.serif,
                    fontSize: 19,
                    fontWeight: 400,
                    marginBottom: 14,
                    color: TOKENS.text,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.3,
                  }}
                >
                  {step.title}
                </h3>

                <p
                  style={{
                    fontSize: 13.5,
                    color: TOKENS.subtext,
                    lineHeight: 1.9,
                    wordBreak: 'keep-all',
                    fontFamily: TOKENS.sans,
                    fontWeight: 300,
                  }}
                >
                  {step.desc}
                </p>

                {/* 구분선 (마지막 제외) */}
                {i < 2 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 32,
                      right: -4,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: TOKENS.border,
                      zIndex: 1,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━ SECTION 4 — SCENARIOS ━━━━━━━━━━━━━━━━━━ */}
      <section style={{ ...SECTION_PAD, background: '#FFF' }}>
        <div style={MAX_W}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={SECTION_LABEL}>For Whom</p>
            <h2 style={SECTION_H2}>이런 분들께 권합니다</h2>
          </div>

          {/* 2×2 그리드: 가로형 카드 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
              gap: 16,
            }}
          >
            {SCENARIOS.map((s, i) => (
              <div
                key={i}
                className="card-hover"
                style={{
                  borderRadius: 20,
                  overflow: 'hidden',
                  boxShadow: '0 6px 28px rgba(0,0,0,0.12)',
                  position: 'relative',
                  height: 240,
                  background: s.fallback,
                  cursor: 'default',
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                {/* 배경 이미지 */}
                <img
                  src={s.image}
                  alt={s.tag}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center 30%',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                {/* 왼쪽 그라디언트 (텍스트 가독성) */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.05) 100%)',
                  }}
                />
                {/* 텍스트 (왼쪽 정렬) */}
                <div
                  style={{
                    position: 'relative',
                    padding: '24px 32px',
                    color: '#FFF',
                    maxWidth: '65%',
                  }}
                >
                  {/* 태그 */}
                  <span
                    style={{
                      display: 'inline-block',
                      background: 'rgba(255,255,255,0.18)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.28)',
                      borderRadius: 40,
                      padding: '3px 12px',
                      fontSize: 10,
                      letterSpacing: 1.5,
                      fontFamily: TOKENS.sans,
                      fontWeight: 500,
                      marginBottom: 10,
                    }}
                  >
                    {s.tag}
                  </span>
                  <h3
                    style={{
                      fontFamily: TOKENS.serif,
                      fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
                      fontWeight: 300,
                      marginBottom: 8,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.4,
                      whiteSpace: 'pre-line',
                      wordBreak: 'keep-all',
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 12.5,
                      lineHeight: 1.7,
                      color: 'rgba(255,255,255,0.78)',
                      fontFamily: TOKENS.sans,
                      fontWeight: 300,
                      wordBreak: 'keep-all',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━ SECTION 5 — START FORM ━━━━━━━━━━━━━━━━━ */}
      <section id="start-form" style={{ ...SECTION_PAD, background: TOKENS.warm }}>
        <div style={MAX_W_NARROW}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <p style={SECTION_LABEL}>Get Started</p>
            <h2 style={SECTION_H2}>지금 바로 시작해보세요</h2>
            <p
              style={{
                fontSize: 14,
                color: TOKENS.subtext,
                marginTop: 12,
                fontFamily: TOKENS.sans,
                fontWeight: 300,
                lineHeight: 1.6,
              }}
            >
              책 제목과 지은이를 입력하고 이야기를 시작합니다.
            </p>
          </div>

          {/* 재방문자 이어쓰기 */}
          {hasSaved && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={handleContinue}
                className="cta-btn"
                style={{
                  width: '100%',
                  padding: 18,
                  background: TOKENS.dark,
                  color: '#FAFAF9',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontFamily: TOKENS.sans,
                  fontWeight: 500,
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(26,24,22,0.15)',
                }}
              >
                이전에 작성하던 책 이어쓰기 →
              </button>
              <p style={{ textAlign: 'center', fontSize: 12, color: TOKENS.muted, marginTop: 10, fontFamily: TOKENS.sans }}>
                또는 아래에서 새 책을 시작하세요
              </p>
            </div>
          )}

          {/* DB 복원 배너 */}
          {!hasSaved && dbBook && !isCheckingDb && (
            <div
              style={{
                background: '#FFF',
                border: `1px solid ${TOKENS.accentBorder}`,
                borderRadius: 16,
                padding: '20px 24px',
                marginBottom: 16,
              }}
            >
              <p style={{ fontSize: 12, fontFamily: TOKENS.sans, color: TOKENS.muted, marginBottom: 6, letterSpacing: 0.5 }}>
                ☁️ 저장된 이전 작업이 있습니다
              </p>
              <p style={{ fontSize: 16, fontFamily: TOKENS.serif, color: TOKENS.text, marginBottom: 16, fontWeight: 400 }}>
                {dbBook.title}
                {dbBook.author && (
                  <span style={{ color: TOKENS.muted, fontWeight: 300, fontSize: 14 }}> — {dbBook.author}</span>
                )}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleRestoreFromDb}
                  disabled={isRestoring}
                  style={{
                    flex: 1, padding: '11px 0',
                    background: TOKENS.dark, color: '#FAFAF9',
                    border: 'none', borderRadius: 8,
                    fontSize: 13, fontFamily: TOKENS.sans,
                    cursor: isRestoring ? 'wait' : 'pointer', fontWeight: 500,
                  }}
                >
                  {isRestoring ? '불러오는 중…' : '불러오기'}
                </button>
                <button
                  onClick={handleDismissDb}
                  style={{
                    flex: 1, padding: '11px 0',
                    background: 'transparent', color: TOKENS.muted,
                    border: `1px solid ${TOKENS.border}`, borderRadius: 8,
                    fontSize: 13, fontFamily: TOKENS.sans, cursor: 'pointer',
                  }}
                >
                  새로 시작
                </button>
              </div>
            </div>
          )}

          {/* 폼 카드 */}
          <div
            style={{
              background: '#FFF',
              borderRadius: 20,
              padding: '32px 28px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
              border: `1px solid ${TOKENS.borderLight}`,
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: 10,
                color: TOKENS.muted,
                marginBottom: 8,
                fontFamily: TOKENS.sans,
                letterSpacing: 2.5,
                textTransform: 'uppercase',
              }}
            >
              책 제목
            </label>
            <input
              value={title}
              onChange={(e) => setTitleLocal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleStart(); }}
              placeholder="나의 이야기"
              aria-label="책 제목"
              style={{
                width: '100%',
                padding: '14px 16px',
                border: `1.5px solid ${TOKENS.border}`,
                borderRadius: 10,
                fontSize: 16,
                fontFamily: TOKENS.serif,
                outline: 'none',
                background: TOKENS.bg,
                color: TOKENS.text,
                marginBottom: 20,
                boxSizing: 'border-box',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            />

            <label
              style={{
                display: 'block',
                fontSize: 10,
                color: TOKENS.muted,
                marginBottom: 8,
                fontFamily: TOKENS.sans,
                letterSpacing: 2.5,
                textTransform: 'uppercase',
              }}
            >
              지은이
            </label>
            <input
              value={author}
              onChange={(e) => setAuthorLocal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleStart(); }}
              placeholder="홍길동"
              aria-label="지은이"
              style={{
                width: '100%',
                padding: '14px 16px',
                border: `1.5px solid ${TOKENS.border}`,
                borderRadius: 10,
                fontSize: 16,
                fontFamily: TOKENS.serif,
                outline: 'none',
                background: TOKENS.bg,
                color: TOKENS.text,
                boxSizing: 'border-box',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            />
          </div>

          {/* 로그인 안내 (비로그인) */}
          {status !== 'loading' && !isLoggedIn && (
            <div
              style={{
                marginTop: 12,
                padding: '13px 18px',
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 13, fontFamily: TOKENS.sans, color: '#1D4ED8', lineHeight: 1.4, wordBreak: 'keep-all' }}>
                ☁️ 로그인하면 작성 내용이 클라우드에 저장됩니다
              </span>
              <button
                onClick={() => router.push('/login?callbackUrl=%2F')}
                style={{
                  background: '#2563EB',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 12,
                  fontFamily: TOKENS.sans,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                로그인
              </button>
            </div>
          )}

          {/* 시작하기 버튼 */}
          <button
            onClick={handleStart}
            className="cta-btn"
            style={{
              width: '100%',
              padding: 18,
              background: TOKENS.dark,
              color: '#FAFAF9',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontFamily: TOKENS.sans,
              fontWeight: 500,
              cursor: 'pointer',
              marginTop: 12,
              boxShadow: '0 4px 20px rgba(26,24,22,0.15)',
              letterSpacing: '0.01em',
            }}
          >
            시작하기 →
          </button>

          {/* 보관함 링크 (로그인+책 없음) */}
          {isLoggedIn && !hasSaved && !dbBook && (
            <p style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                onClick={() => router.push('/my')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: TOKENS.accent,
                  fontSize: 13,
                  fontFamily: TOKENS.sans,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                내 책 보관함 바로가기
              </button>
            </p>
          )}
        </div>
      </section>

      {/* ━━━━━━━━ SECTION 6 — FAQ ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ ...SECTION_PAD, background: '#FFF' }}>
        <div style={{ ...MAX_W, maxWidth: 660 }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={SECTION_LABEL}>FAQ</p>
            <h2 style={SECTION_H2}>자주 묻는 질문</h2>
          </div>

          <div style={{ borderTop: `1px solid ${TOKENS.border}` }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ borderBottom: `1px solid ${TOKENS.border}` }}>
                <button
                  className="faq-btn"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '22px 12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    gap: 20,
                    borderRadius: 6,
                    transition: 'background 0.15s',
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      fontFamily: TOKENS.serif,
                      color: TOKENS.text,
                      fontWeight: 400,
                      wordBreak: 'keep-all',
                      lineHeight: 1.5,
                    }}
                  >
                    {faq.q}
                  </span>
                  <span
                    style={{
                      fontSize: 22,
                      color: openFaq === i ? TOKENS.accent : TOKENS.light,
                      flexShrink: 0,
                      lineHeight: 1,
                      transform: openFaq === i ? 'rotate(45deg)' : 'none',
                      transition: 'transform 0.25s, color 0.25s',
                      display: 'inline-block',
                    }}
                  >
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <div className="faq-answer" style={{ padding: '0 12px 24px' }}>
                    <p
                      style={{
                        fontSize: 14,
                        color: TOKENS.subtext,
                        lineHeight: 1.85,
                        fontFamily: TOKENS.sans,
                        wordBreak: 'keep-all',
                        fontWeight: 300,
                      }}
                    >
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer style={{ background: TOKENS.dark, padding: '56px 24px 44px', textAlign: 'center' }}>
        <div style={MAX_W}>
          {/* 장식선 */}
          <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.15)', margin: '0 auto 28px' }} />

          <p
            style={{
              fontFamily: TOKENS.serif,
              fontSize: 22,
              fontWeight: 300,
              color: '#FAFAF9',
              letterSpacing: '-0.02em',
              marginBottom: 8,
            }}
          >
            나의이야기
          </p>
          <p
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.35)',
              marginBottom: 32,
              letterSpacing: 1,
              fontFamily: TOKENS.sans,
              fontWeight: 300,
            }}
          >
            당신의 삶이 한 권의 책이 됩니다
          </p>

          <div style={{ display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['개인정보처리방침', '이용약관', '문의하기'].map((link) => (
              <span
                key={link}
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  fontFamily: TOKENS.sans,
                  fontWeight: 300,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => ((e.target as HTMLSpanElement).style.color = 'rgba(255,255,255,0.6)')}
                onMouseLeave={(e) => ((e.target as HTMLSpanElement).style.color = 'rgba(255,255,255,0.3)')}
              >
                {link}
              </span>
            ))}
          </div>

          <p
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.18)',
              marginTop: 28,
              fontFamily: TOKENS.sans,
              fontWeight: 300,
            }}
          >
            © 2026 나의이야기. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
