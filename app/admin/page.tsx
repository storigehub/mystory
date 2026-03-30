'use client';

import { useState } from 'react';
import { TOKENS } from '@/lib/design-tokens';

interface BookRow {
  id: string;
  title: string;
  author: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  is_public: boolean;
}

interface UserRow {
  userId: string;
  bookCount: number;
  publicBookCount: number;
  firstSeen: string;
  lastActive: string;
  books: { id: string; title: string }[];
}

interface Stats {
  totalBooks: number;
  publicBooks: number;
  newBooksThisWeek: number;
  totalUsers: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

const card: React.CSSProperties = {
  background: TOKENS.card,
  border: `1px solid ${TOKENS.borderLight}`,
  borderRadius: 12,
  padding: '20px 24px',
};

const labelSt: React.CSSProperties = {
  fontSize: 11,
  fontFamily: TOKENS.sans,
  color: TOKENS.muted,
  letterSpacing: 2,
  display: 'block',
  marginBottom: 6,
};

const inputSt: React.CSSProperties = {
  padding: '10px 12px',
  border: `1px solid ${TOKENS.border}`,
  borderRadius: TOKENS.radiusSm,
  fontFamily: TOKENS.sans,
  fontSize: 14,
  background: TOKENS.card,
  color: TOKENS.text,
  outline: 'none',
};

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [books, setBooks] = useState<BookRow[]>([]);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [activeTab, setActiveTab] = useState<'books' | 'users'>('books');

