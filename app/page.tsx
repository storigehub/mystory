'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useBook } from '@/lib/book-context';
import { TOKENS } from '@/lib/design-tokens';

const OnboardingModal = dynamic(() => import('@/components/OnboardingModal'), { ssr: false, loading: () => null });

/* ─── 스크롤 reveal 훅 ──────────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-scale');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ─── 정적 데이터 ───────────────────────────────────────── */

const PILLARS = [
  {
    image: 'https://images.pexels.com/photos/5637842/pexels-photo-5637842.jpeg?auto=compress&cs=tinysrgb&w=900',
    fallback: '#7C6A5A',
    tag: '쉬운 대화',
    title: '말하듯 편하게,\nAI가 이끌어갑니다',
    desc: '글쓰기 실력은 필요 없습니다. AI가 질문하면 말씀하시듯 편하게 대답하기만 하면 됩니다.',
  },
  {
    image: 'https://images.pexels.com/photos/7626581/pexels-photo-7626581.jpeg?auto=compress&cs=tinysrgb&w=900',
    fallback: '#5A6A5A',
    tag: '아름다운 책',
    title: '이야기가 한 권의\n책이 됩니다',
    desc: '나누신 이야기가 아름답게 정리되어 언제든 다시 읽을 수 있는 책으로 완성됩니다.',
  },
  {
    image: 'https://images.pexels.com/photos/6691742/pexels-photo-6691742.jpeg?auto=compress&cs=tinysrgb&w=900',
    fallback: '#5A5A6A',
    tag: '가족과 공유',
    title: '소중한 이야기를\n가족과 나눕니다',
    desc: '링크 하나로 가족 모두가 읽을 수 있습니다. 멀리 사는 가족과도 함께 만들어갈 수 있어요.',
  },
];

const STEPS = [
  {
    n: '01', title: '주제 선택', label: 'Choose',
    desc: '탄생, 학창시절, 사랑, 인생 등 72가지 테마에서 내 이야기와 맞는 것을 골라보세요.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="5" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M9 10h10M9 14h7M9 18h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    n: '02', title: 'AI와 대화', label: 'Talk',
    desc: 'AI가 질문을 드리면 말씀하시듯 편하게 대답하세요. 음성으로도 이야기할 수 있어요.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M5 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-4l-4 4v-4H8a3 3 0 0 1-3-3V8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M10 12h8M10 15.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    n: '03', title: '책 완성', label: 'Finish',
    desc: '이야기가 아름다운 책으로 완성됩니다. PDF로 저장하고 가족과 함께 나눠보세요.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M7 4h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M10 4v20M5 9h5M5 13h5M5 17h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const SCENARIOS = [
  {
    image: 'https://images.pexels.com/photos/5637710/pexels-photo-5637710.jpeg?auto=compress&cs=tinysrgb&w=1200',
    fallback: '#8B7355',
    tag: '선물',
    title: '부모님께 드리는\n가장 특별한 선물',
    desc: '평생의 이야기를 한 권의 책으로.\n자녀가 드릴 수 있는 가장 따뜻한 선물입니다.',
    large: true,
  },
  {
    image: 'https://images.pexels.com/photos/8055130/pexels-photo-8055130.jpeg?auto=compress&cs=tinysrgb&w=800',
    fallback: '#6B7B6B',
    tag: '유산',
    title: '자녀에게 남기는\n소중한 이야기',
    desc: '내 삶의 지혜와 기억을 다음 세대에게.\n말로만 전하던 이야기를 영원히 남깁니다.',
  },
  {
    image: 'https://images.pexels.com/photos/5729053/pexels-photo-5729053.jpeg?auto=compress&cs=tinysrgb&w=800',
    fallback: '#7B6B8B',
    tag: '기억',
    title: '잊고 싶지 않은\n소중한 순간들',
    desc: '결혼, 육아, 여행의 기억들.\n함께한 시간이 책이 되어 영원히 남습니다.',
  },
  {
    image: 'https://images.pexels.com/photos/5637704/pexels-photo-5637704.jpeg?auto=compress&cs=tinysrgb&w=800',
    fallback: '#5B6B7B',
    tag: '역사',
    title: '우리 가족의\n역사를 기록합니다',
    desc: '뿌리와 이야기, 가족만의 문화까지.\n아름다운 책으로 대대로 전해집니다.',
  },
];

const FAQS = [
  { q: '글을 잘 못 써도 괜찮나요?', a: '전혀 문제없습니다. AI가 질문을 드리면 말하듯 편하게 대답만 하시면 됩니다. 별도의 글쓰기 실력이 필요하지 않아요.' },
  { q: 'AI가 이야기를 대신 써주나요?', a: 'AI는 기억을 이끌어내는 질문을 드리는 역할만 합니다. 이야기의 주인공은 언제나 본인이세요. 작성된 글은 어르신의 말투와 표현이 그대로 담깁니다.' },
  { q: '완성된 책은 어떻게 보존되나요?', a: '로그인하시면 클라우드에 안전하게 저장됩니다. PDF로 내려받거나 가족과 링크로 공유할 수 있습니다. 언제든지 다시 열어볼 수 있어요.' },
  { q: '가족과 어떻게 함께할 수 있나요?', a: '링크 하나로 가족 누구나 읽을 수 있습니다. 인터뷰어로 초대하면 가족이 직접 질문을 추가할 수도 있어요. 멀리 사는 가족과도 함께 만들어갈 수 있습니다.' },
];

/* ─── 공통 스타일 상수 ──────────────────────────────────── */
const MAX_W: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', width: '100%' };
const MAX_W_NARROW: React.CSSProperties = { maxWidth: 520, margin: '0 auto', width: '100%' };

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 10, letterSpacing: 4, color: '#A0522D',
  fontFamily: TOKENS.sans, marginBottom: 14,
  textTransform: 'uppercase' as const, fontWeight: 500,
};

