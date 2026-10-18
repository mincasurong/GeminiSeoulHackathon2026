export type Locale = "en" | "ko" | "ja" | "zh" | "es";

export const LOCALE_OPTIONS: { code: Locale; label: string; native: string }[] = [
  { code: "en", label: "EN", native: "English" },
  { code: "ko", label: "KO", native: "한국어" },
  { code: "ja", label: "JA", native: "日本語" },
  { code: "zh", label: "ZH", native: "中文" },
  { code: "es", label: "ES", native: "Español" },
];

export interface TranslationStrings {
  openingBadge: string;
  openingTitle: string;
  openingSubtitle: string;
  openingCta: string;
  stageOpening: string;
  stageAuth: string;
  stageIntro: string;
  stageMain: string;
  authStepBadge: string;
  authTitle: string;
  authSubtitle: string;
  authContinueAccount: string;
  authGoogleSignIn: string;
  authSigningIn: string;
  authContinueFreeGuest: string;
  authFooterNote: string;
  introStepBadge: string;
  introTitle: string;
  introSubtitle: string;
  introStep1Title: string;
  introStep1Desc: string;
  introStep2Title: string;
  introStep2Desc: string;
  introStep3Title: string;
  introStep3Desc: string;
  introEnterMain: string;
  introShowcaseLink: string;
  headerFreeMode: string;
  headerGoogleLogin: string;
  headerLogoutTitle: string;
  mainTabViewport: string;
  mainTabScan: string;
  mainTabChat: string;
  view2DMap: string;
  view3DTwin: string;
  viewGraph: string;
  viewFleet: string;
  scanTitle: string;
  scanSubtitle: string;
  currentPlanLabel: string;
  downloadLabel: string;
  manageBillingBtn: string;
  footerTagline: string;
}