  const [migrateCount, setMigrateCount] = useState<number | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);

  const [openaiStatus, setOpenaiStatus] = useState<{
    status: 'ok' | 'invalid' | 'no_key' | 'loading';
    model?: string;
    maskedKey?: string | null;
    usage?: { totalCost: number; currency: string; startDate: string; endDate: string } | null;
    balance?: { available: number; currency: string } | null;
  }>({ status: 'loading' });

  const fetchDashboard = async (pw: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-password': pw },
      });
      if (!res.ok) {
        setAuthError('비밀번호가 올바르지 않습니다');
        return;
      }
      const data = await res.json();
      setStats(data.stats);
      setBooks(data.books ?? []);
      setAuthed(true);
      setAuthError('');
      // 사용자 목록 로드
      fetch('/api/admin/users', { headers: { 'x-admin-password': pw } })
        .then((r) => r.json())
        .then((d) => setUsers(d.users ?? []))
        .catch(() => {});
      // 마이그레이션 대기 사진 수 확인
      fetch('/api/admin/migrate-photos', { headers: { 'x-admin-password': pw } })
        .then((r) => r.json())
        .then((d) => setMigrateCount(d.pendingCount ?? 0))
        .catch(() => {});
      // OpenAI 사용량 조회
      fetch('/api/admin/openai-usage', { headers: { 'x-admin-password': pw } })
        .then((r) => r.json())
        .then((d) => setOpenaiStatus(d))
        .catch(() => setOpenaiStatus({ status: 'invalid' }));
    } catch {
      setAuthError('서버 오류');
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    setMigrating(true);
    setMigrateResult(null);
    try {
      const res = await fetch('/api/admin/migrate-photos', {
        method: 'POST',
        headers: { 'x-admin-password': password },
      });
      const data = await res.json();
      setMigrateResult(data.message || '완료');
      setMigrateCount(data.failed ?? 0);
    } catch {
      setMigrateResult('오류가 발생했습니다');
    } finally {
      setMigrating(false);
    }
  };

  if (!authed) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: TOKENS.bg }}>
        <div style={{ ...card, width: '100%', maxWidth: 360 }}>
          <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4, fontFamily: TOKENS.serif }}>관리자 대시보드</h1>
          <p style={{ fontSize: 13, color: TOKENS.muted, fontFamily: TOKENS.sans, marginBottom: 24 }}>
            관리자 비밀번호를 입력하세요
          </p>
          <form onSubmit={(e) => { e.preventDefault(); fetchDashboard(password); }}>
            <label style={labelSt}>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputSt, width: '100%', boxSizing: 'border-box', marginBottom: 12 }}
              autoFocus
            />
            {authError && (
              <p style={{ color: '#c0392b', fontSize: 13, fontFamily: TOKENS.sans, marginBottom: 8 }}>{authError}</p>
            )}
            <button
              type="submit"
              disabled={loading || !password}
              style={{
                width: '100%', padding: '12px 0',
                background: TOKENS.dark, color: '#FAFAF9',
                border: 'none', borderRadius: TOKENS.radiusSm,
                fontSize: 14, fontFamily: TOKENS.sans,
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? '확인 중…' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filtered = books.filter((b) => {
    const q = search.toLowerCase();
    return !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
  });

  return (
    <div style={{ minHeight: '100dvh', background: TOKENS.bg, padding: '2rem 1.25rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 400, fontFamily: TOKENS.serif, margin: 0 }}>관리자 대시보드</h1>
          <div style={{ flex: 1 }} />
          <a
            href="/admin/landing"
            style={{
              padding: '8px 16px', borderRadius: TOKENS.radiusSm,
              border: `1px solid ${TOKENS.border}`,
              fontSize: 13, fontFamily: TOKENS.sans, color: TOKENS.text,
              textDecoration: 'none', background: TOKENS.card,
            }}
          >
            🎨 랜딩 관리
          </a>
          <a
            href="/admin/settings"
            style={{
              padding: '8px 16px', borderRadius: TOKENS.radiusSm,
              border: `1px solid ${TOKENS.border}`,
              fontSize: 13, fontFamily: TOKENS.sans, color: TOKENS.text,
              textDecoration: 'none', background: TOKENS.card,
            }}
          >
            ⚙ STT 설정
          </a>
          <a
            href="/"
            style={{ fontSize: 13, color: TOKENS.muted, fontFamily: TOKENS.sans, textDecoration: 'none' }}
          >
            ← 홈
          </a>
        </div>

        {/* 통계 카드 */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 28 }}>
            {[
              { label: '총 책', value: stats.totalBooks, color: TOKENS.dark },
              { label: '공개 책', value: stats.publicBooks, color: '#7C3AED' },
              { label: '이번 주 신규', value: stats.newBooksThisWeek, color: '#16a34a' },
              { label: '가입 사용자', value: stats.totalUsers, color: '#ea580c' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11, fontFamily: TOKENS.sans, color: TOKENS.muted, letterSpacing: 2 }}>
                  {label}
                </span>
                <span style={{ fontSize: 32, fontWeight: 600, fontFamily: TOKENS.serif, color }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* OpenAI 상태 */}
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, fontFamily: TOKENS.sans, color: TOKENS.text, margin: '0 0 2px' }}>
                OpenAI API 상태
              </p>
              <p style={{ fontSize: 12, color: TOKENS.muted, fontFamily: TOKENS.sans, margin: 0 }}>
                {openaiStatus.maskedKey || '키 없음'} &nbsp;|&nbsp; 모델: {openaiStatus.model || '-'}
              </p>
            </div>
            <div style={{ flex: 1 }} />
            <span style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20, fontFamily: TOKENS.sans,
              background: openaiStatus.status === 'ok' ? '#F0FDF4' : openaiStatus.status === 'loading' ? TOKENS.warm : '#FEF2F2',
              color: openaiStatus.status === 'ok' ? '#16a34a' : openaiStatus.status === 'loading' ? TOKENS.muted : '#c0392b',
              border: `1px solid ${openaiStatus.status === 'ok' ? '#bbf7d0' : openaiStatus.status === 'loading' ? TOKENS.borderLight : '#fecaca'}`,
            }}>
              {openaiStatus.status === 'ok' ? '연결됨' : openaiStatus.status === 'loading' ? '확인 중…' : openaiStatus.status === 'no_key' ? '키 없음' : '연결 실패'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <div style={{ background: TOKENS.warm, borderRadius: 8, padding: '12px 16px' }}>
              <p style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, letterSpacing: 1, margin: '0 0 4px' }}>이번 달 사용 비용</p>
              <p style={{ fontSize: 22, fontWeight: 600, fontFamily: TOKENS.serif, color: TOKENS.text, margin: 0 }}>
                {openaiStatus.usage != null
                  ? `$${openaiStatus.usage.totalCost.toFixed(2)}`
                  : openaiStatus.status === 'loading' ? '…' : '조회 불가'}
              </p>
              {openaiStatus.usage && (
                <p style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, margin: '2px 0 0' }}>
                  {openaiStatus.usage.startDate} ~ {openaiStatus.usage.endDate}
                </p>
              )}
            </div>
            <div style={{ background: TOKENS.warm, borderRadius: 8, padding: '12px 16px' }}>
              <p style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, letterSpacing: 1, margin: '0 0 4px' }}>월 한도</p>
              <p style={{ fontSize: 22, fontWeight: 600, fontFamily: TOKENS.serif, color: TOKENS.text, margin: 0 }}>
                {openaiStatus.balance != null
                  ? `$${openaiStatus.balance.available.toFixed(0)}`
                  : openaiStatus.status === 'loading' ? '…' : '조회 불가'}
              </p>
              <p style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, margin: '2px 0 0' }}>hard limit</p>
            </div>
            <div style={{ background: TOKENS.warm, borderRadius: 8, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 11, color: TOKENS.muted, fontFamily: TOKENS.sans, letterSpacing: 1, margin: '0 0 8px' }}>관리 바로가기</p>
              <a
                href="https://platform.openai.com/usage"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: '#7C3AED', textDecoration: 'none', fontFamily: TOKENS.sans }}
              >
                사용량 대시보드 ↗
              </a>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: TOKENS.accent, textDecoration: 'none', fontFamily: TOKENS.sans, marginTop: 4 }}
              >
                API 키 관리 ↗
              </a>
            </div>
          </div>
        </div>

        {/* 사진 마이그레이션 */}
        {migrateCount !== null && (
          <div style={{ ...card, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, fontFamily: TOKENS.sans, color: TOKENS.text, margin: '0 0 2px' }}>
                Cloudinary 사진 마이그레이션
              </p>
              <p style={{ fontSize: 12, color: TOKENS.muted, fontFamily: TOKENS.sans, margin: 0 }}>
                base64로 저장된 사진 {migrateCount}개를 Cloudinary URL로 변환합니다
              </p>
            </div>
            <div style={{ flex: 1 }} />
            {migrateResult && (
              <span style={{ fontSize: 12, color: migrateResult.includes('실패') ? '#c0392b' : '#16a34a', fontFamily: TOKENS.sans }}>
                {migrateResult}
              </span>
            )}
            <button
              onClick={runMigration}
              disabled={migrating || migrateCount === 0}
              style={{
                padding: '8px 18px', borderRadius: TOKENS.radiusSm,
                background: migrateCount === 0 ? TOKENS.borderLight : TOKENS.dark,
                color: migrateCount === 0 ? TOKENS.muted : '#FAFAF9',
                border: 'none', fontSize: 13, fontFamily: TOKENS.sans,
                cursor: migrating || migrateCount === 0 ? 'not-allowed' : 'pointer',
                flexShrink: 0,
              }}
            >
              {migrating ? '마이그레이션 중…' : migrateCount === 0 ? '완료' : `${migrateCount}개 마이그레이션`}
            </button>
          </div>
        )}

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {(['books', 'users'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 18px', borderRadius: 8,
                background: activeTab === tab ? TOKENS.dark : TOKENS.card,
                color: activeTab === tab ? '#FAFAF9' : TOKENS.subtext,
                fontFamily: TOKENS.sans, fontSize: 13, cursor: 'pointer',
                border: activeTab === tab ? 'none' : `1px solid ${TOKENS.border}`,
              }}
            >
              {tab === 'books' ? `책 목록 (${books.length})` : `사용자 (${users.length})`}
            </button>
          ))}
        </div>

        {/* 책 목록 */}
        {activeTab === 'books' && <div style={{ ...card }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, letterSpacing: 2, color: TOKENS.muted, fontFamily: TOKENS.sans, margin: 0 }}>
              전체 책 목록
            </h2>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="제목 / 저자 검색…"
              style={{ ...inputSt, marginLeft: 'auto', width: 200, fontSize: 13, padding: '7px 12px' }}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: TOKENS.sans, fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${TOKENS.borderLight}` }}>
                  {['제목', '저자', '공개', '생성일', '최근 수정', '바로가기'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '8px 12px', textAlign: 'left',
                        color: TOKENS.muted, fontWeight: 500, whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: TOKENS.muted }}>
                      {search ? '검색 결과 없음' : '책이 없습니다'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((book) => (
                    <tr
                      key={book.id}
                      style={{ borderBottom: `1px solid ${TOKENS.borderLight}` }}
                    >
                      <td style={{ padding: '10px 12px', maxWidth: 200 }}>
                        <span style={{ fontFamily: TOKENS.serif, color: TOKENS.text, fontSize: 14 }}>
                          {book.title || '(제목 없음)'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: TOKENS.subtext }}>
                        {book.author || '-'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 20,
                            background: book.is_public ? '#F0FDF4' : TOKENS.warm,
                            color: book.is_public ? '#16a34a' : TOKENS.muted,
                            border: `1px solid ${book.is_public ? '#bbf7d0' : TOKENS.borderLight}`,
                          }}
                        >
                          {book.is_public ? '공개' : '비공개'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: TOKENS.muted, whiteSpace: 'nowrap' }}>
                        {formatDate(book.created_at)}
                      </td>
                      <td style={{ padding: '10px 12px', color: TOKENS.muted, whiteSpace: 'nowrap' }}>
                        {formatDate(book.updated_at)}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <a
                          href={`/shared/${book.id}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 12, color: TOKENS.accent, textDecoration: 'none' }}
                        >
                          열기 ↗
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <p style={{ fontSize: 12, color: TOKENS.muted, fontFamily: TOKENS.sans, marginTop: 12, textAlign: 'right' }}>
              {filtered.length}권 표시
            </p>
          )}
        </div>}

        {/* 사용자 목록 */}
        {activeTab === 'users' && <div style={{ ...card }}>
          <h2 style={{ fontSize: 13, letterSpacing: 2, color: TOKENS.muted, fontFamily: TOKENS.sans, margin: '0 0 16px' }}>
            사용자 현황
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: TOKENS.sans, fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${TOKENS.borderLight}` }}>
                  {['사용자 ID', '책 수', '공개', '첫 가입', '마지막 활동', '작품 목록'].map((h) => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: TOKENS.muted, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: TOKENS.muted }}>
                      사용자 없음
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.userId} style={{ borderBottom: `1px solid ${TOKENS.borderLight}` }}>
                      <td style={{ padding: '10px 12px', maxWidth: 180 }}>
                        <span style={{ fontSize: 11, color: TOKENS.subtext, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {u.userId.slice(0, 20)}…
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: TOKENS.text }}>
                        {u.bookCount}
                      </td>
                      <td style={{ padding: '10px 12px', color: u.publicBookCount > 0 ? '#16a34a' : TOKENS.muted }}>
                        {u.publicBookCount}
                      </td>
                      <td style={{ padding: '10px 12px', color: TOKENS.muted, whiteSpace: 'nowrap' }}>
                        {formatDate(u.firstSeen)}
                      </td>
                      <td style={{ padding: '10px 12px', color: TOKENS.muted, whiteSpace: 'nowrap' }}>
                        {formatDate(u.lastActive)}
                      </td>
                      <td style={{ padding: '10px 12px', maxWidth: 200 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {u.books.slice(0, 3).map((b) => (
                            <a
                              key={b.id}
                              href={`/shared/${b.id}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: 11, color: TOKENS.accent, textDecoration: 'none', background: TOKENS.accentBg, padding: '2px 6px', borderRadius: 4 }}
                            >
                              {b.title.slice(0, 10)}{b.title.length > 10 ? '…' : ''}
                            </a>
                          ))}
                          {u.books.length > 3 && (
                            <span style={{ fontSize: 11, color: TOKENS.muted }}>+{u.books.length - 3}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: TOKENS.muted, fontFamily: TOKENS.sans, marginTop: 12, textAlign: 'right' }}>
            총 {users.length}명의 회원이 책을 작성했습니다
          </p>
        </div>}

      </div>
    </div>
  );
}