const SECTION_H2: React.CSSProperties = {
  fontFamily: TOKENS.serif, fontSize: 'clamp(1.6rem, 4vw, 2.1rem)',
  fontWeight: 300, letterSpacing: '-0.03em', color: TOKENS.text,
  wordBreak: 'keep-all' as const, lineHeight: 1.25,
};

/* ─── 메인 컴포넌트 ─────────────────────────────────────── */
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

  useReveal();

  useEffect(() => { setHasSaved(state.chapters.length > 0); }, [state.chapters.length]);

  useEffect(() => {
    const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseConfigured || state.chapters.length > 0 || dbDismissed) return;
    setIsCheckingDb(true);
    fetch('/api/books')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { const b = data?.books?.[0] ?? data?.book ?? null; if (b) setDbBook(b); })
      .catch(() => {})
      .finally(() => setIsCheckingDb(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleStart = () => { setTitle(title); setAuthor(author); router.push('/select'); };
  const handleContinue = () => { if (state.chapters.length > 0) router.push('/write'); };
  const handleRestoreFromDb = async () => {
    if (!dbBook) return;
    setIsRestoring(true);
    const ok = await restoreFromDb(dbBook.id);
    setIsRestoring(false);
    if (ok) router.push('/write');
  };
  const handleDismissDb = () => { setDbBook(null); setDbDismissed(true); };
  const scrollToStart = () => document.getElementById('start-form')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div style={{ fontFamily: TOKENS.sans, color: TOKENS.text, background: '#FFF' }}>
      <OnboardingModal onClose={() => {}} onStart={scrollToStart} />

      {/* ━━━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
        background: scrolled ? 'rgba(250,250,248,0.94)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? `1px solid ${TOKENS.borderLight}` : '1px solid transparent',
        transition: 'background 0.4s, border-color 0.4s',
      }}>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontFamily: TOKENS.serif, fontSize: 18, fontWeight: 400,
          letterSpacing: '-0.025em', color: TOKENS.text,
        }}>
          나의이야기
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isLoggedIn ? (
            <button className="btn-outline-hover" onClick={() => router.push('/my')} style={{
              background: 'transparent', border: `1px solid ${TOKENS.border}`,
              borderRadius: 40, padding: '8px 20px', fontSize: 13, cursor: 'pointer',
              color: TOKENS.subtext, fontFamily: TOKENS.sans, fontWeight: 400,
            }}>내 책 보관함</button>
          ) : (
            <button className="cta-btn" onClick={() => router.push('/login?callbackUrl=%2F')} style={{
              background: TOKENS.dark, color: '#FAFAF9', border: 'none',
              borderRadius: 40, padding: '9px 22px', fontSize: 13, cursor: 'pointer',
              fontFamily: TOKENS.sans, fontWeight: 500, boxShadow: '0 2px 12px rgba(26,24,22,0.15)',
            }}>로그인</button>
          )}
        </div>
      </header>

      {/* ━━━━ SECTION 1 — HERO (좌우 분할) ━━━━━━━━━━━━━━━━ */}
      <section style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'stretch',
        background: 'linear-gradient(135deg, #FAFAF8 0%, #F0E9DF 100%)',
        paddingTop: 64, position: 'relative', overflow: 'hidden',
      }}>
        <div className="hero-split" style={{ ...MAX_W, display: 'flex', alignItems: 'center', padding: '0 32px' }}>

          {/* 좌: 텍스트 */}
          <div className="hero-text-col" style={{ flex: '1 1 480px', padding: '80px 48px 80px 0', minWidth: 0 }}>
            <div className="hero-content" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 1, background: '#A0522D', opacity: 0.6 }} />
                <span style={{ ...SECTION_LABEL, marginBottom: 0 }}>My Story</span>
              </div>
            </div>

            <h1 className="hero-content" style={{
              fontFamily: TOKENS.serif,
              fontSize: 'clamp(2.6rem, 6vw, 4.2rem)',
              fontWeight: 300, lineHeight: 1.15,
              letterSpacing: '-0.04em', color: '#1A1816',
              marginBottom: 28, wordBreak: 'keep-all',
            }}>
              당신의 삶이<br />
              <em style={{ fontStyle: 'normal', color: '#A0522D' }}>한 권의 책</em>이<br />
              됩니다
            </h1>

            <p className="hero-sub" style={{
              fontSize: 'clamp(0.95rem, 2vw, 1.05rem)', color: TOKENS.subtext,
              lineHeight: 2, maxWidth: 360, marginBottom: 44,
              wordBreak: 'keep-all', fontFamily: TOKENS.sans, fontWeight: 300,
            }}>
              소중한 기억을 AI와의 대화로 이야기하세요.<br />
              그 이야기가 가족과 함께할 책이 됩니다.
            </p>

            <div className="hero-cta" style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
              <button className="cta-btn" onClick={scrollToStart} style={{
                background: '#1A1816', color: '#FAFAF9', border: 'none',
                borderRadius: 40, padding: '17px 44px', fontSize: 15,
                fontFamily: TOKENS.sans, fontWeight: 500, cursor: 'pointer',
                letterSpacing: '0.01em', boxShadow: '0 8px 32px rgba(26,24,22,0.2)',
              }}>내 이야기 시작하기</button>

              {isLoggedIn && (
                <button onClick={() => router.push('/my')} style={{
                  background: 'transparent', color: TOKENS.subtext, border: 'none',
                  fontSize: 13, fontFamily: TOKENS.sans, cursor: 'pointer',
                  textDecoration: 'underline', textUnderlineOffset: 3, fontWeight: 400,
                }}>이전에 쓴 책 보러가기</button>
              )}
            </div>

            {/* 신뢰 지표 */}
            <div className="hero-cta" style={{
              marginTop: 56, display: 'flex', gap: 32, flexWrap: 'wrap',
            }}>
              {[
                { num: '72가지', label: '이야기 테마' },
                { num: '음성', label: '말하듯 입력' },
                { num: '무료', label: '지금 바로 시작' },
              ].map((stat) => (
                <div key={stat.num}>
                  <div style={{
                    fontFamily: TOKENS.serif, fontSize: 22, fontWeight: 300,
                    color: '#1A1816', letterSpacing: '-0.02em',
                  }}>{stat.num}</div>
                  <div style={{ fontSize: 11, color: TOKENS.muted, marginTop: 2, fontFamily: TOKENS.sans }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 우: 이미지 */}
          <div className="hero-img hero-split-img img-zoom" style={{
            flex: '1 1 420px', alignSelf: 'stretch',
            minHeight: 500, position: 'relative', borderRadius: '24px 0 0 24px',
            overflow: 'hidden', marginRight: -32,
            background: 'linear-gradient(160deg, #3D2B1F 0%, #1A1410 60%, #2A1A12 100%)',
          }}>
            <img
              src="https://images.pexels.com/photos/7363991/pexels-photo-7363991.jpeg?auto=compress&cs=tinysrgb&w=1200"
              alt="할머니와 손녀가 함께하는 따뜻한 순간"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.dataset.fallback) {
                  img.dataset.fallback = '1';
                  img.src = 'https://images.pexels.com/photos/5637704/pexels-photo-5637704.jpeg?auto=compress&cs=tinysrgb&w=1200';
                }
              }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.18) 40%, rgba(0,0,0,0.62) 100%)',
            }} />
            {/* 우하단 인용구 카드 */}
            <div className="hero-quote-card" style={{
              position: 'absolute', bottom: 32, left: 24, right: 24,
              background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
              borderRadius: 16, padding: '20px 24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}>
              <p style={{
                fontFamily: TOKENS.serif, fontSize: 15, fontWeight: 300,
                color: '#1A1816', lineHeight: 1.65, letterSpacing: '-0.01em',
                wordBreak: 'keep-all',
              }}>
                "내 이야기를 글로 남길 수 있을 거라<br />생각도 못 했는데, 정말 신기하네요."
              </p>
              <p style={{ fontSize: 11, color: TOKENS.muted, marginTop: 10, fontFamily: TOKENS.sans }}>
                — 김순자 님 (78세), 인천
              </p>
            </div>
          </div>
        </div>

        {/* 스크롤 힌트 */}
        <div style={{
          position: 'absolute', bottom: 28, left: '50%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          animation: 'scrollBounce 2.4s ease-in-out infinite',
        }}>
          <span style={{ fontSize: 9, letterSpacing: 3, color: TOKENS.muted, fontFamily: TOKENS.sans, textTransform: 'uppercase' }}>Scroll</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 8l5 5 5-5" stroke={TOKENS.muted} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ━━━━ DARK STATEMENT — LIVING ARCHIVE ━━━━━━━━━━━━━ */}
      <section style={{
        background: '#1A1816', padding: '120px 32px',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* 배경 그라데이션 광원 */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(160,82,45,0.1) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 50%, rgba(201,169,110,0.07) 0%, transparent 60%)',
        }} />

        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* 데코 라인 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 44 }}>
            <div style={{ width: 52, height: 1, background: 'rgba(201,169,110,0.4)' }} />
            <span style={{
              fontSize: 9, letterSpacing: 4.5, color: '#C9A96E',
              fontFamily: TOKENS.sans, fontWeight: 600, textTransform: 'uppercase',
            }}>Living Archive</span>
            <div style={{ width: 52, height: 1, background: 'rgba(201,169,110,0.4)' }} />
          </div>

          <h2 className="reveal" style={{
            fontFamily: TOKENS.serif,
            fontSize: 'clamp(2rem, 5.5vw, 3.4rem)',
            fontWeight: 200, color: '#FAFAF8',
            letterSpacing: '-0.04em', lineHeight: 1.25,
            marginBottom: 28, wordBreak: 'keep-all',
          }}>
            평범한 하루도,<br />잊혀질 기억도<br />
            <em style={{ fontStyle: 'normal', color: '#C9A96E' }}>모두 귀한 이야기입니다</em>
          </h2>

          <p className="reveal reveal-delay-1" style={{
            fontSize: 'clamp(14px, 2vw, 16px)', color: 'rgba(255,255,255,0.42)',
            fontFamily: TOKENS.sans, fontWeight: 300, lineHeight: 2,
            letterSpacing: '0.01em', wordBreak: 'keep-all',
          }}>
            지금 기록하지 않으면, 그 소중한 이야기는 영원히 사라집니다.<br />
            나의이야기가 도와드리겠습니다.
          </p>

          {/* 장식 */}
          <div className="reveal reveal-delay-2" style={{ marginTop: 52, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', border: '1px solid rgba(201,169,110,0.5)' }} />
            <div style={{ width: 48, height: 1, background: 'rgba(201,169,110,0.5)' }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A96E', opacity: 0.7 }} />
            <div style={{ width: 48, height: 1, background: 'rgba(201,169,110,0.5)' }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', border: '1px solid rgba(201,169,110,0.5)' }} />
          </div>
        </div>
      </section>

      {/* ━━━━ SECTION 2 — WHY (포토 카드) ━━━━━━━━━━━━━━━━━ */}
      <section style={{ padding: '100px 24px', background: '#FFF' }}>
        <div style={MAX_W}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={SECTION_LABEL}>Why Mystory</p>
            <h2 style={SECTION_H2}>이야기는 사라지지 않습니다</h2>
            <p style={{
              marginTop: 16, fontSize: 15, color: TOKENS.subtext, fontFamily: TOKENS.sans,
              fontWeight: 300, lineHeight: 1.8, wordBreak: 'keep-all',
            }}>
              우리 부모님의 이야기, 우리 가족의 역사 — 지금 기록하지 않으면 사라집니다.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
            {PILLARS.map((p, i) => (
              <div key={i} className={`card-hover img-zoom reveal reveal-delay-${i + 1}`} style={{
                flex: '1 1 280px', maxWidth: 340, borderRadius: 24,
                overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
                position: 'relative', minHeight: 460, background: p.fallback, cursor: 'default',
              }}>
                <img src={p.image} alt={p.tag} style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover', objectPosition: 'center',
                }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(170deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.16) 40%, rgba(0,0,0,0.78) 100%)',
                }} />
                <div style={{
                  position: 'absolute', top: 24, left: 24,
                  background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.28)', borderRadius: 40,
                  padding: '5px 15px', fontSize: 11, color: '#FFF',
                  fontFamily: TOKENS.sans, letterSpacing: 1.5, fontWeight: 500,
                }}>{p.tag}</div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '32px 28px 36px', color: '#FFF' }}>
                  <h3 style={{
                    fontFamily: TOKENS.serif, fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)',
                    fontWeight: 300, marginBottom: 12, letterSpacing: '-0.02em',
                    lineHeight: 1.35, whiteSpace: 'pre-line', wordBreak: 'keep-all',
                  }}>{p.title}</h3>
                  <p style={{
                    fontSize: 13.5, lineHeight: 1.8, color: 'rgba(255,255,255,0.82)',
                    fontFamily: TOKENS.sans, fontWeight: 300, wordBreak: 'keep-all',
                  }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━ SECTION 3 — HOW IT WORKS ━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ padding: '100px 24px', background: TOKENS.warm }}>
        <div style={MAX_W}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 80 }}>
            <p style={SECTION_LABEL}>How It Works</p>
            <h2 style={SECTION_H2}>이렇게 만들어집니다</h2>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0 }}>
            {STEPS.map((step, i) => (
              <div key={i} className={`reveal reveal-delay-${i + 1}`} style={{
                flex: '1 1 240px', maxWidth: 320,
                textAlign: 'center', padding: '0 40px 40px',
                position: 'relative',
              }}>
                {/* 워터마크 번호 */}
                <div style={{
                  position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 110, fontFamily: TOKENS.serif, fontWeight: 300,
                  color: 'rgba(26,24,22,0.04)', lineHeight: 1, pointerEvents: 'none',
                  userSelect: 'none', letterSpacing: '-0.04em', whiteSpace: 'nowrap',
                }}>{step.n}</div>

                {/* 아이콘 원 */}
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  border: `1.5px solid rgba(139,94,52,0.3)`,
                  background: '#FFF', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', margin: '0 auto 28px', position: 'relative',
                  zIndex: 1, color: '#A0522D',
                  boxShadow: '0 4px 20px rgba(160,82,45,0.1)',
                }}>{step.icon}</div>

                {/* 연결선 (마지막 제외) */}
                {i < 2 && (
                  <div style={{
                    position: 'absolute', top: 36, right: 0, left: '50%',
                    height: 1,
                    background: 'linear-gradient(90deg, rgba(160,82,45,0.2), rgba(160,82,45,0.05))',
                    zIndex: 0,
                  }} />
                )}

                <p style={{ fontSize: 9, letterSpacing: 3.5, color: '#A0522D', fontFamily: TOKENS.sans, textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>
                  {step.label}
                </p>
                <h3 style={{
                  fontFamily: TOKENS.serif, fontSize: 20, fontWeight: 400,
                  marginBottom: 14, color: TOKENS.text, letterSpacing: '-0.02em', lineHeight: 1.3,
                }}>{step.title}</h3>
                <p style={{
                  fontSize: 13.5, color: TOKENS.subtext, lineHeight: 1.95,
                  wordBreak: 'keep-all', fontFamily: TOKENS.sans, fontWeight: 300,
                }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━ SECTION 4 — FOR WHOM (비대칭 그리드) ━━━━━━━━━ */}
      <section style={{ padding: '100px 24px', background: '#FFF' }}>
        <div style={MAX_W}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={SECTION_LABEL}>For Whom</p>
            <h2 style={SECTION_H2}>이런 분들께 권합니다</h2>
          </div>

          {/* 비대칭 그리드: 왼쪽 큰 카드 + 오른쪽 3개 */}
          <div className="scenario-asymmetric" style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr',
            gridTemplateRows: 'auto auto',
            gap: 16,
          }}>
            {/* 대형 카드 */}
            <div className="card-hover img-zoom reveal" style={{
              gridRow: '1 / 3',
              borderRadius: 24, overflow: 'hidden',
              boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
              position: 'relative', minHeight: 520,
              background: SCENARIOS[0].fallback, cursor: 'default',
            }}>
              <img src={SCENARIOS[0].image} alt={SCENARIOS[0].tag} style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center 25%',
              }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.7) 100%)',
              }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '36px 36px 44px', color: '#FFF' }}>
                <span style={{
                  display: 'inline-block', background: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.28)',
                  borderRadius: 40, padding: '4px 14px', fontSize: 11,
                  letterSpacing: 1.5, fontFamily: TOKENS.sans, fontWeight: 500, marginBottom: 14,
                }}>{SCENARIOS[0].tag}</span>
                <h3 style={{
                  fontFamily: TOKENS.serif, fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)',
                  fontWeight: 300, marginBottom: 12, letterSpacing: '-0.025em',
                  lineHeight: 1.35, whiteSpace: 'pre-line', wordBreak: 'keep-all',
                }}>{SCENARIOS[0].title}</h3>
                <p style={{
                  fontSize: 14, lineHeight: 1.8, color: 'rgba(255,255,255,0.8)',
                  fontFamily: TOKENS.sans, fontWeight: 300, wordBreak: 'keep-all', whiteSpace: 'pre-line',
                }}>{SCENARIOS[0].desc}</p>
              </div>
            </div>

            {/* 오른쪽 3개 소형 카드 */}
            {SCENARIOS.slice(1).map((s, i) => (
              <div key={i} className={`card-hover img-zoom reveal reveal-delay-${i + 1}`} style={{
                borderRadius: 20, overflow: 'hidden',
                boxShadow: '0 6px 28px rgba(0,0,0,0.12)',
                position: 'relative', height: 160,
                background: s.fallback, cursor: 'default',
              }}>
                <img src={s.image} alt={s.tag} style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover', objectPosition: 'center 30%',
                }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(120deg, rgba(0,0,0,0.68) 0%, rgba(0,0,0,0.28) 100%)',
                }} />
                <div style={{ position: 'absolute', inset: 0, padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', color: '#FFF' }}>
                  <span style={{
                    display: 'inline-block', background: 'rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: 40, padding: '3px 11px', fontSize: 10,
                    letterSpacing: 1, fontFamily: TOKENS.sans, marginBottom: 8,
                  }}>{s.tag}</span>
                  <h3 style={{
                    fontFamily: TOKENS.serif, fontSize: 14, fontWeight: 300,
                    letterSpacing: '-0.015em', lineHeight: 1.4,
                    whiteSpace: 'pre-line', wordBreak: 'keep-all',
                  }}>{s.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━ SECTION 5 — START FORM ━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="start-form" style={{ padding: '100px 24px', background: TOKENS.warm }}>
        <div style={MAX_W_NARROW}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={SECTION_LABEL}>Get Started</p>
            <h2 style={SECTION_H2}>지금 바로 시작해보세요</h2>
            <p style={{
              fontSize: 14.5, color: TOKENS.subtext, marginTop: 14,
              fontFamily: TOKENS.sans, fontWeight: 300, lineHeight: 1.7, wordBreak: 'keep-all',
            }}>
              책 제목과 지은이를 입력하고 이야기를 시작합니다.<br />
              로그인 없이도 바로 쓸 수 있어요.
            </p>
          </div>

          {/* 재방문자 이어쓰기 */}
          {hasSaved && (
            <div className="reveal" style={{ marginBottom: 20 }}>
              <button onClick={handleContinue} className="cta-btn" style={{
                width: '100%', padding: '18px 0', background: '#1A1816', color: '#FAFAF9',
                border: 'none', borderRadius: 14, fontSize: 15, fontFamily: TOKENS.sans,
                fontWeight: 500, cursor: 'pointer', boxShadow: '0 6px 24px rgba(26,24,22,0.18)',
              }}>이전에 작성하던 책 이어쓰기 →</button>
              <p style={{ textAlign: 'center', fontSize: 12, color: TOKENS.muted, marginTop: 10, fontFamily: TOKENS.sans }}>
                또는 아래에서 새 책을 시작하세요
              </p>
            </div>
          )}

          {/* DB 복원 배너 */}
          {!hasSaved && dbBook && !isCheckingDb && (
            <div className="reveal" style={{
              background: '#FFF', border: `1px solid ${TOKENS.accentBorder}`,
              borderRadius: 18, padding: '22px 26px', marginBottom: 20,
            }}>
              <p style={{ fontSize: 11, fontFamily: TOKENS.sans, color: TOKENS.muted, marginBottom: 6, letterSpacing: 0.5 }}>
                저장된 이전 작업이 있습니다
              </p>
              <p style={{ fontSize: 17, fontFamily: TOKENS.serif, color: TOKENS.text, marginBottom: 18, fontWeight: 400 }}>
                {dbBook.title}
                {dbBook.author && <span style={{ color: TOKENS.muted, fontWeight: 300, fontSize: 14 }}> — {dbBook.author}</span>}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleRestoreFromDb} disabled={isRestoring} style={{
                  flex: 1, padding: '12px 0', background: '#1A1816', color: '#FAFAF9',
                  border: 'none', borderRadius: 10, fontSize: 13, fontFamily: TOKENS.sans,
                  cursor: isRestoring ? 'wait' : 'pointer', fontWeight: 500,
                }}>{isRestoring ? '불러오는 중…' : '불러오기'}</button>
                <button onClick={handleDismissDb} style={{
                  flex: 1, padding: '12px 0', background: 'transparent', color: TOKENS.muted,
                  border: `1px solid ${TOKENS.border}`, borderRadius: 10, fontSize: 13,
                  fontFamily: TOKENS.sans, cursor: 'pointer',
                }}>새로 시작</button>
              </div>
            </div>
          )}

          {/* 폼 카드 */}
          <div className="reveal" style={{
            background: '#FFF', borderRadius: 24, padding: '36px 32px',
            boxShadow: '0 12px 48px rgba(0,0,0,0.09)',
            border: `1px solid ${TOKENS.borderLight}`,
          }}>
            {['책 제목', '지은이'].map((label, i) => (
              <div key={label} style={{ marginBottom: i === 0 ? 24 : 0 }}>
                <label style={{
                  display: 'block', fontSize: 10, color: TOKENS.muted, marginBottom: 9,
                  fontFamily: TOKENS.sans, letterSpacing: 2.5, textTransform: 'uppercase',
                }}>{label}</label>
                <input
                  value={i === 0 ? title : author}
                  onChange={(e) => i === 0 ? setTitleLocal(e.target.value) : setAuthorLocal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleStart(); }}
                  placeholder={i === 0 ? '나의 이야기' : '홍길동'}
                  aria-label={label}
                  style={{
                    width: '100%', padding: '15px 18px',
                    border: `1.5px solid ${TOKENS.border}`, borderRadius: 12,
                    fontSize: 16, fontFamily: TOKENS.serif, outline: 'none',
                    background: TOKENS.bg, color: TOKENS.text, boxSizing: 'border-box',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                />
              </div>
            ))}
          </div>

          {/* 로그인 안내 */}
          {status !== 'loading' && !isLoggedIn && (
            <div className="reveal" style={{
              marginTop: 14, padding: '14px 20px',
              background: 'rgba(160,82,45,0.06)', border: '1px solid rgba(160,82,45,0.18)',
              borderRadius: 12, display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: 10,
            }}>
              <span style={{ fontSize: 13, fontFamily: TOKENS.sans, color: TOKENS.subtext, lineHeight: 1.4, wordBreak: 'keep-all' }}>
                로그인하면 내용이 클라우드에 저장됩니다
              </span>
              <button className="cta-btn" onClick={() => router.push('/login?callbackUrl=%2F')} style={{
                background: '#1A1816', color: '#FFF', border: 'none', borderRadius: 8,
                padding: '8px 16px', fontSize: 12, fontFamily: TOKENS.sans,
                fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}>로그인</button>
            </div>
          )}

          {/* 시작 버튼 */}
          <button onClick={handleStart} className="cta-btn reveal" style={{
            width: '100%', padding: '19px 0', background: '#1A1816', color: '#FAFAF9',
            border: 'none', borderRadius: 14, fontSize: 16, fontFamily: TOKENS.sans,
            fontWeight: 500, cursor: 'pointer', marginTop: 14,
            boxShadow: '0 6px 28px rgba(26,24,22,0.18)', letterSpacing: '0.01em',
          }}>시작하기 →</button>

          {isLoggedIn && !hasSaved && !dbBook && (
            <p style={{ textAlign: 'center', marginTop: 18 }}>
              <button onClick={() => router.push('/my')} style={{
                background: 'transparent', border: 'none', color: '#A0522D',
                fontSize: 13, fontFamily: TOKENS.sans, cursor: 'pointer',
                textDecoration: 'underline', textUnderlineOffset: 3,
              }}>내 책 보관함 바로가기</button>
            </p>
          )}
        </div>
      </section>

      {/* ━━━━ SECTION 6 — FAQ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ padding: '100px 24px', background: '#FFF' }}>
        <div style={{ ...MAX_W, maxWidth: 680 }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={SECTION_LABEL}>FAQ</p>
            <h2 style={SECTION_H2}>자주 묻는 질문</h2>
          </div>

          <div style={{ borderTop: `1px solid ${TOKENS.border}` }}>
            {FAQS.map((faq, i) => (
              <div key={i} className="reveal" style={{ borderBottom: `1px solid ${TOKENS.border}` }}>
                <button className="faq-btn" onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '24px 8px', background: 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left', gap: 20,
                  borderRadius: 6, transition: 'background 0.15s',
                }}>
                  <span style={{
                    fontSize: 15.5, fontFamily: TOKENS.serif, color: TOKENS.text,
                    fontWeight: 400, wordBreak: 'keep-all', lineHeight: 1.5,
                  }}>{faq.q}</span>
                  <span style={{
                    fontSize: 20, color: openFaq === i ? '#A0522D' : TOKENS.light,
                    flexShrink: 0, lineHeight: 1, fontWeight: 300,
                    transform: openFaq === i ? 'rotate(45deg)' : 'none',
                    transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), color 0.2s',
                    display: 'inline-block',
                  }}>+</span>
                </button>
                {openFaq === i && (
                  <div className="faq-answer" style={{ padding: '0 8px 28px' }}>
                    <p style={{
                      fontSize: 14.5, color: TOKENS.subtext, lineHeight: 1.9,
                      fontFamily: TOKENS.sans, wordBreak: 'keep-all', fontWeight: 300,
                    }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer style={{ background: '#1A1816', padding: '72px 24px 52px', textAlign: 'center' }}>
        <div style={MAX_W}>
          <p style={{
            fontFamily: TOKENS.serif, fontSize: 26, fontWeight: 300,
            color: '#FAFAF9', letterSpacing: '-0.03em', marginBottom: 10,
          }}>나의이야기</p>
          <p style={{
            fontSize: 13, color: 'rgba(255,255,255,0.38)', marginBottom: 44,
            letterSpacing: 0.5, fontFamily: TOKENS.sans, fontWeight: 300,
          }}>당신의 삶이 한 권의 책이 됩니다</p>

          {/* 구분선 */}
          <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.12)', margin: '0 auto 32px' }} />

          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['개인정보처리방침', '이용약관', '문의하기'].map((link) => (
              <span key={link} style={{
                fontSize: 12, color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
                fontFamily: TOKENS.sans, fontWeight: 300, transition: 'color 0.2s',
              }}
                onMouseEnter={(e) => ((e.target as HTMLSpanElement).style.color = 'rgba(255,255,255,0.65)')}
                onMouseLeave={(e) => ((e.target as HTMLSpanElement).style.color = 'rgba(255,255,255,0.3)')}
              >{link}</span>
            ))}
          </div>

          <p style={{
            fontSize: 11, color: 'rgba(255,255,255,0.16)', marginTop: 28,
            fontFamily: TOKENS.sans, fontWeight: 300,
          }}>© 2026 나의이야기. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
