import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function checkAuth(req: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return req.headers.get('x-admin-password') === adminPassword;
}

/**
 * POST /api/admin/migrate-photos
 * base64 URL로 저장된 사진을 Cloudinary로 일괄 마이그레이션
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const supabase = createServerClient();

  // base64 데이터 URI로 저장된 사진 조회
  const { data: photos, error } = await supabase
    .from('photos')
    .select('id, url, caption')
    .like('url', 'data:%');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const toMigrate = (photos ?? []) as { id: string; url: string; caption: string }[];

  if (toMigrate.length === 0) {
    return NextResponse.json({ migrated: 0, failed: 0, message: '마이그레이션할 사진이 없습니다' });
  }

  let migrated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const photo of toMigrate) {
    try {
      const result = await cloudinary.uploader.upload(photo.url, {
        folder: 'mystory',
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      });

      const { error: updateError } = await supabase
        .from('photos')
        .update({ url: result.secure_url })
        .eq('id', photo.id);

      if (updateError) throw new Error(updateError.message);
      migrated++;
    } catch (e) {
      failed++;
      errors.push(`photo ${photo.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({
    migrated,
    failed,
    total: toMigrate.length,
    errors: errors.slice(0, 10), // 최대 10개 오류만 반환
    message: `${migrated}개 마이그레이션 완료, ${failed}개 실패`,
  });
}

/**
 * GET /api/admin/migrate-photos
 * base64 사진 개수 확인 (dry-run)
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const supabase = createServerClient();

  const { count, error } = await supabase
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .like('url', 'data:%');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pendingCount: count ?? 0 });
}
