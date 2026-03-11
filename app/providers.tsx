'use client';

import { SessionProvider } from 'next-auth/react';
import { BookProvider } from '@/lib/book-context';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <BookProvider>{children}</BookProvider>
    </SessionProvider>
  );
}