export const TRANSLATIONS: Record<Locale, TranslationStrings> = {
  en: {
    openingBadge: "1st Place Spatial Intelligence AI",
    openingTitle: "SPATIAL_OS Studio",
    openingSubtitle:
      "Turn 8 directional room photos into a 2D Floor Plan, 3D Digital Twin, and ROS2 Robot Navigation Path in seconds.",
    openingCta: "Get Started",
    stageOpening: "1. Opening",
    stageAuth: "2. Sign In",
    stageIntro: "3. Guide",
    stageMain: "4. Studio",
    authStepBadge: "STEP 1 / 2 · ACCOUNT",
    authTitle: "Start with Google Account",
    authSubtitle:
      "Sign in with your Google Account to automatically save your spatial blueprints and workspace records to Google Cloud DB.",
    authContinueAccount: "Continue with this Account",
    authGoogleSignIn: "Sign in with Google",
    authSigningIn: "Connecting to Google OAuth...",
    authContinueFreeGuest: "Continue in Free Mode without Sign-In",
    authFooterNote: "Individual users start safely in Free mode by default",
    introStepBadge: "STEP 2 / 2 · QUICK GUIDE",
    introTitle: "Spatial Intelligence in 3 Simple Steps",
    introSubtitle:
      "Designed for effortless spatial mapping without complex menus.",
    introStep1Title: "1. Explore Sample Space or Upload 8 Photos",
    introStep1Desc:
      "Inspect the pre-loaded lobby blueprint right away, or upload 8 clockwise photos (N → NW) taken from a room center.",
    introStep2Title: "2. Switch 2D Map · 3D Twin · SLAM Graph Instantly",
    introStep2Desc:
      "Use the top view switcher to inspect the 2D orthographic blueprint, 3D voxel twin, and spatial relation mesh.",
    introStep3Title: "3. Ask Spatial AI & Export CAD / ROS2 Paths",
    introStep3Desc:
      "Ask natural-language questions about the room and download AutoCAD (.DXF), .SVG blueprints, and ROS2 waypoints.",
    introEnterMain: "Enter Main Studio",
    introShowcaseLink: "Explore Interactive Showcase Demo (/scholar)",
    headerFreeMode: "Free Mode",
    headerGoogleLogin: "Google Sign-In",
    headerLogoutTitle: "Sign out of Google Account",
    mainTabViewport: "2D Map & 3D Twin",
    mainTabScan: "Scan New Room (8 Photos)",
    mainTabChat: "AI Q&A & Route",
    view2DMap: "2D Map",
    view3DTwin: "3D Twin",
    viewGraph: "SLAM Graph",
    viewFleet: "Multi-Room",
    scanTitle: "360° 8-Sector Room Photo Upload",
    scanSubtitle:
      "Select 8 photos captured clockwise (N → NW) from the center of a room to synthesize its 2D blueprint and 3D twin.",
    currentPlanLabel: "Current Plan:",
    downloadLabel: "Download",
    manageBillingBtn: "Manage Subscription & Billing",
    footerTagline: "SPATIAL_OS Studio · 2D CAD & 3D Digital Twin",
  },
  ko: {
    openingBadge: "1st Place 공간 지능 AI",
    openingTitle: "SPATIAL_OS 스튜디오",
    openingSubtitle:
      "8장의 방 사진으로 2D 평면도 · 3D 디지털 트윈 · 로봇 자율주행 경로를 한 번에 완성하세요.",
    openingCta: "시작하기",
    stageOpening: "1. 오프닝",
    stageAuth: "2. 로그인",
    stageIntro: "3. 안내",
    stageMain: "4. 메인",
    authStepBadge: "STEP 1 / 2 · 계정 연결",
    authTitle: "Google 계정으로 시작하기",
    authSubtitle:
      "Google 계정으로 로그인하면 생성한 공간 도면과 워크스페이스 기록이 Google Cloud DB에 자동 저장됩니다.",
    authContinueAccount: "이 계정으로 계속하기",
    authGoogleSignIn: "Google 계정으로 로그인",
    authSigningIn: "Google 인증 연결 중...",
    authContinueFreeGuest: "로그인 없이 무료 모드로 둘러보기",
    authFooterNote: "개인 사용자는 기본 무료(Free) 모드로 안전하게 시작됩니다",
    introStepBadge: "STEP 2 / 2 · 이용 안내",
    introTitle: "3단계로 끝내는 공간 지능 스튜디오",
    introSubtitle: "복잡한 메뉴 없이 누구나 직관적으로 사용할 수 있도록 구성했습니다.",
    introStep1Title: "1. 기본 샘플 공간 체험 또는 8방향 사진 업로드",
    introStep1Desc:
      "준비된 로비 샘플 도면을 바로 둘러보거나, 방 중앙에서 찍은 8장의 사진을 업로드해 새 공간을 생성합니다.",
    introStep2Title: "2. 2D 평면도 · 3D 디지털 트윈 · SLAM 그래프 전환",
    introStep2Desc:
      "상단 탭 버튼 하나로 2D 직교 도면, 3D 복셀 공간, 객체 관계도를 한눈에 확인하고 클릭해 탐색합니다.",
    introStep3Title: "3. AI 공간 채팅 & CAD / ROS2 경로 내보내기",
    introStep3Desc:
      "AI에게 공간 구조나 경로를 질문하고 AutoCAD(.DXF), .SVG 도면, ROS2 로봇 좌표를 즉시 다운로드합니다.",
    introEnterMain: "메인 스튜디오로 입장하기",
    introShowcaseLink: "인터랙티브 쇼케이스 데모 (/scholar) 먼저 보기",
    headerFreeMode: "Free 모드",
    headerGoogleLogin: "Google 로그인",
    headerLogoutTitle: "Google 계정 로그아웃",
    mainTabViewport: "공간 도면 & 3D",
    mainTabScan: "새 방 스캔 (8장)",
    mainTabChat: "AI 질문 & 경로",
    view2DMap: "2D 도면",
    view3DTwin: "3D 트윈",
    viewGraph: "관계도",
    viewFleet: "멀티룸",
    scanTitle: "360° 8방향 방 사진 업로드",
    scanSubtitle:
      "방 중앙에서 시계방향(N → NW)으로 촬영한 8장의 사진을 선택하면 자동으로 2D 도면과 3D 트윈이 생성됩니다.",
    currentPlanLabel: "현재 플랜:",
    downloadLabel: "다운로드",
    manageBillingBtn: "구독 & 결제 관리",
    footerTagline: "SPATIAL_OS Studio · 2D CAD & 3D Digital Twin",
  },
  ja: {
    openingBadge: "第1位 空間知能 AI",
    openingTitle: "SPATIAL_OS スタジオ",
    openingSubtitle:
      "8枚の室内写真から2D平面図・3Dデジタルツイン・ROS2ロボット経路を数秒で自動生成します。",
    openingCta: "はじめる",
    stageOpening: "1. オープニング",
    stageAuth: "2. ログイン",
    stageIntro: "3. ガイド",
    stageMain: "4. スタジオ",
    authStepBadge: "STEP 1 / 2 · アカウント連携",
    authTitle: "Googleアカウントで開始",
    authSubtitle:
      "Googleアカウントでログインすると、生成した空間図面やワークスペース履歴がGoogle Cloud DBに自動保存されます。",
    authContinueAccount: "このアカウントで続行",
    authGoogleSignIn: "Googleアカウントでログイン",
    authSigningIn: "Google認証に接続中...",
    authContinueFreeGuest: "ログインせずに無料モードで体験",
    authFooterNote: "個人ユーザーはデフォルトで安全な無料(Free)モードから開始します",
    introStepBadge: "STEP 2 / 2 · ご利用ガイド",
    introTitle: "3ステップで使える空間知能スタジオ",
    introSubtitle: "複雑な設定なしで直感的に操作できるように設計されています。",
    introStep1Title: "1. サンプル空間の体験または8方向の写真アップロード",
    introStep1Desc:
      "用意されたロビー図面をすぐ確認するか、部屋の中央から撮影した8枚の写真をアップロードします。",
    introStep2Title: "2. 2D平面図・3Dツイン・SLAMグラフをワンクリック切替",
    introStep2Desc:
      "上部タブから2D正投影図、3Dボクセル空間、オブジェクト関係グラフを瞬時に切り替えます。",
    introStep3Title: "3. AI空間チャット＆CAD / ROS2経路エクスポート",
    introStep3Desc:
      "AIに空間構造や経路を質問し、AutoCAD(.DXF)、.SVG図面、ROS2座標を即座にダウンロードできます。",
    introEnterMain: "メインスタジオに入る",
    introShowcaseLink: "インタラクティブデモ (/scholar) を見る",
    headerFreeMode: "Free モード",
    headerGoogleLogin: "Google ログイン",
    headerLogoutTitle: "Googleアカウントからログアウト",
    mainTabViewport: "2D図面 & 3Dツイン",
    mainTabScan: "新規スキャン (8枚)",
    mainTabChat: "AI質問 & 経路",
    view2DMap: "2D図面",
    view3DTwin: "3Dツイン",
    viewGraph: "関係グラフ",
    viewFleet: "マルチルーム",
    scanTitle: "360° 8方向 室内写真アップロード",
    scanSubtitle:
      "部屋の中央から時計回り(N → NW)に撮影した8枚の写真を選択すると、自動的に2D図面と3Dツインが生成されます。",
    currentPlanLabel: "現在のプラン:",
    downloadLabel: "ダウンロード",
    manageBillingBtn: "サブスクリプション & 決済管理",
    footerTagline: "SPATIAL_OS Studio · 2D CAD & 3D Digital Twin",
  },
  zh: {
    openingBadge: "第一名 空间智能 AI",
    openingTitle: "SPATIAL_OS 工作室",
    openingSubtitle:
      "仅需8张室内照片，即可在数秒内生成2D平面图、3D数字孪生与ROS2机器人导航路径。",
    openingCta: "立即开始",
    stageOpening: "1. 欢迎页",
    stageAuth: "2. 登录",
    stageIntro: "3. 指南",
    stageMain: "4. 工作室",
    authStepBadge: "STEP 1 / 2 · 账号连接",
    authTitle: "使用 Google 账号开始",
    authSubtitle:
      "登录 Google 账号后，您生成的空间蓝图与工作区记录将自动保存在 Google Cloud 数据库中。",
    authContinueAccount: "使用此账号继续",
    authGoogleSignIn: "使用 Google 账号登录",
    authSigningIn: "正在连接 Google 认证...",
    authContinueFreeGuest: "免登录以免费模式体验",
    authFooterNote: "个人用户默认以安全的免费 (Free) 模式启动",
    introStepBadge: "STEP 2 / 2 · 使用指南",
    introTitle: "3步掌握空间智能工作室",
    introSubtitle: "无需复杂配置，核心功能一目了然。",
    introStep1Title: "1. 体验默认样板空间或上传8方向照片",
    introStep1Desc:
      "立即浏览预设大厅平面图，或上传从房间中心顺时针拍摄的8张照片（N → NW）。",
    introStep2Title: "2. 一键切换 2D平面图 · 3D孪生 · SLAM关系图",
    introStep2Desc:
      "通过顶部按钮即可在2D正交蓝图、3D体素孪生与空间拓扑关系图之间自由切换。",
    introStep3Title: "3. AI空间问答与 CAD / ROS2 路径导出",
    introStep3Desc:
      "向 AI 询问空间布局或导航路线，一键下载 AutoCAD(.DXF)、.SVG 图纸与 ROS2 航点。",
    introEnterMain: "进入主工作室",
    introShowcaseLink: "查看交互式演示实验室 (/scholar)",
    headerFreeMode: "Free 免费版",
    headerGoogleLogin: "Google 登录",
    headerLogoutTitle: "退出 Google 账号",
    mainTabViewport: "2D蓝图 & 3D孪生",
    mainTabScan: "扫描新房间 (8张)",
    mainTabChat: "AI问答 & 路径",
    view2DMap: "2D蓝图",
    view3DTwin: "3D孪生",
    viewGraph: "拓扑图",
    viewFleet: "多房间",
    scanTitle: "360° 8方向室内照片上传",
    scanSubtitle:
      "选择从房间中心顺时针（N → NW）拍摄的8张照片，系统将自动合成2D平面图与3D数字孪生。",
    currentPlanLabel: "当前方案:",
    downloadLabel: "下载",
    manageBillingBtn: "订阅与支付管理",
    footerTagline: "SPATIAL_OS Studio · 2D CAD & 3D Digital Twin",
  },
  es: {
    openingBadge: "1er Lugar IA de Inteligencia Espacial",
    openingTitle: "SPATIAL_OS Studio",
    openingSubtitle:
      "Transforma 8 fotos de una habitación en un plano 2D, un gemelo digital 3D y rutas robóticas ROS2 en segundos.",
    openingCta: "Comenzar",
    stageOpening: "1. Inicio",
    stageAuth: "2. Acceso",
    stageIntro: "3. Guía",
    stageMain: "4. Estudio",
    authStepBadge: "PASO 1 / 2 · CUENTA",
    authTitle: "Comenzar con Google",
    authSubtitle:
      "Inicia sesión con tu cuenta de Google para guardar automáticamente tus planos y espacios en Google Cloud DB.",
    authContinueAccount: "Continuar con esta cuenta",
    authGoogleSignIn: "Iniciar sesión con Google",
    authSigningIn: "Conectando con Google OAuth...",
    authContinueFreeGuest: "Continuar en Modo Gratis sin iniciar sesión",
    authFooterNote: "Los usuarios individuales comienzan en Modo Gratis por defecto",
    introStepBadge: "PASO 2 / 2 · GUÍA RÁPIDA",
    introTitle: "Inteligencia Espacial en 3 Simples Pasos",
    introSubtitle: "Diseñado de forma intuitiva y sin menús complicados.",
    introStep1Title: "1. Explora el espacio de muestra o sube 8 fotos",
    introStep1Desc:
      "Revisa el plano del vestíbulo preinstalado o sube 8 fotos tomadas en sentido horario (N → NO) desde el centro.",
    introStep2Title: "2. Cambia entre Plano 2D · Gemelo 3D · Grafo SLAM",
    introStep2Desc:
      "Alterna al instante entre el plano ortográfico 2D, el gemelo de vóxeles 3D y el grafo relacional.",
    introStep3Title: "3. Chat Espacial IA y Exportación CAD / ROS2",
    introStep3Desc:
      "Haz preguntas sobre el espacio y descarga planos AutoCAD (.DXF), .SVG y coordenadas ROS2.",
    introEnterMain: "Entrar al Estudio Principal",
    introShowcaseLink: "Ver Demostración Interactiva (/scholar)",
    headerFreeMode: "Modo Gratis",
    headerGoogleLogin: "Acceso Google",
    headerLogoutTitle: "Cerrar sesión de Google",
    mainTabViewport: "Plano 2D y 3D",
    mainTabScan: "Escanear Sala (8 Fotos)",
    mainTabChat: "Chat IA y Ruta",
    view2DMap: "Plano 2D",
    view3DTwin: "Gemelo 3D",
    viewGraph: "Grafo SLAM",
    viewFleet: "Multisala",
    scanTitle: "Subir 8 Fotos Panorámicas (360°)",
    scanSubtitle:
      "Selecciona 8 fotos capturadas en sentido horario (N → NO) desde el centro de la sala para generar el plano 2D y el gemelo 3D.",
    currentPlanLabel: "Plan actual:",
    downloadLabel: "Descargar",
    manageBillingBtn: "Suscripción y Pagos",
    footerTagline: "SPATIAL_OS Studio · CAD 2D y Gemelo Digital 3D",
  },
};
