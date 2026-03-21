/**
 * Canvas를 이용한 클라이언트 이미지 압축
 * Vercel Serverless Function의 4.5MB 요청 제한 대응
 */

const MAX_DIMENSION = 1920; // 최대 변의 길이 (px)
const TARGET_MAX_BYTES = 3 * 1024 * 1024; // 3MB 목표 (여유있게 4.5MB 미만)

export async function compressImage(file: File): Promise<File> {
  // 이미 충분히 작으면 그대로 반환
  if (file.size <= TARGET_MAX_BYTES && file.type === 'image/jpeg') return file;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // 크기 계산
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);

      // 품질을 낮춰가며 목표 크기 이하로 압축
      let quality = 0.85;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            if (blob.size <= TARGET_MAX_BYTES || quality <= 0.25) {
              resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
            } else {
              quality = Math.round((quality - 0.1) * 100) / 100;
              tryCompress();
            }
          },
          'image/jpeg',
          quality
        );
      };
      tryCompress();
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // 실패 시 원본 그대로
    };

    img.src = objectUrl;
  });
}
