import type { BookItem } from '../types';

function createBotanicalIllustrationDataUrl(variant: 'camellia' | 'iris' | 'citrus'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 760;
  canvas.height = 520;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Paper background
  ctx.fillStyle = '#fbf8f1';
  ctx.fillRect(0, 0, 760, 520);
  ctx.strokeStyle = '#d9cfb8';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 720, 480);

  if (variant === 'camellia') {
    // Rich emerald leaves & crimson camellia blossom
    const bg = ctx.createRadialGradient(380, 240, 20, 380, 240, 240);
    bg.addColorStop(0, '#fff2eb');
    bg.addColorStop(1, '#f4efe2');
    ctx.fillStyle = bg;
    ctx.fillRect(28, 28, 704, 464);

    // Leaves
    const leaves = [
      [250, 290, -0.5, '#1e7a4c'],
      [500, 280, 0.45, '#196940'],
      [310, 360, -0.2, '#28945d'],
      [460, 355, 0.3, '#1f7c4e'],
    ] as const;
    for (const [lx, ly, rot, col] of leaves) {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 0, 92, 42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a4e3be';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-75, 0);
      ctx.lineTo(75, 0);
      ctx.stroke();
      ctx.restore();
    }

    // Petals
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      ctx.save();
      ctx.translate(380 + Math.cos(ang) * 58, 225 + Math.sin(ang) * 58);
      ctx.rotate(ang);
      ctx.fillStyle = i % 2 === 0 ? '#e62e45' : '#ff4d63';
      ctx.beginPath();
      ctx.arc(0, 0, 56, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#ff7084';
    ctx.beginPath();
    ctx.arc(380, 225, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd12e';
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      ctx.beginPath();
      ctx.arc(380 + Math.cos(a) * 20, 225 + Math.sin(a) * 20, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (variant === 'iris') {
    const grad = ctx.createLinearGradient(0, 0, 760, 520);
    grad.addColorStop(0, '#eef5ff');
    grad.addColorStop(1, '#fcf8ee');
    ctx.fillStyle = grad;
    ctx.fillRect(28, 28, 704, 464);

    // Tall iris leaves
    ctx.fillStyle = '#2b8a6e';
    ctx.beginPath();
    ctx.moveTo(350, 470);
    ctx.quadraticCurveTo(290, 300, 320, 140);
    ctx.quadraticCurveTo(350, 300, 380, 470);
    ctx.fill();

    ctx.fillStyle = '#1d6e57';
    ctx.beginPath();
    ctx.moveTo(410, 470);
    ctx.quadraticCurveTo(465, 290, 445, 160);
    ctx.quadraticCurveTo(420, 290, 390, 470);
    ctx.fill();

    // Violet & cobalt petals
    const petals = [
      [380, 175, 52, 78, 0, '#5a3ee8'],
      [318, 240, 68, 42, -0.45, '#4158f5'],
      [442, 240, 68, 42, 0.45, '#4158f5'],
      [380, 265, 58, 68, 0, '#7c5cff'],
    ] as const;
    for (const [px, py, rx, ry, rot, col] of petals) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#ffbe2b';
    ctx.beginPath();
    ctx.ellipse(380, 248, 16, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#fff9eb';
    ctx.fillRect(28, 28, 704, 464);
    ctx.fillStyle = '#207d44';
    ctx.beginPath();
    ctx.ellipse(290, 190, 88, 36, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(470, 200, 82, 34, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff8c1a';
    ctx.beginPath();
    ctx.arc(340, 285, 86, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd028';
    ctx.beginPath();
    ctx.arc(452, 310, 66, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff5d1';
    ctx.beginPath();
    ctx.arc(452, 310, 50, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.fillStyle = '#ffae19';
      ctx.beginPath();
      ctx.moveTo(452, 310);
      ctx.arc(452, 310, 44, a + 0.08, a + Math.PI / 4 - 0.08);
      ctx.closePath();
      ctx.fill();
    }
  }

  return canvas.toDataURL('image/png');
}

function createComicPanelDataUrl(pageNo: 1 | 2): string {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1220;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#fdfaf2';
  ctx.fillRect(0, 0, 900, 1220);

  const panels =
    pageNo === 1
      ? [
          {
            title: '01 · 야외의 생생한 사진첩 (원본 컬러)',
            sky: '#5cc2ff',
            accent: '#ff5247',
            caption: '원색의 생동감을 그대로 보고 싶을 땐 [원본 컬러] 모드!',
          },
          {
            title: '02 · 한낮 카페의 긴 독서 (컬러 이북)',
            sky: '#8fc5a8',
            accent: '#e67d39',
            caption: '채도를 부드럽게 낮춰 눈의 피로를 줄인 [컬러 이북] 모드!',
          },
        ]
      : [
          {
            title: '03 · 잠들기 전 집중 정독 (흑백 잉크지)',
            sky: '#cfcac0',
            accent: '#302e2b',
            caption: '먹색 대비를 살려 글자에만 몰입하는 [흑백 잉크지] 모드!',
          },
          {
            title: '04 · 상단 종이빛 키 원탭 순환',
            sky: '#ffb26b',
            accent: '#2878c8',
            caption: '비교 커튼 슬라이더로 색감 차이를 즉시 비교해 보세요.',
          },
        ];

  panels.forEach((p, idx) => {
    const y = 44 + idx * 576;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2b2723';
    ctx.lineWidth = 6;
    ctx.fillRect(46, y, 808, 536);
    ctx.strokeRect(46, y, 808, 536);

    // Colorful illustration inside panel
    ctx.fillStyle = p.sky;
    ctx.fillRect(70, y + 70, 760, 320);

    // Sun & mountains
    ctx.fillStyle = '#ffe052';
    ctx.beginPath();
    ctx.arc(700, y + 150, 48, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#388e6c';
    ctx.beginPath();
    ctx.moveTo(70, y + 390);
    ctx.lineTo(290, y + 210);
    ctx.lineTo(510, y + 390);
    ctx.fill();

    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.roundRect(450, y + 195, 220, 160, 22);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(475, y + 220, 170, 110);

    // Title & speech bubble
    ctx.fillStyle = '#24201c';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(p.title, 74, y + 48);

    ctx.fillStyle = '#f5efe3';
    ctx.strokeStyle = '#2b2723';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(70, y + 414, 760, 92, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1f1c19';
    ctx.font = 'bold 25px sans-serif';
    ctx.fillText(p.caption, 100, y + 470);
  });

  return canvas.toDataURL('image/png');
}

export function buildSampleBooks(): BookItem[] {
  const camellia = createBotanicalIllustrationDataUrl('camellia');
  const iris = createBotanicalIllustrationDataUrl('iris');
  const citrus = createBotanicalIllustrationDataUrl('citrus');

  const comic1 = createComicPanelDataUrl(1);
  const comic2 = createComicPanelDataUrl(2);

  return [
    {
      id: 'sample-botanical-atlas',
      title: '계절의 식물 수채 도감',
      author: '종이빛 에디션 · 샘플 컬러북',
      format: 'sample',
      coverDataUrl: camellia,
      currentPage: 0,
      bookmarks: [],
      annotations: {},
      updatedAt: Date.now(),
      isSample: true,
      pages: [
        {
          index: 0,
          title: '제1장 · 겨울 동백과 상록의 대비',
          kind: 'html',
          html: `
            <h1>제1장 · 겨울 동백과 상록의 대비</h1>
            <p class="lead">상단의 <strong>종이빛 키(Paper Key)</strong>를 눌러 <strong>원본 컬러 → 컬러 이북 → 흑백 잉크지</strong>의 변화를 바로 체험해 보세요.</p>
            <figure>
              <img src="${camellia}" alt="동백 수채 도판" />
              <figcaption>도판 1. 붉은 동백꽃과 짙은 상록수 잎 — 컬러 이북 모드에서는 채도가 부드럽게 가라앉아 종이 인쇄 도감처럼 눈에 편해집니다.</figcaption>
            </figure>
            <p>LCD와 OLED 화면의 높은 색역과 백색 휘도는 사진이나 영상을 볼 때는 선명하지만, 전자책을 한 시간 이상 읽을 때는 눈부심을 일으키기 쉽습니다. <strong>컬러 이북 모드</strong>는 sRGB 색공간에서 과도한 원색 자극을 줄여 실제 컬러 전자잉크(Kaleido)나 인쇄 잡지를 읽는 듯한 담채 톤으로 전환합니다.</p>
          `,
        },
        {
          index: 1,
          title: '제2장 · 봄 붓꽃과 코발트 색감',
          kind: 'html',
          html: `
            <h1>제2장 · 봄 붓꽃과 코발트 색감</h1>
            <figure>
              <img src="${iris}" alt="붓꽃 수채 도판" />
              <figcaption>도판 2. 청보라 붓꽃과 청록 잎사귀 — 저블루라이트 따뜻한 종이 온도를 함께 조절할 수 있습니다.</figcaption>
            </figure>
            <p>야간 독서 시에는 색감 조절 패널에서 <strong>따뜻한 종이 온도</strong>와 <strong>종이 입자 질감</strong>을 올려 보세요. 푸른빛 파장을 낮추면서도 흑백과 달리 색 구분(청색·보라색·노란색 화심)은 그대로 유지됩니다.</p>
          `,
        },
        {
          index: 2,
          title: '제3장 · 한여름 감귤과 흑백 잉크지 정독',
          kind: 'html',
          html: `
            <h1>제3장 · 한여름 감귤과 흑백 잉크지 정독</h1>
            <figure>
              <img src="${citrus}" alt="감귤 수채 도판" />
              <figcaption>도판 3. 주황 감귤과 레몬 — 흑백 잉크지 모드에서도 명암 계조와 본문 먹색이 선명합니다.</figcaption>
            </figure>
            <p>소설이나 텍스트 중심 자료를 오래 읽을 때는 <strong>흑백 잉크지(Ink Paper)</strong> 모드로 전환하세요. 단순 평균 회색조가 아닌 명암 최적화 행렬을 적용해 활자의 가독성을 높여 줍니다.</p>
          `,
        },
      ],
    },
    {
      id: 'sample-color-comic',
      title: '종이빛 네 컷 컬러 만화 가이드',
      author: '종이빛 스튜디오',
      format: 'sample',
      coverDataUrl: comic1,
      currentPage: 0,
      bookmarks: [],
      annotations: {},
      updatedAt: Date.now() - 1000,
      isSample: true,
      pages: [
        {
          index: 0,
          title: '1~2컷 · 컬러 이북 활용법',
          kind: 'image',
          imageDataUrl: comic1,
        },
        {
          index: 1,
          title: '3~4컷 · 비교 커튼 & 주석 필기',
          kind: 'image',
          imageDataUrl: comic2,
        },
      ],
    },
  ];
}
