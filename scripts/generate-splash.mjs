/**
 * iOS PWA 스플래시 스크린 이미지 생성 스크립트
 * 기존 512x512 앱 아이콘을 활용하여 디바이스별 스플래시 PNG 생성
 *
 * 실행: node scripts/generate-splash.mjs
 */
import sharp from "sharp";
import { mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ICON_PATH = join(ROOT, "public/appIcons/playstore.png");
const OUTPUT_DIR = join(ROOT, "public/splash");
const BG_COLOR = "#ffffff";
// 아이콘은 스플래시 화면 너비의 25% 크기로 표시
const ICON_RATIO = 0.25;

// iOS 디바이스별 스플래시 사이즈 (portrait)
const SPLASH_SIZES = [
  { width: 640, height: 1136, label: "iPhone SE (1st)" },
  { width: 750, height: 1334, label: "iPhone 8" },
  { width: 1242, height: 2208, label: "iPhone 8 Plus" },
  { width: 1125, height: 2436, label: "iPhone X/XS/11 Pro" },
  { width: 828, height: 1792, label: "iPhone XR/11" },
  { width: 1242, height: 2688, label: "iPhone XS Max/11 Pro Max" },
  { width: 1080, height: 2340, label: "iPhone 12 mini/13 mini" },
  { width: 1170, height: 2532, label: "iPhone 12/13/14" },
  { width: 1284, height: 2778, label: "iPhone 12/13/14 Pro Max" },
  { width: 1179, height: 2556, label: "iPhone 14 Pro" },
  { width: 1290, height: 2796, label: "iPhone 14 Pro Max" },
  { width: 1206, height: 2622, label: "iPhone 15/16 Pro" },
  { width: 1320, height: 2868, label: "iPhone 15/16 Pro Max" },
  // iPad
  { width: 1536, height: 2048, label: "iPad Mini/Air" },
  { width: 1668, height: 2224, label: "iPad Pro 10.5" },
  { width: 1668, height: 2388, label: "iPad Pro 11" },
  { width: 2048, height: 2732, label: "iPad Pro 12.9" },
];

async function generateSplash() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  // 원본 아이콘 로드
  const iconBuffer = await sharp(ICON_PATH)
    .flatten({ background: BG_COLOR })
    .removeAlpha()
    .png()
    .toBuffer();

  console.log(`스플래시 이미지 생성 시작 (${SPLASH_SIZES.length}개)...\n`);

  for (const size of SPLASH_SIZES) {
    const iconSize = Math.round(size.width * ICON_RATIO);
    const left = Math.round((size.width - iconSize) / 2);
    const top = Math.round((size.height - iconSize) / 2);

    // 아이콘 리사이즈
    const resizedIcon = await sharp(iconBuffer)
      .resize(iconSize, iconSize, { fit: "contain", background: BG_COLOR })
      .flatten({ background: BG_COLOR })
      .removeAlpha()
      .png()
      .toBuffer();

    // 배경 생성 + 아이콘 합성
    const outputPath = join(OUTPUT_DIR, `apple-splash-${size.width}x${size.height}.png`);
    await sharp({
      create: {
        width: size.width,
        height: size.height,
        channels: 3,
        background: BG_COLOR,
      },
    })
      .composite([{ input: resizedIcon, left, top }])
      .flatten({ background: BG_COLOR })
      .removeAlpha()
      .png()
      .toFile(outputPath);

    console.log(`  ✓ ${size.width}x${size.height} — ${size.label}`);
  }

  console.log(`\n완료! ${SPLASH_SIZES.length}개 이미지 → public/splash/`);
}

generateSplash().catch((err) => {
  console.error("스플래시 생성 실패:", err);
  process.exit(1);
});
