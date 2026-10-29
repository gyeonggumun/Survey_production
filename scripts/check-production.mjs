const baseUrl = process.env.PRODUCTION_URL ?? 'https://survey-production.vercel.app';
const supabaseUrl = process.env.SUPABASE_URL ?? 'https://blhxyoloslthrdpiwfks.supabase.co';
const pageUrl = new URL('/auth', baseUrl);

async function check(url, label) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  } catch (error) {
    throw new Error(`${label}: ${error.cause?.code ?? error.message}`);
  }
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`);
  return response;
}

try {
  const page = await check(pageUrl, '로그인 페이지');
  const html = await page.text();
  if (!html.includes('id="root"')) throw new Error('로그인 페이지의 앱 루트가 없습니다.');

  const assetPath = html.match(/<script[^>]+src="([^"]+\.js)"/)?.[1];
  if (!assetPath) throw new Error('배포된 JavaScript 자산을 찾지 못했습니다.');
  await check(new URL(assetPath, page.url), 'JavaScript 자산');
  await check(new URL('/auth/v1/health', supabaseUrl), 'Supabase 인증 서비스');

  console.log(`배포 및 Supabase 접근 확인: ${page.url}`);
} catch (error) {
  console.error('배포 접근 점검 실패:', error.message);
  process.exitCode = 1;
}
