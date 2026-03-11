import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import KakaoProvider from 'next-auth/providers/kakao';
import CredentialsProvider from 'next-auth/providers/credentials';

/**
 * NextAuth.js 설정
 *
 * 지원 로그인:
 * - Google OAuth
 * - Kakao OAuth (국내 어르신 사용자 고려)
 * - 이메일/비밀번호 (MVP: 간단한 credentials)
 *
 * 환경변수 (.env.local):
 *   GOOGLE_CLIENT_ID=...
 *   GOOGLE_CLIENT_SECRET=...
 *   KAKAO_CLIENT_ID=...
 *   KAKAO_CLIENT_SECRET=...
 *   NEXTAUTH_SECRET=<랜덤 문자열>
 *   NEXTAUTH_URL=http://localhost:3000
 */
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',

  providers: [
    // Google 로그인
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),

    // 카카오 로그인
    ...(process.env.KAKAO_CLIENT_ID
      ? [
          KakaoProvider({
            clientId: process.env.KAKAO_CLIENT_ID!,
            clientSecret: process.env.KAKAO_CLIENT_SECRET!,
          }),
        ]
      : []),

    // 개발용 간단 로그인 (프로덕션에서는 제거)
    CredentialsProvider({
      name: '이메일로 시작하기',
      credentials: {
        email: { label: '이메일', type: 'email', placeholder: 'example@email.com' },
        name: { label: '이름 (선택)', type: 'text', placeholder: '홍길동' },
      },
      async authorize(credentials) {
        // MVP: 이메일만 있으면 로그인 허용 (비밀번호 없음)
        // 프로덕션에서는 DB 조회 + 비밀번호 검증 필요
        if (!credentials?.email) return null;

        return {
          id: credentials.email,
          email: credentials.email,
          name: credentials.name || credentials.email.split('@')[0],
        };
      },
    }),
  ],

  pages: {
    signIn: '/login',        // 커스텀 로그인 페이지
    error: '/login',         // 에러 시 로그인 페이지로
  },

  callbacks: {
    async session({ session, token }) {
      // 세션에 사용자 ID 추가
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30일
  },
};
