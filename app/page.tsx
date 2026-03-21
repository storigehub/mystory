import { createClient } from '@supabase/supabase-js';
import LandingClient from '@/components/LandingClient';
import type { LandingConfig } from '@/components/LandingClient';

/* ── ISR: 1시간 기본 캐시 + 관리자 저장 시 온디맨드 재검증 ── */
export const revalidate = 3600;

async function getLandingConfig(): Promise<LandingConfig | null> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;

    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from('site_config')
      .select('data')
      .eq('id', 'landing')
      .single();

    if (error || !data?.data) return null;
    return data.data as LandingConfig;
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const config = await getLandingConfig();
  return <LandingClient config={config} />;
}
