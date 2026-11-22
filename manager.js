(() => {
  if (window.__CP_MANAGER_LOADED__) return;
  window.__CP_MANAGER_LOADED__ = true;

  const PROJECT_ID = "coupang-auto-9f7f0";
  const API_KEY = "AIzaSyDaySX9tYRXdftu7TGEdb5kG-nv44OqS90";
  const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/products`;
  const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  const REFRESH_URL = `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`;
  const AUTH_STORAGE_KEY = "cp_team_auth_v1";

  const DEFAULT_FEE_RATE = 11.55;
  const DEFAULT_SHIPPING = 0;
  const DEFAULT_TARGET_MARGIN = 20;
  const MAX_STOCK = 10;

  const CATEGORY_TREE = {
    "가디건": ["남성 기본(허리길이)가디건", "남성 롱 가디건"],
    "골프의류": [
      "남성 골프 니트/가디건", "남성 골프 바람막이/재킷", "남성 골프 바지",
      "남성 골프 셔츠", "남성 골프 조끼", "남성 골프 티셔츠", "남성 골프 패딩/다운패딩"
    ],
    "단품/기본 의류": [
      "남성 맨투맨", "남성 베스트(조끼)", "남성 와이셔츠(드레스셔츠)", "남성 정장세트",
      "남성 캐주얼 셔츠", "남성 후드집업/집업류", "남성 후드티", "남성레깅스"
    ],
    "등산/아웃도어 의류": [
      "남성 등산/아웃도어 니트/스웨터", "남성 등산/아웃도어 바람막이/방수자켓",
      "남성 등산/아웃도어 바지", "남성 등산/아웃도어 셔츠", "남성 등산/아웃도어 조끼",
      "남성 등산/아웃도어 패딩/점퍼", "남성 등산/아웃도어 플리스자켓", "등산/아웃도어 티셔츠"
    ],
    "바지/캐주얼": ["남성 긴바지", "남성 반바지", "남성 정장바지"],
    "스웨터/니트": ["남성 라운드넥", "남성 브이넥", "남성 카라넥", "남성 터틀넥", "남성 후드"],
    "스포츠의류": [
      "남성 스포츠 니트/스웨터", "남성 스포츠 상하의 세트", "남성 스포츠 셔츠",
      "댄스복", "발레복", "수영복", "스키/보드복", "스포츠 바지/레깅스",
      "스포츠 자켓/집업", "스포츠 티셔츠/나시", "에어로빅복", "요가/피트니스웨어"
    ],
    "재킷": ["남성 정장재킷", "남성 캐주얼재킷"],
    "점퍼": [
      "남성 기타 점퍼류", "남성 바람막이 점퍼", "남성 야구점퍼/스타디움",
      "남성 야상/사파리", "남성 패딩/다운패딩점퍼", "남성 패딩/다운패딩조끼", "남성 항공점퍼/블루종"
    ],
    "청바지": ["남성 긴바지", "남성 반바지"],
    "코트": ["남성 겨울 코트", "남성 봄가을 코트/트렌치"],
    "티셔츠": ["남성 긴소매", "남성 민소매/나시", "남성 반소매"],
    "패션 트레이닝복": ["남성 상의", "남성 상하의 세트", "남성 하의"]
  };

  const NOTICE_FIELDS = [
    ["material", "제품 소재"],
    ["color", "색상"],
    ["size", "치수"],
    ["manufacturer", "제조자(수입자)"],
    ["country", "제조국"],
    ["care", "세탁방법 및 취급시 주의사항"],
    ["mfgDate", "제조연월"],
    ["warranty", "품질보증기준"],
    ["asInfo", "A/S 책임자와 전화번호"]
  ];

  let products = [];
  let editingId = null;
  let authState = loadAuth();
  let bridgeMakerData = null;
  let latestMeasuredSizes = null;
  let latestMaterialText = "";
  let initialScrollLocked = false;

function route32(url){const u=new URL(url),v=u.searchParams.get('view'),id=u.searchParams.get('make');const view=['collect','studio','library','posted','stock'].includes(v)?v:id?'studio':'collect';return {view:view==='studio'&&!id?'collect':view,id:view==='studio'?id:null}}
function path32(url,view,id){const u=new URL(url);u.searchParams.set('view',view);if(view==='studio'&&id)u.searchParams.set('make',id);else u.searchParams.delete('make');return u.href}
const entry32=route32(location.href);let archive=[], connected=false,pendingId=entry32.id,mounting=false;
  function loadAuth() {
    try { return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)) || null; }
    catch { return null; }
  }

  function saveAuth(data) {
    authState = data;
    if (data) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
    else localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  function getUserName() {
    if (!authState?.email) return "알 수 없음";
    return authState.email.split("@")[0];
  }

  function formatDate(ts) {
    const d = ts ? new Date(ts) : new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function parseNum(val) {
    return Number(String(val ?? "").replace(/[^0-9-]/g, "")) || 0;
  }

  function clampStock(val) {
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(MAX_STOCK, Math.round(n));
  }

  function formatComma(val) {
    const raw = String(val ?? "").replace(/[^0-9]/g, "");
    if (!raw) return "";
    return Number(raw).toLocaleString();
  }

  function formatWon(num) {
    return `${(Number(num) || 0).toLocaleString()}원`;
  }

  const NOTICE_SIZE_TEXT = "상세페이지 참고";
  const TAG_COLORS = '블랙 화이트 검정 검은색 흑색 하양 하얀색 흰색 백색 아이보리 크림 베이지 카멜 브라운 갈색 밤색 고동색 네이비 남색 곤색 감색 차콜 챠콜 그레이 그레이지 회색 먹색 쥐색 실버 은색 골드 금색 카키 올리브 그린 녹색 초록 연두 민트 청록 터콰이즈 블루 파랑 파란색 청색 소라 하늘색 인디고 코발트 레드 빨강 빨간색 적색 와인 버건디 마룬 핑크 분홍 로즈 코랄 오렌지 주황 옐로우 옐로 노랑 노란색 황색 머스터드 퍼플 바이올렛 보라 라벤더 자주 멜란지 오트밀 모카 초콜릿 토프 샌드 에크루 에토프 black white ivory cream beige camel brown navy charcoal gray grey silver gold khaki olive green mint teal blue indigo red wine burgundy pink coral orange yellow mustard purple violet lavender oatmeal taupe ecru'.split(' ');
  function parseTags(input, product = {}, limit = 20) {
    const norm = x => String(x ?? '').normalize('NFKC').trim().toLowerCase();
    const key = x => norm(x).replace(/[\s_()\[\]#.-]/g, '');
    const modelCodes = new Set([product.code, ...(Array.isArray(product.options) ? product.options.map(o => o?.code) : [])].filter(Boolean).map(key));
    const colorWords = new Set(TAG_COLORS);
    for (const label of [...(product.colors || []), ...(product.options || []).map(o => o?.color), product.notice?.color]) {
      for (const alias of norm(label).split(/[,/|·;()\[\]]+/)) {
        const c = key(alias);
        if (c && !/^(?:상세페이지참[고조]|확인필요|미확인|기타|단일색상)$/.test(c)) colorWords.add(c);
      }
    }
    const genderKey = s => s.replace(/^(?:남성용?|남자|맨즈)/, '남성').replace(/^(?:여성용?|여자|우먼스)/, '여성');
    const aliases = s => s.replace(/자켓/g, '재킷').replace(/스웨타/g, '스웨터').replace(/카디건/g, '가디건').replace(/코튼/g, '면');
    const rows = [], seen = new Set();
    for (const tag of (Array.isArray(input) ? input : [input]).flatMap(x => String(x ?? '').normalize('NFKC').split(/[,/;\n]+/))) {
      const text = tag.trim().replace(/^#+/, '').trim();
      const raw = norm(text), k = key(text);
      if (!k || /[%％]|퍼센트|백분율|수량|재고|품절|\d\s*(?:프로|퍼|개|매|종|장|벌|켤레|팩|세트|입|묶음|컬러|칼라|색상|가지|사이즈|pcs?|ea|pack|set|colors?|colours?|sizes?)|\d\s*[+×x]\s*\d|^(?:\d+(?:[.,]\d+)?|컬러|칼라|색상|사이즈|포함|pcs?|ea|colors?|sizes?)$/i.test(raw) || /(?:한|두|세|네)\s*(?:벌|켤레|가지|색상|컬러)(?:$|구성)/.test(raw)) continue;
      // Do not mistake an SKU ending in a two-letter option code for a colour tag.
      const tokens = raw.match(/[a-z]+|[가-힣]+|\d+/g) || [];
      const colour = [...colorWords].some(c => k === c || (/^[a-z]+$/.test(c) ? (!modelCodes.has(k) && tokens.includes(c)) || (c.length >= 3 && /[가-힣]/.test(k) && k.includes(c)) : c.length >= 2 && k.replace(/블루[종손]/g, '').includes(c)));
      if (colour) continue;
      const semantic = genderKey(aliases(k));
      if (!seen.has(semantic)) { seen.add(semantic); rows.push({ text, semantic }); }
    }
    // Prefer the qualified variant when present; men's and women's variants remain distinct.
    return rows.filter(({semantic:s}) => !seen.has('남성'+s) && !seen.has('여성'+s)).slice(0, limit).map(r => r.text);
  }
  function listingFields(p) {
    return { ...p, notice: { ...p.notice, size: NOTICE_SIZE_TEXT }, tags: parseTags(p.tags, p).join('/') };
  }
  function buildSeoTagsFromFields({ name, lfName, code, material, options, colors, notice }) {
    const title = [name, lfName].filter(Boolean).join(' ').normalize('NFKC');
    const items = [...new Set(title.match(/숏패딩|롱패딩|패딩|점퍼|자켓|재킷|코트|가디건|카디건|니트|스웨터|맨투맨|후드|티셔츠|셔츠|팬츠|바지|슬랙스|데님|카라/g) || [])];
    const fabrics = [...new Set(String(material || '').match(/캐시미어|메리노|코튼|린넨|폴리에스터|나일론|레이온|아크릴|실크|구스|덕다운|울|모|면/g) || [])];
    const gender = title.match(/남성|남자|여성|여자/)?.[0];
    const words = title.replace(/[^가-힣A-Za-z0-9%+\s.-]/g, ' ').split(/\s+/).filter(w => w.length >= 2 && w.length <= 20 && !/^(남성|여성|남자|여자)$/.test(w));
    const candidates = [...(gender ? items.map(i => gender+i) : []), ...items, ...fabrics.flatMap(f => items.slice(0, 2).map(i => f+i)), ...fabrics.filter(f => f.length >= 2), ...words, code];
    return parseTags(candidates, { code, options, colors, notice });
  }

  function buildCategoryPath(mainCat, subCat) {
    if (!mainCat || !subCat) return "";
    if (mainCat === "단품/기본 의류") return `패션의류잡화>남성패션>남성의류>${subCat}`;
    return `패션의류잡화>남성패션>남성의류>${mainCat}>${subCat}`;
  }

  function parseCategoryPath(fullPath) {
    if (!fullPath) return { main: "", sub: "" };
    const parts = fullPath.split(">");
    const last = parts[parts.length - 1] || "";
    const prev = parts[parts.length - 2] || "";
    if (CATEGORY_TREE[prev] && CATEGORY_TREE[prev].includes(last)) {
      return { main: prev, sub: last };
    }
    if (CATEGORY_TREE["단품/기본 의류"].includes(last)) {
      return { main: "단품/기본 의류", sub: last };
    }
    return { main: "", sub: "" };
  }

  function calcMargin(cost, salePrice, feeRate = DEFAULT_FEE_RATE, shipping = DEFAULT_SHIPPING) {
    const c = parseNum(cost);
    const s = parseNum(salePrice);
    const f = Number(feeRate) || 0;
    const sh = parseNum(shipping);
    const fee = Math.round(s * (f / 100));
    const profit = s - c - fee - sh;
    const rate = s > 0 ? (profit / s) * 100 : 0;
    const vat = profit > 0 ? Math.round(profit / 11) : 0;
    const profitAfterVat = profit - vat;
    const rateAfterVat = s > 0 ? (profitAfterVat / s) * 100 : 0;
    return { fee, profit, rate, vat, profitAfterVat, rateAfterVat };
  }

  function priceQuote(cost,targetMarginPct=DEFAULT_TARGET_MARGIN,feeRate=DEFAULT_FEE_RATE,shipping=DEFAULT_SHIPPING) {
    const c=parseNum(cost), sh=parseNum(shipping), t=Number(targetMarginPct), f=Number(feeRate);
    const denom=(100-f-t)/100;
    if (!(c>0 && sh>=0 && Number.isFinite(t) && t>=0 && Number.isFinite(f) && f>=0 && denom>0) || [targetMarginPct,feeRate].some(x=>String(x).trim()==='')) return null;
    const raw=(c+sh)/denom, sale=Math.round(raw/1000)*1000;
    return Number.isSafeInteger(sale)&&sale>0 ? {c,sh,t,f,raw,sale,markup:c*(1+t/100)} : null;
  }
  function priceTerms(p) {const v=k=>document.getElementById(p+k).value;return {fee:v('FeeRate'),ship:v('Shipping'),target:v('TargetMargin')};}
  function restorePriceTerms(p,terms={}) {const set=(k,v)=>document.getElementById(p+k).value=v;set('FeeRate',terms?.fee??DEFAULT_FEE_RATE);set('Shipping',terms?.ship??DEFAULT_SHIPPING);set('TargetMargin',terms?.target??DEFAULT_TARGET_MARGIN);}
  function calcTargetSalePrice(cost,target=DEFAULT_TARGET_MARGIN,fee=DEFAULT_FEE_RATE,shipping=DEFAULT_SHIPPING) {
    return priceQuote(cost,target,fee,shipping)?.sale || 0;
  }

  function loadSheetJS() {
    return new Promise((resolve, reject) => {
      if (window.XLSX) return resolve(window.XLSX);
      const s = document.createElement("script");
      s.src = "https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js";
      s.onload = () => resolve(window.XLSX);
      s.onerror = () => reject(new Error("엑셀 라이브러리 로드 실패"));
      document.head.appendChild(s);
    });
  }

  function setNativeInputValue(input, val) {
    if (!input || val === undefined || val === null) return;
    const str = String(val).trim();
    if (!str) return;
    if (input.value === str) return;
    const proto = input.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(input, str);
    else input.value = str;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function scrollPageToTop() {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function cleanUnwantedUI() {
    if (/다중\s*색상\s*상품\s*제작실/.test(document.title)) {
      document.title = document.title.replace(/다중\s*색상\s*상품\s*제작실/g, "쿠팡 자동화");
    }

    ["#lfGender", "#lfSizeKind", "#lfFillSize"].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) {
        el.style.setProperty("display", "none", "important");
        const box = el.closest("div[style*='background']");
        if (box) box.style.setProperty("display", "none", "important");
      }
    });

    document.querySelectorAll("div, footer, nav, section, aside, label, h1, h2, h3, h4, p, b, strong, small, span, button, select").forEach(el => {
      if (el.id?.startsWith("cp") || el.closest("#cpTopBar, #cpSidebar, #cpEditModal, #cpLoginOverlay, #cpStudioRegSection")) return;
      if (el.querySelector("#lfReceived, #btnMakeAll, .cp-card")) return;

      const txt = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
      if (el.children.length <= 2 && /다중\s*색상\s*상품\s*제작실/.test(txt)) {
        el.textContent = txt.replace(/다중\s*색상\s*상품\s*제작실/g, "쿠팡 자동화");
      }

      if (txt === "상세페이지 제작" && el.children.length <= 2) {
        el.style.setProperty("display", "none", "important");
      }

      if (el.children.length === 0 && /남성\s*숏패딩\s*기본\s*사이즈표/.test(txt)) {
        el.textContent = txt.replace(/남성\s*숏패딩\s*기본\s*사이즈표/g, "상세페이지 사이즈표");
      }

      if (el.tagName === "SELECT" && (el.id === "lfGender" || el.id === "lfSizeKind" || /남성.*여성|숏패딩.*롱패딩|카라 긴팔 티셔츠/.test(txt))) {
        el.style.setProperty("display", "none", "important");
      }
      if (el.tagName === "BUTTON" && (el.id === "lfFillSize" || /선택한\s*기본표\s*적용/.test(txt))) {
        el.style.setProperty("display", "none", "important");
      }
      if (/기본값은\s*수정할\s*수\s*있으며\s*실제\s*상품\s*실측표/.test(txt) && txt.length < 150) {
        el.style.setProperty("display", "none", "important");
      }
    });
  }

  function getSizeRowsAndAddBtn() {
    const addBtn = [...document.querySelectorAll("button")].find(b =>
      !b.id?.startsWith("cp") &&
      !b.closest("#cpStudioRegSection, #cpEditModal") &&
      /사이즈\s*한\s*줄\s*추가/.test((b.innerText || b.textContent || "").replace(/\s+/g, " ").trim())
    );

    const sizeInputs = [...document.querySelectorAll('input[aria-label="사이즈"]')].filter(
      inp => !inp.closest("#cpStudioRegSection, #cpEditModal")
    );

    const rows = sizeInputs
      .map(szInp => {
        const tr = szInp.closest("tr");
        if (!tr) return null;
        return {
          size: szInp,
          totalLength: tr.querySelector('input[aria-label="총 길이"]'),
          shoulder: tr.querySelector('input[aria-label="어깨너비"]'),
          chest: tr.querySelector('input[aria-label="가슴둘레"]'),
          sleeve: tr.querySelector('input[aria-label="소매길이"]')
        };
      })
      .filter(Boolean);

    return { rows, addBtn: addBtn || null };
  }

  function applyMeasuredSizesToStudio(measuredSizes) {
    if (measuredSizes?.rows?.length) latestMeasuredSizes = measuredSizes;
    const data = measuredSizes?.rows?.length ? measuredSizes : latestMeasuredSizes;
    if (!data?.rows?.length) return;

    let { rows: rowEls, addBtn } = getSizeRowsAndAddBtn();
    if (!rowEls.length) return;

    let guard = 0;
    while (rowEls.length < data.rows.length && addBtn && guard < 25) {
      addBtn.click();
      rowEls = getSizeRowsAndAddBtn().rows;
      guard++;
    }

    data.rows.forEach((r, idx) => {
      const target = rowEls[idx];
      if (!target) return;
      if (r.size) setNativeInputValue(target.size, r.size);
      if (r.totalLength) setNativeInputValue(target.totalLength, r.totalLength);
      if (r.shoulder) setNativeInputValue(target.shoulder, r.shoulder);
      if (r.chest) setNativeInputValue(target.chest, r.chest);
      if (r.sleeve) setNativeInputValue(target.sleeve, r.sleeve);
    });
  }

  function applyFabricMaterialToStudio(materialText) {
    if (materialText) latestMaterialText = materialText;
    const text = materialText || latestMaterialText;
    if (!text) return;

    const input=document.getElementById('guideFiber'); if(input){input.removeAttribute('maxlength');setNativeInputValue(input,text)}
  }

  async function urlToFile(urlOrDataUrl, filename = "image.jpg") {
    if (!urlOrDataUrl) return null;
    try {
      const res = await fetch(urlOrDataUrl);
      if (res.ok) {
        const blob = await res.blob();
        const mime = blob.type || "image/jpeg";
        const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
        return new File([blob], filename.replace(/\.[a-z0-9]+$/i, "") + "." + ext, { type: mime });
      }
    } catch {}
    return null;
  }

  function setFileInputFiles(input, file) {
    if (!input || !file) return;
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    } catch {}
  }

  function detectSlotRole(fileInput) {
    let cur = fileInput.parentElement;
    for (let i = 0; i < 5 && cur; i++) {
      const t = (cur.innerText || cur.textContent || "").replace(/\s+/g, " ").trim();
      if (t.length <= 120) {
        if (/앞면/.test(t)) return "앞면";
        if (/뒷면/.test(t)) return "뒷면";
        if (/디테일\s*1/.test(t)) return "디테일 1";
        if (/디테일\s*2/.test(t)) return "디테일 2";
        if (/디테일\s*3/.test(t)) return "디테일 3";
        if (/디테일\s*4/.test(t)) return "디테일 4";
        if (/원단\s*사진/.test(t)) return "원단 사진";
      }
      cur = cur.parentElement;
    }
    return "";
  }

  function findOptionCards() {
    const colorInputs = [...document.querySelectorAll('input[type="text"], input:not([type])')].filter(inp => {
      if (inp.closest("#cpStudioRegSection, #cpEditModal")) return false;
      const ph = inp.placeholder || "";
      const nearText = ((inp.closest("div")?.parentElement?.innerText) || "").replace(/\s+/g, " ");
      return /블랙/.test(ph) || /색상명\s*\(필수\)/.test(nearText);
    });

    const cards = [];
    for (const cInp of colorInputs) {
      let cur = cInp.parentElement;
      for (let i = 0; i < 6 && cur; i++) {
        const fCount = cur.querySelectorAll('input[type="file"]').length;
        if (fCount >= 4 && fCount <= 12) {
          if (!cards.includes(cur)) cards.push(cur);
          break;
        }
        cur = cur.parentElement;
      }
    }
    return cards;
  }

  async function applyCollectedPhotosToStudio(makerData) {
    const items = Array.isArray(makerData?.items) ? makerData.items : [];
    if (!items.length) return;

    const grouped = [];
    const byColor = new Map();
    items.forEach(it => {
      const imgSrc = it?.dataUrl || it?.url;
      if (!imgSrc || it.role === "제외") return;
      const cKey = (it.color || makerData.colors?.[0] || "색상 1").trim();
      if (!byColor.has(cKey)) {
        const entry = { color: cKey, code: it.sourceCode || makerData.code || "", photos: [] };
        byColor.set(cKey, entry);
        grouped.push(entry);
      }
      byColor.get(cKey).photos.push({ ...it, imgSrc });
    });

    if (!grouped.length) return;

    const cards = findOptionCards();
    for (let idx = 0; idx < grouped.length; idx++) {
      const g = grouped[idx];
      const optCard = cards[idx];
      if (!optCard) continue;

      const textInputs = [...optCard.querySelectorAll('input[type="text"], input:not([type])')];
      const colorInp = textInputs.find(i =>
        /블랙/.test(i.placeholder || "") ||
        /색상명\s*\(필수\)/.test(((i.closest("div")?.parentElement?.innerText) || ""))
      ) || textInputs[0];

      if (colorInp) setNativeInputValue(colorInp, g.color);

      const codeInp = textInputs.find(i =>
        i !== colorInp &&
        (/품번|색상별/.test(i.placeholder || "") || /옵션\s*품번/.test(((i.closest("div")?.parentElement?.innerText) || "")))
      );

      if (codeInp && g.code) setNativeInputValue(codeInp, g.code);

      const cardFileInputs = [...optCard.querySelectorAll('input[type="file"]')];
      for (const fInp of cardFileInputs) {
        const slotRole = detectSlotRole(fInp);
        if (!slotRole) continue;
        const matched = g.photos.find(p => p.role === slotRole);
        if (!matched?.imgSrc) continue;

        const file = await urlToFile(matched.imgSrc, `${g.color}_${matched.key || slotRole}.jpg`);
        if (file) {
          setFileInputFiles(fInp, file);
          const slotWrap = fInp.closest("div")?.parentElement || fInp.parentElement;
          const noFileNode = [...(slotWrap?.querySelectorAll("span, small, p, div") || [])].find(
            n => n.children.length === 0 && /선택된\s*파일\s*없음/.test((n.textContent || "").trim())
          );
          if (noFileNode) noFileNode.textContent = file.name;
        }
      }
    }
  }

  function readGeneratedStudioAssets() {
    let thumbUrl = "";
    let detailImgUrl = "";

    const canvases = [...document.querySelectorAll("canvas")].filter(c => c.width > 100 && c.height > 100);
    if (canvases.length) {
      try { thumbUrl = canvases[0].toDataURL("image/jpeg", 0.85); } catch {}
      if (canvases.length > 1) {
        try { detailImgUrl = canvases[canvases.length - 1].toDataURL("image/jpeg", 0.85); } catch {}
      }
    }

    const studioImgs = [...document.querySelectorAll("main img")].filter(img => {
      if (img.closest("#cpStudioRegSection")) return false;
      const src = img.currentSrc || img.src || "";
      return src.startsWith("data:image") || src.startsWith("blob:") || /result|preview|detail|thumb|make/i.test(src);
    });

    if (!thumbUrl && studioImgs[0]) {
      thumbUrl = studioImgs[0].currentSrc || studioImgs[0].src || "";
    }
    if (!detailImgUrl && studioImgs.length > 1) {
      detailImgUrl = studioImgs[studioImgs.length - 1].currentSrc || studioImgs[studioImgs.length - 1].src || "";
    }

    return { thumbUrl, detailImgUrl };
  }

  let observerTimer = null;
  const studioObserver = new MutationObserver(() => {
    clearTimeout(observerTimer);
    observerTimer = setTimeout(() => {
      cleanUnwantedUI();
      if (latestMeasuredSizes?.rows?.length) applyMeasuredSizesToStudio(latestMeasuredSizes);
      
      if (!initialScrollLocked) {
        scrollPageToTop();
        initialScrollLocked = true;
      }
    }, 150);
  });
  studioObserver.observe(document.documentElement, { childList: true, subtree: true });

  let enforceCount = 0;
  const enforceTimer = setInterval(() => {
    enforceCount++;
    cleanUnwantedUI();
    if (latestMeasuredSizes?.rows?.length) {
      const firstTotal = document.querySelector('input[aria-label="총 길이"]');
      const expectedFirst = String(latestMeasuredSizes.rows[0]?.totalLength || "").trim();
      if (firstTotal && expectedFirst && firstTotal.value.trim() !== expectedFirst) {
        applyMeasuredSizesToStudio(latestMeasuredSizes);
      }
    }

    if (enforceCount >= 25) clearInterval(enforceTimer);
  }, 300);

  const style = document.createElement("style");
  style.textContent = `
    body { margin: 0 !important; background: #f4f6fa !important; }
    #cpTopBar {
      position: fixed; top: 0; left: 0; right: 0; height: 56px; z-index: 10000;
      background: #003cb3; color: #fff;
      display: flex; justify-content: space-between; align-items: center;
      padding: 0 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.12);
    }
    .cp-brand-wrap { display: flex; align-items: center; gap: 12px; }
    .cp-brand-logo {
      background: #fff; color: #003cb3; font-weight: 800; font-size: 15px;
      padding: 6px 14px; border-radius: 8px; letter-spacing: -0.3px;
    }
    .cp-brand-title { font-size: 16px; font-weight: 700; color: #fff; }
    .cp-top-right { display: flex; align-items: center; gap: 8px; }
    .cp-sync-btn {
      background: #f59e0b !important; color: #fff !important; border: none !important;
      padding: 8px 14px !important; border-radius: 8px !important; font-weight: 700 !important;
      cursor: pointer; font-size: 13px !important; margin: 0 !important;
    }
    .cp-sync-btn:hover { background: #d97706 !important; }
    .cp-sub-btn {
      background: #0f172a !important; color: #fff !important; border: none !important;
      padding: 7px 13px !important; border-radius: 7px !important; font-weight: 600 !important;
      cursor: pointer; font-size: 12.5px !important; margin: 0 !important;
    }
    .cp-sub-btn:hover { background: #334155 !important; }
    .cp-excel-btn {
      background: #16a34a !important; color: #fff !important; border: none !important;
      padding: 9px 15px !important; border-radius: 8px !important; font-weight: 700 !important;
      cursor: pointer; font-size: 13px !important; margin: 0 !important;
    }
    .cp-excel-btn:hover { background: #15803d !important; }

    #cpLayout { display: flex; min-height: 100vh; padding-top: 56px; }
    #cpSidebar {
      width: 225px; flex-shrink: 0; background: #fff;
      border-right: 1px solid #e2e8f0; padding: 20px 14px;
      position: fixed; top: 56px; bottom: 0; left: 0; overflow-y: auto;
      display: flex; flex-direction: column;
    }
    .cp-menu-group { font-size: 13px; font-weight: 700; color: #475569; margin: 16px 0 6px 8px; }
    .cp-menu-group:first-child { margin-top: 4px; }
    .cp-menu-item {
      display: block; width: 100%; text-align: left;
      background: transparent !important; color: #334155 !important;
      border: none !important; padding: 10px 12px !important; margin: 2px 0 !important;
      border-radius: 8px !important; font-size: 14px !important; font-weight: 500;
      cursor: pointer; transition: 0.15s;
    }
    .cp-menu-item:hover { background: #f1f5f9 !important; }
    .cp-menu-item.active {
      background: #e8f0fe !important; color: #003cb3 !important; font-weight: 700 !important;
    }
    .cp-sidebar-divider { border-top: 1px solid #e2e8f0; margin: 18px 0; }
    .cp-sidebar-footer { font-size: 12.5px; color: #475569; padding: 0 8px; line-height: 1.6; }
    .cp-side-btn {
      margin-top: 8px !important; width: 100%;
      background: #f1f5f9 !important; color: #334155 !important;
      border: 1px solid #cbd5e1 !important; padding: 7px 10px !important;
      border-radius: 7px !important; font-size: 12.5px !important; font-weight: 600 !important;
      cursor: pointer;
    }
    .cp-side-btn:hover { background: #e2e8f0 !important; }

    #cpContent {
      flex: 1; margin-left: 225px; min-width: 0; padding: 24px;
      display: flex; flex-direction: column; align-items: center;
    }
    #cpContent > main {
      width: 100% !important; max-width: 920px !important;
      margin: 0 auto 20px !important; padding: 0 !important;
      display: block !important; visibility: visible !important; opacity: 1 !important;
    }
    #cpContent > main > * {
      max-width: 100% !important; margin-left: auto !important; margin-right: auto !important;
    }

    .cp-card {
      width: 100%; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 22px; margin-bottom: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      box-sizing: border-box;
    }
    .cp-studio-reg-card { max-width: 920px; margin: 0 auto 20px; border-top: 4px solid #003cb3; }
    .cp-list-card { max-width: 1200px; margin: 0 auto; }
    .cp-card-head {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 14px; gap: 10px; flex-wrap: wrap;
    }
    .cp-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 10px; }
    .cp-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 10px; }
    @media (max-width: 760px) {
      .cp-grid-2, .cp-grid-3 { grid-template-columns: 1fr; }
    }
    .cp-studio-reg-card .cp-field-label, .cp-modal-box .cp-field-label {
      font-size: 12.5px; font-weight: 700; color: #475569; margin-bottom: 8px; display: block;
    }
    .cp-studio-reg-card input:not([type="checkbox"]),
    .cp-studio-reg-card select,
    .cp-studio-reg-card textarea,
    .cp-modal-box input:not([type="checkbox"]),
    .cp-modal-box select,
    .cp-modal-box textarea {
      width: 100%; padding: 8px 10px !important; font-size: 13.5px !important;
      border: 1px solid #cbd5e1 !important; border-radius: 7px !important; margin-top: 4px !important;
      box-sizing: border-box;
    }

    .cp-toolbar { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; align-items: center; }
    .cp-toolbar input { max-width: 240px; }
    .cp-toolbar select { max-width: 170px; }

    .cp-opt-box {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 12px 14px; margin: 10px 0 14px;
    }
    .cp-opt-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .cp-opt-head span { font-size: 13px; font-weight: 700; color: #0f172a; }
    .cp-opt-add-btn {
      background: #0f172a !important; color: #fff !important; border: none !important;
      padding: 5px 11px !important; border-radius: 6px !important; font-size: 12px !important;
      font-weight: 600 !important; cursor: pointer; margin: 0 !important;
    }
    .cp-opt-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .cp-opt-table th { text-align: left; color: #64748b; padding: 4px 4px 6px; font-weight: 700; }
    .cp-opt-table td { padding: 3px 4px; }
    .cp-opt-table input { margin-top: 0 !important; padding: 6px 8px !important; font-size: 13px !important; }
    .cp-opt-del-btn {
      background: #fee2e2 !important; color: #dc2626 !important; border: none !important;
      padding: 6px 9px !important; border-radius: 6px !important; font-weight: 700 !important;
      cursor: pointer; margin: 0 !important;
    }

    .cp-notice-details {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 10px 14px; margin: 10px 0 14px;
    }
    .cp-notice-details summary {
      font-size: 13px; font-weight: 700; color: #0f172a; cursor: pointer; user-select: none;
    }
    .cp-notice-grid {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 12px; margin-top: 12px;
    }
    @media (max-width: 760px) { .cp-notice-grid { grid-template-columns: 1fr; } }

    .cp-margin-box {
      background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px;
      padding: 14px 16px; margin: 10px 0 14px;
    }
    .cp-margin-title { font-size: 13px; font-weight: 700; color: #0369a1; margin-bottom: 10px; }
    .cp-margin-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
    .cp-margin-row .cp-field-label { flex: 1; min-width: 110px; margin: 0 !important; font-size: 12px; color: #334155; }
    .cp-margin-result {
      margin-top: 12px; padding-top: 10px; border-top: 1px dashed #7dd3fc;
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 14px;
      font-size: 13px; font-weight: 700;
    }
    .cp-profit-pos { color: #15803d; }
    .cp-profit-neg { color: #dc2626; }
    .cp-calc-btn {
      background: #0284c7 !important; color: #fff !important; border: none !important;
      padding: 8px 12px !important; border-radius: 7px !important; font-size: 12.5px !important;
      font-weight: 600 !important; cursor: pointer; margin: 0 !important; height: 36px;
    }

    .cp-tag-count { font-size: 11.5px; font-weight: 700; color: #003cb3; margin-left: 6px; }
    .cp-tag-count.over { color: #dc2626; }

    .cp-table-wrap { width: 100%; overflow-x: auto; }
    .cp-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 1140px; }
    .cp-table th, .cp-table td {
      padding: 11px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: middle;
    }
    .cp-table th { background: #f8fafc; color: #334155; font-weight: 700; white-space: nowrap; }
    .cp-num-col { text-align: center !important; color: #64748b; font-weight: 700; }
    .cp-price-col { text-align: right !important; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .cp-margin-badge {
      display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 6px;
      border-radius: 5px; margin-top: 3px;
    }
    .cp-margin-badge.pos { background: #dcfce7; color: #15803d; }
    .cp-margin-badge.neg { background: #fee2e2; color: #b91c1c; }
    .cp-lf-sub { font-size: 11.5px; color: #64748b; margin-top: 2px; }
    .cp-link-btn {
      display: inline-block; background: #eff6ff; color: #1d4ed8;
      padding: 4px 9px; border-radius: 6px; font-size: 12px; font-weight: 600;
      text-decoration: none; white-space: nowrap;
    }
    .cp-link-btn:hover { background: #dbeafe; }
    .cp-worker-tag { font-size: 11px; color: #94a3b8; margin-top: 3px; }
    .cp-row-status { width: 100%; min-width: 125px; font-size: 12px !important; padding: 6px !important; }
    .cp-action-wrap { display: flex; gap: 5px; white-space: nowrap; }
    .cp-edit-btn {
      background: #2563eb !important; color: #fff !important;
      padding: 6px 10px !important; font-size: 12px !important; border-radius: 6px !important; margin: 0 !important;
    }
    .cp-del-btn {
      background: #ef4444 !important; color: #fff !important;
      padding: 6px 10px !important; font-size: 12px !important; border-radius: 6px !important; margin: 0 !important;
    }
    .cp-primary-btn {
      background: #003cb3 !important; color: #fff !important;
      padding: 9px 18px !important; border-radius: 8px !important; font-weight: 600 !important;
    }

    #cpEditModal, #cpLoginOverlay {
      position: fixed; inset: 0; z-index: 20000;
      background: rgba(15, 23, 42, 0.65);
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    #cpLoginOverlay { background: #f4f6fa; z-index: 30000; }
    #cpEditModal[hidden], #cpLoginOverlay[hidden] { display: none !important; }
    .cp-modal-box {
      background: #fff; width: 100%; max-width: 740px; max-height: 92vh; overflow-y: auto;
      border-radius: 14px; padding: 22px 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.18);
    }
    .cp-login-box { max-width: 380px; text-align: center; }
    .cp-login-box h2 { margin: 0 0 8px; color: #003cb3; font-size: 22px; }
    .cp-login-box p { margin: 0 0 20px; color: #64748b; font-size: 13.5px; }
    .cp-login-box input { margin-bottom: 12px; padding: 11px 12px !important; width: 100%; box-sizing: border-box; }
    .cp-login-err { color: #dc2626; font-size: 12.5px; min-height: 18px; margin-bottom: 10px; }
    .cp-modal-box h3 { margin: 0 0 14px; font-size: 18px; color: #0f172a; }
    .cp-modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .cp-cancel-btn {
      background: #e2e8f0 !important; color: #334155 !important;
      padding: 9px 16px !important; border-radius: 8px !important; font-weight: 600 !important;
    }
  `;
  style.textContent += `
    :root { --cp-ink:#17211d; --cp-muted:#6f7b75; --cp-line:#e4e8e5; --cp-bg:#f7f8f6; --cp-green:#174d39; --cp-sage:#e9f0eb; }
    html,body { font-family:Pretendard,"Noto Sans KR",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif !important; background:var(--cp-bg) !important; color:var(--cp-ink) !important; }
    #cpTopBar { background:rgba(255,255,255,.94) !important; backdrop-filter:blur(12px); border-bottom:1px solid var(--cp-line) !important; box-shadow:none !important; }
    .cp-brand-logo { background:var(--cp-green) !important; color:#fff !important; border-radius:9px !important; }
    #cpSidebar { width:216px !important; padding:22px 14px !important; background:#fff !important; border-right:1px solid var(--cp-line) !important; }
    #cpContent { margin-left:216px !important; padding:30px 34px !important; align-items:stretch !important; }
    #cpContent>main,.cp-studio-reg-card,#cpCollectView,#cpListView { max-width:1240px !important; width:100% !important; margin-left:auto !important; margin-right:auto !important; }
    .cp-nav-caption { padding:0 12px 16px; font-size:11px; font-weight:750; color:#98a19c; letter-spacing:.1em; }
    .cp-menu-item { display:flex !important; align-items:center; gap:12px; padding:12px 13px !important; margin:4px 0 !important; border-radius:11px !important; color:#59635e !important; font-weight:650 !important; }
    .cp-menu-item .cp-nav-num { width:26px;height:26px;display:grid;place-items:center;border:1px solid var(--cp-line);border-radius:8px;font-size:11px;color:#84908a;background:#fafbfa; }
    .cp-menu-item.active { background:var(--cp-sage) !important;color:var(--cp-green) !important; }.cp-menu-item.active .cp-nav-num { background:var(--cp-green);color:#fff;border-color:var(--cp-green); }
    .cp-card { border:1px solid var(--cp-line) !important;border-radius:16px !important;box-shadow:0 8px 28px rgba(31,48,40,.045) !important; }
    .cp-primary-btn,.cp-sync-btn { background:var(--cp-green) !important;border-color:var(--cp-green) !important;border-radius:10px !important; }.cp-sub-btn,.cp-cancel-btn,.cp-side-btn{border-radius:10px !important;}
    .cp-page-heading{margin:0 0 6px;font-size:28px;letter-spacing:-.04em;color:var(--cp-ink)}.cp-page-desc{margin:0 0 24px;color:var(--cp-muted);font-size:14px}
    .cp-metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}.cp-metric{padding:18px;background:#fff;border:1px solid var(--cp-line);border-radius:14px}.cp-metric-label{color:var(--cp-muted);font-size:12px;font-weight:650}.cp-metric-value{margin-top:8px;font-size:25px;font-weight:800;letter-spacing:-.04em}
    .cp-collect-grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(280px,.7fr);gap:16px}.cp-collect-url{display:flex;gap:9px;margin:16px 0}.cp-collect-url input{flex:1;height:46px;border:1px solid var(--cp-line);border-radius:10px;padding:0 14px;font-size:14px}
    .cp-ready-box{padding:16px;border:1px solid #dce6df;border-radius:12px;background:#f5f9f6}.cp-ready-title{font-size:13px;color:var(--cp-muted)}.cp-ready-name{font-size:17px;font-weight:760;margin:7px 0}.cp-ready-meta{font-size:13px;color:var(--cp-muted);line-height:1.7}.cp-rule-list{display:grid;gap:10px;margin-top:14px}.cp-rule{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid #edf0ee;font-size:13px}.cp-rule strong{color:var(--cp-green)}
    #cpListView .cp-excel-btn{display:none !important}@media(max-width:900px){.cp-metric-grid{grid-template-columns:repeat(2,1fr)}.cp-collect-grid{grid-template-columns:1fr}#cpContent{padding:20px}}
  `;
  style.textContent += `
    body{background:#e6eeea !important;}#cpTopBar{left:194px !important;height:54px !important;background:#f8faf9 !important;border-bottom:1px solid #d6dfda !important}.cp-brand-wrap{margin-left:18px}.cp-brand-logo{display:none !important}.cp-brand-title{color:#2d3933 !important;font-size:13px !important}.cp-top-right{margin-right:18px}
    #cpLayout{padding-top:54px !important}.cp-side-brand{display:flex;align-items:center;gap:8px;padding:4px 8px 18px;font-size:18px;color:#10271d}.cp-side-mark{font-size:22px;color:#174d39}.cp-side-gear{margin-left:auto;border:0;background:transparent;color:#7c8882;cursor:pointer}.cp-step-card{background:#fff;border:1px solid #dbe2de;border-radius:8px;padding:13px;margin:0 0 14px;box-shadow:0 2px 5px rgba(20,45,32,.08)}.cp-step-card strong{font-size:12px}.cp-step-track{height:4px;background:#e4e8e5;border-radius:10px;margin-top:10px;overflow:hidden}.cp-step-track span{display:block;height:100%;background:#22633f;border-radius:10px;transition:.25s}.cp-step-label{font-size:11px;color:#7a857f;padding:5px 10px}.cp-menu-item{min-height:54px !important}.cp-menu-item span:last-child{display:flex;flex-direction:column;gap:2px}.cp-menu-item b{font-size:13px}.cp-menu-item small{font-size:10px;font-weight:500;color:#748079}.cp-menu-item.active small{color:#d9eadf}.cp-menu-item.active{background:#174d39 !important;color:#fff !important}.cp-menu-item.active .cp-nav-num{background:transparent !important;border:0 !important}.cp-side-link{display:block;width:100%;border:0;background:transparent;text-align:left;padding:8px 12px;color:#3e4944;font-size:12px;cursor:pointer}.cp-sidebar-footer{margin-top:auto !important}
    #cpSidebar{width:194px !important;top:0 !important;padding:16px 10px !important;z-index:10002 !important}#cpContent{margin-left:194px !important;padding:28px !important;background:#f3f6f4 !important;min-height:calc(100vh - 54px)}
    .cp-page-crumb{font-size:11px;color:#748079;margin-bottom:18px}.cp-page-heading{font-size:18px !important;font-weight:800;margin-bottom:10px !important}.cp-url-row{display:flex;align-items:stretch;gap:8px;margin-bottom:22px}.cp-url-row textarea{flex:1;resize:none;border:1px solid #cad4ce;border-radius:6px;padding:12px;font:inherit;background:#fff}.cp-url-row button{min-width:150px}.cp-section-line{display:flex;align-items:center;justify-content:space-between;border-top:1px solid #d6ded9;padding-top:13px;margin-bottom:10px}.cp-section-line h2{font-size:14px;margin:0}.cp-section-line h2 span{color:#7a857f;font-weight:500}.cp-list-tools{display:flex;align-items:center;gap:8px;font-size:11px}.cp-list-tools input[placeholder]{width:130px;border:1px solid #ccd5d0;border-radius:6px;padding:7px 9px}.cp-product-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;max-height:calc(100vh - 260px);overflow:auto;padding-right:4px}.cp-product-card{background:#fff;border:1px solid #d4ddd8;border-radius:7px;padding:7px;box-shadow:0 1px 3px rgba(25,45,35,.05)}.cp-card-status{display:flex;justify-content:space-between;align-items:center;font-size:10px;margin-bottom:6px}.cp-card-status span{padding:3px 6px;border-radius:10px}.cp-card-status .success{background:#dcefe2;color:#176335}.cp-card-status .review{background:#ecebea;color:#646b67}.cp-card-status b{color:#8c4739}.cp-product-main{height:145px;background:#f0f1ef;border-radius:5px;overflow:hidden}.cp-product-main img{width:100%;height:100%;object-fit:contain}.cp-thumb-row{display:grid;grid-template-columns:repeat(5,1fr);gap:3px;margin:5px 0}.cp-thumb-row img{width:100%;height:38px;object-fit:cover;border-radius:4px;background:#eee}.cp-product-info{display:flex;flex-direction:column;gap:2px;font-size:10px;min-height:82px}.cp-product-info b{font-size:11px;line-height:1.35}.cp-product-info span,.cp-product-info p{margin:0;color:#4c5751}.cp-send-studio{width:100%;border:1px solid #2d6845;background:#fff;color:#174d39;border-radius:5px;padding:7px;font-weight:700;font-size:10px;cursor:pointer}.cp-send-studio:hover{background:#174d39;color:#fff}.cp-empty-card{grid-column:1/-1;background:#fff;border:1px dashed #bdcac3;border-radius:8px;padding:60px;text-align:center;color:#748079}
    #cpLayout[data-view="studio"] #cpContent{display:grid !important;grid-template-columns:minmax(500px,.9fr) minmax(580px,1.1fr);align-items:start;gap:16px}#cpLayout[data-view="studio"] #cpStudioRegSection{grid-column:1;margin:0 !important;max-width:none !important}#cpLayout[data-view="studio"] #cpContent>main{grid-column:2;margin:0 !important;max-width:none !important}.cp-studio-reg-card{border-top:1px solid var(--cp-line) !important}.cp-studio-reg-card .cp-card-head h2{font-size:18px}.cp-studio-reg-card input:not([type=checkbox]),.cp-studio-reg-card select,.cp-studio-reg-card textarea{background:#fff !important;border-color:#ccd5d0 !important}.cp-margin-box{background:#f5f7f5 !important;border-color:#d8dfdb !important}
    #cpListView .cp-list-card{padding:16px !important;max-width:none !important}.cp-toolbar{border:1px solid #d6ded9;border-radius:8px;padding:12px;background:#fff}.cp-table{min-width:1050px !important;font-size:11px !important}.cp-table th{background:#f1f4f2 !important;color:#25342c !important}.cp-table th,.cp-table td{padding:9px 6px !important}.cp-edit-btn,.cp-del-btn{background:#f4f5f4 !important;color:#34423b !important;border:1px solid #d2d9d5 !important}
    @media(max-width:1250px){.cp-product-grid{grid-template-columns:repeat(3,1fr)}#cpLayout[data-view="studio"] #cpContent{display:flex !important}}@media(max-width:850px){#cpSidebar{width:170px !important}#cpTopBar{left:170px !important}#cpContent{margin-left:170px !important}.cp-product-grid{grid-template-columns:repeat(2,1fr)}}
  `;
  style.textContent+=`#cpLayout:not([data-view="studio"]) #cpContent>main,#cpLayout:not([data-view="studio"]) #cpStudioRegSection,#cpLayout:not([data-view="collect"]) #cpCollectView,#cpLayout:not([data-view="stock"]) #cpListView,body>.appTop{display:none!important}.cp-product-info{font-size:12px;gap:5px}.lf29-stock{font-size:12px;line-height:1.65;white-space:pre-line}.lf29-note{font-size:13px;color:#465b50}.cp-product-grid .cp-product-card{display:flex;flex-direction:column;gap:6px;min-width:0;align-self:start}.lf-collect-fold>summary{cursor:pointer;color:#253e30;font-size:13px;line-height:1.5;overflow-wrap:anywhere}.lf-collect-fold>summary small{display:block;margin-left:1em;color:#4c5751;font-size:11px}.lf-collect-fold[open]>summary{margin-bottom:8px}.lf-collect-actions{display:flex;align-items:center;flex-wrap:wrap;gap:5px 8px;border-top:1px solid #e0e7e2;padding-top:6px;font-size:11px}.lf-collect-actions .cp-send-studio{width:auto;padding:4px 7px}.lf-stock-codes{display:block;white-space:normal;overflow-wrap:anywhere;font-size:12px;color:#304e3b}.cp-product-info a{color:#235b42}.cp-product-info{flex:1}`;
  style.textContent+=' #posted34[hidden]{display:none!important} #posted34{max-width:1240px;margin:auto} #lf31Library[hidden]{display:none!important} #lf31Library{max-width:1240px;margin:auto} #lf31Rows{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:16px 0} #lf31Preview pre{white-space:pre-wrap;line-height:1.6} #lf31Preview details{padding:10px;border-bottom:1px solid #dce4df}';
  style.textContent+=`#lf31Library #lf31Rows{display:block} .lf32wrap{overflow:auto}.lf32table{width:100%;border-collapse:collapse;margin:10px 0 20px}.lf32table th,.lf32table td{padding:10px;text-align:left;border-bottom:1px solid #dce4df;vertical-align:top;font-size:13px}.lf32table th{background:#f1f5f2;white-space:nowrap}.lf32table small,.lf32images small{display:block;color:#58685d}.lf32tools,.lf32summary{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:14px 0}.lf32summary{background:#eff4f0;padding:12px;border-radius:8px}.lf32tools [aria-pressed=true]{background:#174d39!important;color:white!important}.lf32images{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px}.lf32images img{height:115px;max-width:100%;object-fit:contain}.lf32images small{overflow-wrap:anywhere}`;
  document.head.appendChild(style);

  const studioMain = document.querySelector("main");

  const topBar = document.createElement("header");
  topBar.id = "cpTopBar";
  topBar.innerHTML = `
    <div class="cp-brand-wrap"><span class="cp-brand-logo">LF</span><span class="cp-brand-title" id="cpCurrentTitle">상품 수집</span></div>
    <div class="cp-top-right"><button type="button" id="btnQuickSave" class="cp-sync-btn">재고 관리에 등록</button></div>
  `;

  const layout = document.createElement("div");
  layout.id = "cpLayout";

  const sidebar = document.createElement("aside");
  sidebar.id = "cpSidebar";
  sidebar.innerHTML = `
    <div class="cp-side-brand"><span class="cp-side-mark">◇</span><strong>쿠팡 자동화</strong></div>
    <div class="cp-step-card"><div><strong id="cpStepText">1 / 5 단계</strong></div><div class="cp-step-track"><span id="cpStepBar"></span></div></div>
    <div class="cp-step-label">진행 단계</div>
    <button type="button" class="cp-menu-item active" data-view="collect"><span class="cp-nav-num">1</span><span><b>상품 수집</b><small>LF몰 후보 수집·보관</small></span></button>
    <button type="button" class="cp-menu-item" data-view="studio"><span class="cp-nav-num">2</span><span><b>상품 제작</b><small>상세페이지·옵션·사이즈표</small></span></button>
    <button type="button" class="cp-menu-item" data-view="library"><span class="cp-nav-num">3</span><span><b>상품리스트</b><small>완성 이미지 · 쿠팡 업로드 자료</small></span></button>
    <button type="button" class="cp-menu-item" data-view="posted"><span class="cp-nav-num">4</span><span><b>올린 상품</b><small>실제 등록 후 직접 기록</small></span></button>
    <button type="button" class="cp-menu-item" data-view="stock"><span class="cp-nav-num">5</span><span><b>재고 관리</b><small>상품 리스트·수정 관리</small></span></button>
    <div class="cp-sidebar-divider"></div><div class="cp-sidebar-footer"><div id="cpUserEmail"></div><button type="button" id="btnLogout" class="cp-side-btn">로그아웃</button></div>
  `;

  const content = document.createElement("div");
  content.id = "cpContent";

  const collectView = document.createElement("section");
  collectView.id = "cpCollectView";
  collectView.innerHTML=`<h1 class="cp-page-heading">상품 수집 보관함</h1><p class="lf29-note">LF몰 상품 페이지에서 ‘이 상품 저장’을 누르면 여기에 누적됩니다. 같은 색상 재수집은 갱신되고, 같은 상품의 여러 색상은 한 카드에 보관됩니다. 기존 카드는 체크한 후 같은 상품으로 묶을 수 있습니다.</p><div class="cp-section-line"><h2>보관 상품 <span id="cpCollectTotal"></span></h2><div class="cp-list-tools"><input id="cpCollectSearch" aria-label="보관 상품 검색" placeholder="상품명·품번·색상"><button type="button" id="lfRemove">선택 삭제</button><button id="lfMerge" type="button">선택 색상 묶기</button><button id="btnCollectSync" type="button">목록 새로고침</button></div></div><p id="lfConnection" role="status"></p><div id="cpCollectedGrid" class="cp-product-grid"></div>`;
  const listView = document.createElement("div");
  listView.id = "cpListView";
  listView.hidden = true;
  listView.style.width = "100%";
  listView.innerHTML = `
    <div class="cp-card cp-list-card">
      <div class="cp-card-head">
        <div><h1 class="cp-page-heading" style="font-size:26px;">4. 재고 관리</h1><p class="cp-page-desc" style="margin-bottom:0;">제작된 상품의 재고와 상태를 관리합니다. 총 <span id="mCount">0</span>개</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" id="btnExportExcel" class="cp-excel-btn">📥 쿠팡 일괄등록 엑셀 다운로드</button>
          <button type="button" id="btnRefresh" class="cp-primary-btn">새로고침</button>
        </div>
      </div>
      <div class="cp-toolbar">
        <select id="mMonthFilter"><option value="ALL">전체 월 보기</option></select>
        <select id="mFilter"><option value="ALL">등록 상품 전체</option><option value="zero">판매 재고 0 포함</option><option value="review">확인 필요 포함</option></select>
        <input id="mSearch" type="text" placeholder="상품명, 품번, 태그 검색...">
      </div>
      <div class="cp-table-wrap">
        <table class="cp-table">
          <thead>
            <tr>
              <th>대표 이미지</th><th>등록일</th><th>상품명 / 품번</th><th>LF몰</th><th>색상 · 사이즈</th><th>판매 재고</th><th>최대혜택가</th><th>정가</th><th>판매가</th><th>관리</th>
            </tr>
          </thead>
          <tbody id="mTableBody"></tbody>
        </table>
      </div>
    </div>
  `;

  function buildFormHTML(p, isStudio = false) {
    const mainOpts = Object.keys(CATEGORY_TREE)
      .map(k => `<option value="${k}">${k}</option>`).join("");
    const noticeInputs = NOTICE_FIELDS.map(([key, label]) => {
      const defVal = key === "size" ? NOTICE_SIZE_TEXT : key === "asInfo" ? "상세페이지 참고" : "";
      return `<label class="cp-field-label">${label}<input id="${p}Notice_${key}" type="text" value="${defVal}" ${key === "size" ? "readonly" : ""} placeholder="비워두면 '상세페이지 참조'로 자동 입력"></label>`;
    }).join("");

    return `
      <div class="cp-grid-3">
        <label class="cp-field-label">업로드 날짜<input id="${p}UploadDate" type="date" value="${formatDate()}"></label>
        <label class="cp-field-label">브랜드<input id="${p}Brand" type="text" placeholder="예: 닥스"></label>
        <label class="cp-field-label">진행 상태
          <select id="${p}Status">
            <option value="수집완료">1. 수집완료</option>
            <option value="상세페이지 제작중" ${isStudio ? "selected" : ""}>2. 상세페이지 제작중</option>
            <option value="재고 관리">재고 관리</option><option value="업로드 완료">이전 업로드 완료 기록</option>
          </select>
        </label>
      </div>

      <div class="cp-grid-2">
        <label class="cp-field-label">쿠팡 상품명 (필수)<input id="${p}Name" type="text" placeholder="쿠팡 노출용 상품명"></label>
        <label class="cp-field-label">LF몰 제품명<input id="${p}LfName" type="text" placeholder="소싱처(LF몰) 원본 상품명"></label>
      </div>

      <div class="cp-grid-2">
        <label class="cp-field-label">카테고리 중분류
          <select id="${p}CatMain">
            <option value="">중분류 선택</option>
            ${mainOpts}
          </select>
        </label>
        <label class="cp-field-label">세부 카테고리
          <select id="${p}CatSub">
            <option value="">먼저 중분류를 선택하세요</option>
          </select>
        </label>
      </div>

      <div class="cp-opt-box">
        <div class="cp-opt-head">
          <span>🎨 옵션 관리 (색상 · 상품코드 · 사이즈 · 재고 최대 10개)</span>
          <button type="button" id="${p}BtnAddOpt" class="cp-opt-add-btn">+ 옵션 행 추가</button>
        </div>
        <table class="cp-opt-table">
          <thead>
            <tr>
              <th style="width:22%;">색상</th>
              <th style="width:32%;">상품 코드 (품번)</th>
              <th style="width:20%;">사이즈</th>
              <th style="width:18%;">재고 (최대 10)</th>
              <th style="width:8%;"></th>
            </tr>
          </thead>
          <tbody id="${p}OptBody"></tbody>
        </table>
      </div>

      <label class="cp-field-label">
        검색 태그 (최대 20개, 쉼표 또는 / 구분)
        <span id="${p}TagCount" class="cp-tag-count">0 / 20개</span>
        <input id="${p}Tags" type="text" placeholder="예: 남성니트, 카라니트, 출근룩, 봄니트, 데일리룩">
      </label>

      <div class="cp-grid-3">
        <label class="cp-field-label">상품링크 (URL)<input id="${p}SourceUrl" type="url" placeholder="https://www.lfmall.co.kr/..."></label>
        <label class="cp-field-label">대표이미지 URL<input id="${p}ThumbUrl" type="url" placeholder="https://..."></label>
        <label class="cp-field-label">상세설명 이미지 URL<input id="${p}DetailImgUrl" type="url" placeholder="https://..."></label>
      </div>

      <div class="cp-grid-3">
        <label class="cp-field-label">최대혜택가 / 소싱가 (원)<input id="${p}DiscountPrice" class="cp-money-input" type="text" inputmode="numeric" placeholder="예: 69,000"></label>
        <label class="cp-field-label">쿠팡 판매가 (자동 계산 또는 직접 입력)<input id="${p}Price" class="cp-money-input" type="text" inputmode="numeric" placeholder="자동 계산됨"></label>
        <label class="cp-field-label">정가 (할인율기준가/원)<input id="${p}RegularPrice" class="cp-money-input" type="text" inputmode="numeric" placeholder="예: 129,000"></label>
      </div>

      <div class="cp-margin-box">
        <div class="cp-margin-title">🧮 판매가 기준 목표 마진 계산 (수수료·배송비 차감 / 1,000원 단위 반올림)</div>
        <div class="cp-margin-row">
          <label class="cp-field-label">수수료율 (%)<input id="${p}FeeRate" type="number" step="0.01" value="${DEFAULT_FEE_RATE}"></label>
          <label class="cp-field-label">배송비 부담 (원)<input id="${p}Shipping" class="cp-money-input" type="text" inputmode="numeric" value="${DEFAULT_SHIPPING}"></label>
          <label class="cp-field-label">목표 마진 / 판매가 (%)<input id="${p}TargetMargin" type="number" min="0" step="0.01" value="${DEFAULT_TARGET_MARGIN}"></label>
          <button type="button" id="${p}BtnCalcPrice" class="cp-calc-btn">판매가 자동 계산</button>
        </div>
        <div id="${p}MarginResult" class="cp-margin-result">
          <span>소싱가를 입력하면 두 계산 기준을 비교합니다.</span>
        </div>
      </div>

      <details class="cp-notice-details">
        <summary>📋 상품정보제공고시 (의류 9개 항목 · 클릭해서 펼치기)</summary>
        <div class="cp-notice-grid">${noticeInputs}</div>
      </details>

      <label class="cp-field-label">상세페이지 문구 / 메모
        <textarea id="${p}Copy" rows="3" placeholder="CHECK POINT 문구나 메모를 입력하세요"></textarea>
      </label>
    `;
  }

  const studioRegSection = document.createElement("section");
  studioRegSection.id = "cpStudioRegSection";
  studioRegSection.className = "cp-card cp-studio-reg-card";
  studioRegSection.innerHTML = `
    <div class="cp-card-head">
      <h2 style="margin:0;">2. 상품 제작 정보</h2>
      <button type="button" id="btnSyncFromStudio" class="cp-sub-btn">수집값 자동 반영</button>
    </div>
    ${buildFormHTML("s", true)}
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px;">
      <button type="button" id="btnResetStudioReg" class="cp-cancel-btn">입력 초기화</button>
      <button type="button" id="btnSaveFromStudioSection" class="cp-primary-btn">재고 관리에 등록</button>
    </div>
  `;

  const editModal = document.createElement("div");
  editModal.id = "cpEditModal";
  editModal.hidden = true;
  editModal.innerHTML = `
    <div class="cp-modal-box">
      <h3>✏️ 상품 정보 수정</h3>
      ${buildFormHTML("e", false)}
      <div class="cp-modal-footer">
        <button type="button" id="btnCancelEdit" class="cp-cancel-btn">취소</button>
        <button type="button" id="btnSaveEdit" class="cp-primary-btn">저장하기</button>
      </div>
    </div>
  `;

  const loginOverlay = document.createElement("div");
  loginOverlay.id = "cpLoginOverlay";
  loginOverlay.hidden = true;
  loginOverlay.innerHTML = `
    <div class="cp-modal-box cp-login-box">
      <h2>🔐 쿠팡 자동화 로그인</h2>
      <p>승인된 팀원 계정으로 로그인하세요.</p>
      <input id="cpLoginEmail" type="email" placeholder="이메일 (예: admin@team.com)">
      <input id="cpLoginPw" type="password" placeholder="비밀번호">
      <div id="cpLoginErr" class="cp-login-err"></div>
      <button type="button" id="btnLoginSubmit" class="cp-primary-btn" style="width:100%;padding:12px !important;">로그인</button>
    </div>
  `;

  content.appendChild(collectView);
  content.appendChild(studioRegSection);
  if (studioMain) content.appendChild(studioMain);
  content.appendChild(listView);
  layout.appendChild(sidebar);
  layout.appendChild(content);

  document.body.insertBefore(topBar, document.body.firstChild);
  document.body.insertBefore(layout, topBar.nextSibling);
  document.body.appendChild(editModal);
  document.body.appendChild(loginOverlay);

  cleanUnwantedUI();
  
  setTimeout(() => {
    cleanUnwantedUI();
    scrollPageToTop();
    
  }, 300);

  document.addEventListener("input", e => {
    if (e.target.classList.contains("cp-money-input")) {
      e.target.value = formatComma(e.target.value);
    }
    if (e.target.classList.contains("opt-stock")) {
      const clamped = clampStock(e.target.value);
      if (String(clamped) !== e.target.value && e.target.value !== "") {
        e.target.value = clamped;
      }
    }
  });

  function getNoticeFromForm(p) {
    const obj = {};
    NOTICE_FIELDS.forEach(([k]) => {
      const val = document.getElementById(`${p}Notice_${k}`)?.value.trim() || "";
      obj[k] = k === "size" ? NOTICE_SIZE_TEXT : k === "asInfo" ? (val || "상세페이지 참고") : val;
    });
    return obj;
  }

  function setNoticeToForm(p, notice = {}) {
    NOTICE_FIELDS.forEach(([k]) => {
      const el = document.getElementById(`${p}Notice_${k}`);
      if (el) {
        if (k === "size") el.value = NOTICE_SIZE_TEXT;
        else if (k === "asInfo") el.value = notice?.[k] || "상세페이지 참고";
        else el.value = notice?.[k] || "";
      }
    });
  }

  function setupCategorySelects(p) {
    const mainEl = document.getElementById(`${p}CatMain`);
    const subEl = document.getElementById(`${p}CatSub`);
    function fillSub(selectedSub = "") {
      const subs = CATEGORY_TREE[mainEl.value] || [];
      subEl.innerHTML = subs.length
        ? subs.map(s => `<option value="${s}">${s}</option>`).join("")
        : `<option value="">먼저 중분류를 선택하세요</option>`;
      if (selectedSub && subs.includes(selectedSub)) subEl.value = selectedSub;
    }
    mainEl.addEventListener("change", () => fillSub());
    return {
      setPath(fullPath) {
        const { main, sub } = parseCategoryPath(fullPath);
        mainEl.value = main;
        fillSub(sub);
      },
      getPath() {
        return buildCategoryPath(mainEl.value, subEl.value);
      }
    };
  }

  const studioCatCtrl = setupCategorySelects("s");
  const editCatCtrl = setupCategorySelects("e");

  function setupOptionTable(p) {
    const tbody = document.getElementById(`${p}OptBody`);
    function addRow(opt = { color: "", code: "", size: "", stock: 0 }) {
      const safeStock = clampStock(opt.stock ?? 0);
      const esc=v=>String(v??" ").trim().replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      const tr = document.createElement("tr");
      tr.dataset.stockStatus=opt.stockStatus||"unknown";
      tr.innerHTML = `
        <td><input type="text" class="opt-color" placeholder="예: 블랙" value="${esc(opt.color)}"></td>
        <td><input type="text" class="opt-code" placeholder="예: DMSW6D301BK" value="${esc(opt.code)}"></td>
        <td><input type="text" class="opt-size" placeholder="예: 100" value="${esc(opt.size)}"></td>
        <td><input type="number" class="opt-stock" min="0" max="${MAX_STOCK}" value="${safeStock}"></td>
        <td><button type="button" class="cp-opt-del-btn">×</button></td>
      `;
      tr.querySelector(".cp-opt-del-btn").addEventListener("click", () => {
        if (tbody.children.length > 1) tr.remove();
        else tr.querySelectorAll("input").forEach(i => (i.value = i.classList.contains("opt-stock") ? 0 : ""));
      });
      tr.querySelector(".opt-stock").oninput=()=>tr.dataset.stockStatus="manual";
      tbody.appendChild(tr);
    }
    document.getElementById(`${p}BtnAddOpt`).addEventListener("click", () => {
      const last = tbody.lastElementChild;
      addRow({
        color: last?.querySelector(".opt-color")?.value || "",
        code: last?.querySelector(".opt-code")?.value || "",
        size: "",
        stock: 0
      });
    });
    addRow();
    return {
      setOptions(list) {
        tbody.innerHTML = "";
        if (Array.isArray(list) && list.length) list.forEach(o => addRow(o));
        else addRow();
      },
      getOptions() {
        return [...tbody.querySelectorAll("tr")].map(tr => ({
          color: tr.querySelector(".opt-color").value.trim(),
          code: tr.querySelector(".opt-code").value.trim(),
          size: tr.querySelector(".opt-size").value.trim(),
          stockStatus:tr.dataset.stockStatus||"unknown",
          stock: clampStock(tr.querySelector(".opt-stock").value)
        })).filter(o => o.color || o.code || o.size);
      }
    };
  }

  const studioOptCtrl = setupOptionTable("s");
  const editOptCtrl = setupOptionTable("e");

  function setupTagCounter(p) {
    const input = document.getElementById(`${p}Tags`);
    const badge = document.getElementById(`${p}TagCount`);
    function context() {
      const data = p === 's' ? bridgeMakerData : null;
      return { colors: data?.colors, options: (p === 's' ? studioOptCtrl : editOptCtrl).getOptions(), notice: getNoticeFromForm(p) };
    }
    function update() {
      const n = parseTags(input.value, context(), Infinity).length;
      badge.textContent = n > 20 ? '20 / 20개 (초과분 제외)' : n+' / 20개';
      badge.classList.toggle('over', n > 20);
    }
    input.addEventListener('input', update);
    input.addEventListener('blur', () => { input.value = parseTags(input.value, context()).join(', '); update(); });
    return update;
  }

  const updateStudioTags = setupTagCounter("s");
  const updateEditTags = setupTagCounter("e");

  function bindMarginCalc(p, autoFillOnCostChange = false) {
    const costEl = document.getElementById(`${p}DiscountPrice`);
    const priceEl = document.getElementById(`${p}Price`);
    const feeEl = document.getElementById(`${p}FeeRate`);
    const shipEl = document.getElementById(`${p}Shipping`);
    const targetEl = document.getElementById(`${p}TargetMargin`);
    const resEl = document.getElementById(`${p}MarginResult`);

    let mode = autoFillOnCostChange ? 'auto' : 'manual';
    let source = '직접 입력';
    const quote = () => priceQuote(costEl.value,targetEl.value,feeEl.value,shipEl.value);
    function applyTarget(force=false) {
      const q=quote();
      if (!q && force) alert('소싱가와 계산 조건을 확인하세요. 수수료율과 목표 마진율의 합은 100% 미만이어야 합니다.');
      if (force && q) mode='auto';
      if (mode==='auto') priceEl.value=q?formatComma(q.sale):'';
    }
    function update() {
      const q=quote(), sale=parseNum(priceEl.value), rows=['원가 근거: '+source];
      if(q){
        const base=calcMargin(q.c,Math.round(q.markup),q.f,q.sh);
        rows.push('판매가 기준: ('+formatWon(q.c)+' + 배송비 '+formatWon(q.sh)+') ÷ (1 − 수수료 '+q.f+'% − 목표 '+q.t+'%) = '+formatWon(Math.round(q.raw))+' → 추천 '+formatWon(q.sale),
          '비교만: 원가에 '+q.t+'% 가산 = '+formatWon(Math.round(q.markup))+' (수수료·배송비 차감 후 판매가 대비 '+base.rate.toFixed(2)+'%)');
      } else rows.push(parseNum(costEl.value)?'계산 불가: 수수료율·목표율은 0 이상, 합계는 100% 미만이어야 합니다.':'LF 최대혜택가 또는 실제 매입 원가를 확인해 입력하세요.');
      if(sale>0 && parseNum(costEl.value)>0 && feeEl.value!=='' && Number(feeEl.value)>=0 && Number(feeEl.value)<100){
        const r=calcMargin(costEl.value,sale,feeEl.value,shipEl.value);
        rows.push('적용 판매가 '+formatWon(sale)+' ('+(mode==='auto'?'자동':'직접 입력·저장값')+') · 수수료 '+formatWon(r.fee)+' · 배송비 '+formatWon(parseNum(shipEl.value)),
          '예상 이익(부가세 차감 전) '+formatWon(r.profit)+' / 판매가 = '+r.rate.toFixed(2)+'% · 추정 부가세 '+formatWon(r.vat)+' 차감 후 '+formatWon(r.profitAfterVat)+' ('+r.rateAfterVat.toFixed(2)+'%)');
      }
      resEl.replaceChildren(...rows.map(row=>{const s=document.createElement('div');s.style.flexBasis='100%';s.textContent=row;return s}));
    }
    costEl.addEventListener('input',()=>{source='직접 입력';applyTarget();update()});
    [feeEl,shipEl,targetEl].forEach(el=>el.addEventListener('input',()=>{applyTarget();update()}));
    priceEl.addEventListener('input',()=>{mode='manual';update()});
    document.getElementById(p+'BtnCalcPrice').addEventListener('click',()=>{applyTarget(true);update()});
    function loadCost(value,note,replaceSale) {source=note;costEl.value=value?formatComma(value):'';if(replaceSale)mode='auto';applyTarget();update()}
    function reset(saved=false) { mode=saved?'manual':'auto';source=saved?'저장된 소싱가':'직접 입력';update() }
    return {update,applyTarget,loadCost,reset};
  }

  const studioMarginCtrl = bindMarginCalc("s", true);
  const editMarginCtrl = bindMarginCalc("e", false);

  async function readStudioAndExtensionData() {
    const brand = document.querySelector('input[placeholder="닥스"]')?.value.trim() || "";
    const code = document.querySelector('input[placeholder="DMSW6D301BK"]')?.value.trim() || "";
    const kind = document.querySelector('input[placeholder="긴팔 카라 니트"]')?.value.trim() || "";
    const studioCopy = document.getElementById("copy")?.value.trim() || "";
    const firstImg = document.querySelector("#lfReceived img")?.src || "";
    const generatedAssets = readGeneratedStudioAssets();

    const storageData=bridgeMakerData||{};
    const defaultName = storageData.lfName || storageData.title || [brand,kind,code].filter(Boolean).join(" ");
    const collectedOptions = (Array.isArray(storageData.options) && storageData.options.length)
      ? storageData.options.map(o => ({ ...o, stock: clampStock(o.stock ?? 0) }))
      : (code ? [{ color: "", code, size: "", stock: 0, stockStatus: "unknown", requiresReview: true }] : []);

    const colorsFromOpts = [...new Set(collectedOptions.map(o => o.color).filter(Boolean))];
    const colorText = (Array.isArray(storageData.colors) && storageData.colors.length)
      ? storageData.colors.join(", ")
      : colorsFromOpts.join(", ");

    const mergedNotice = {
      ...(storageData.notice || {}),
      color: colorText || storageData.notice?.color || "",
      size: NOTICE_SIZE_TEXT,
      asInfo: "상세페이지 참고"
    };

    const tagContext = { options: collectedOptions, colors: storageData.colors, notice: mergedNotice };
    const importedTags = parseTags(storageData.seoTags, tagContext);
    const autoTags = importedTags.length ? importedTags : buildSeoTagsFromFields({
      name: defaultName, lfName: storageData.lfName || storageData.title || "",
      code: collectedOptions[0]?.code || code, material: mergedNotice.material || "", ...tagContext
    });

    return {
      brand,
      code,
      defaultName,
      lfName: storageData.lfName || storageData.title || "",
      sourceUrl: storageData.url || "",
      thumbUrl: generatedAssets.thumbUrl || storageData.thumbUrl || firstImg,
      detailImgUrl: generatedAssets.detailImgUrl || "",
      discountPrice: parseNum(storageData.discountPrice),
      priceRequiresReview: storageData.priceRequiresReview!==false,
      priceMixed: new Set((storageData.variants||[]).map(v=>parseNum(v.discountPrice))).size>1,
      regularPrice: Number(storageData.regularPrice) || 0,
      options: collectedOptions,
      colors: Array.isArray(storageData.colors) ? storageData.colors : colorsFromOpts,
      items: Array.isArray(storageData.items) ? storageData.items : [],
      seoTags: autoTags,
      measuredSizes: storageData.measuredSizes || null,
      notice: mergedNotice,
      studioCopy
    };
  }

  async function syncFromStudioPanel(showToast = true, overwrite = false) {
    cleanUnwantedUI();
    
    const d = await readStudioAndExtensionData();
    if (d.brand && (overwrite || !document.getElementById("sBrand").value)) {
      document.getElementById("sBrand").value = d.brand;
    }
    if (d.defaultName && !document.getElementById("sName").value) {
      document.getElementById("sName").value = d.defaultName;
    }
    if (d.lfName && (overwrite || !document.getElementById("sLfName").value)) {
      document.getElementById("sLfName").value = d.lfName;
    }
    if (d.sourceUrl && (overwrite || !document.getElementById("sSourceUrl").value)) {
      document.getElementById("sSourceUrl").value = d.sourceUrl;
    }
    if (d.thumbUrl && (overwrite || !document.getElementById("sThumbUrl").value)) {
      document.getElementById("sThumbUrl").value = d.thumbUrl;
    }
    if (d.detailImgUrl && (overwrite || !document.getElementById("sDetailImgUrl").value)) {
      document.getElementById("sDetailImgUrl").value = d.detailImgUrl;
    }
    if (overwrite || (d.seoTags?.length && !document.getElementById("sTags").value)) {
      document.getElementById("sTags").value = d.seoTags.join(", ");
      updateStudioTags();
    }
    if (overwrite || !parseNum(document.getElementById('sDiscountPrice').value)) {
      const unsure=d.priceRequiresReview || d.priceMixed;
      const note=d.priceMixed?'색상별 소싱가가 다릅니다. 보관함 색상별 가격에서 확인 후 직접 입력하세요.':unsure?'수집값 미확인'+(d.discountPrice?' (대표 후보 '+formatWon(d.discountPrice)+')':'')+' · LF 원본 확인 후 직접 입력하세요.':'LF 수집 최대혜택가 ('+formatWon(d.discountPrice)+') · 실제 구매 조건 확인';
      studioMarginCtrl.loadCost(unsure?0:d.discountPrice,note,overwrite || !parseNum(document.getElementById('sPrice').value));
    }
    if (overwrite || !parseNum(document.getElementById('sRegularPrice').value)) document.getElementById('sRegularPrice').value=d.regularPrice?formatComma(d.regularPrice):'';
    if (d.studioCopy && (overwrite || !document.getElementById("sCopy").value)) {
      document.getElementById("sCopy").value = d.studioCopy;
    }
    if (d.options.length) {
      studioOptCtrl.setOptions(d.options);
    }
    if (d.notice && Object.values(d.notice).some(Boolean)) {
      setNoticeToForm("s", d.notice);
    }
    if (d.measuredSizes?.rows?.length) {
      applyMeasuredSizesToStudio(d.measuredSizes);
    }
    if (d.notice?.material) {
      applyFabricMaterialToStudio(d.notice.material);
    }

    studioMarginCtrl.update();
    if (showToast) alert("📥 확장프로그램 수집값(옵션·고시정보·가격·실측사이즈·소재·SEO태그·상품명·이미지)을 반영했습니다!");
  }

  document.getElementById("btnSyncFromStudio").addEventListener("click", () => syncFromStudioPanel(true, true));

  document.getElementById("btnResetStudioReg").addEventListener("click", () => {
    ["sBrand", "sName", "sLfName", "sTags", "sSourceUrl", "sThumbUrl", "sDetailImgUrl", "sDiscountPrice", "sPrice", "sRegularPrice", "sCopy"]
      .forEach(id => (document.getElementById(id).value = ""));
    document.getElementById("sUploadDate").value = formatDate();
    restorePriceTerms('s');
    studioCatCtrl.setPath("");
    studioOptCtrl.setOptions([]);
    setNoticeToForm("s", { asInfo: "상세페이지 참고" });
    updateStudioTags();
    studioMarginCtrl.reset();
  });

  function updateAuthUI() {
    if (typeof posted34!=='undefined'&&!posted34.hidden)showPosted34();
    if (authState?.idToken) {
      loginOverlay.hidden = true;
      document.getElementById("cpUserEmail").textContent = `👤 ${authState.email}`;

      scrollPageToTop();
    } else {
      loginOverlay.hidden = false;
      document.getElementById("cpUserEmail").textContent = "";
    }
  }

  async function login(email, password) {
    const errEl = document.getElementById("cpLoginErr");
    errEl.textContent = "로그인 확인 중...";
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "로그인 실패");
      saveAuth({
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        email: data.email,
        expiresAt: Date.now() + Number(data.expiresIn || 3600) * 1000 - 60000
      });
      errEl.textContent = "";
      document.getElementById("cpLoginPw").value = "";
      updateAuthUI();
      if (!listView.hidden) fetchProducts();
    } catch {
      errEl.textContent = "로그인 실패: 이메일 또는 비밀번호를 확인하세요.";
    }
  }

  async function refreshTokenIfNeeded(force = false) {
    if (!authState?.refreshToken) return false;
    if (!force && Date.now() < (authState.expiresAt || 0)) return true;
    try {
      const res = await fetch(REFRESH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(authState.refreshToken)}`
      });
      const data = await res.json();
      if (!res.ok) throw new Error("토큰 갱신 실패");
      saveAuth({
        ...authState,
        idToken: data.id_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000 - 60000
      });
      return true;
    } catch {
      saveAuth(null);
      updateAuthUI();
      return false;
    }
  }

  async function authFetch(url, options = {}) {
    const ok = await refreshTokenIfNeeded(false);
    if (!ok || !authState?.idToken) {
      updateAuthUI();
      throw new Error("로그인이 필요합니다.");
    }
    const headers = { ...(options.headers || {}), Authorization: `Bearer ${authState.idToken}` };
    let res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      const refreshed = await refreshTokenIfNeeded(true);
      if (refreshed) {
        headers.Authorization = `Bearer ${authState.idToken}`;
        res = await fetch(url, { ...options, headers });
      }
    }
    return res;
  }

  document.getElementById("btnLoginSubmit").addEventListener("click", () => {
    const email = document.getElementById("cpLoginEmail").value.trim();
    const pw = document.getElementById("cpLoginPw").value;
    if (!email || !pw) return (document.getElementById("cpLoginErr").textContent = "이메일과 비밀번호를 입력하세요.");
    login(email, pw);
  });

  document.getElementById("cpLoginPw").addEventListener("keydown", e => {
    if (e.key === "Enter") document.getElementById("btnLoginSubmit").click();
  });

  document.getElementById("btnLogout").addEventListener("click", () => {
    if (confirm("로그아웃 할까요?")) {
      saveAuth(null);
      updateAuthUI();
    }
  });

  const menuButtons = sidebar.querySelectorAll(".cp-menu-item");
  const titleEl = document.getElementById("cpCurrentTitle");
  const quickSaveBtn = document.getElementById("btnQuickSave");
  const titles = { collect: "상품 수집", studio: "상품 제작", library:"상품리스트",posted:"올린 상품",stock: "재고 관리" };

  const el=id=>document.getElementById(id);
  const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e};
  function safeLink(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:''}catch{return ''}}
  function money(n){return Number(n)>0?formatWon(n):'미확인'}
  function updateCollectView(){const grid=el('cpCollectedGrid');grid.replaceChildren();const q=el('cpCollectSearch').value.trim().toLowerCase();const list=archive.filter(d=>[d.lfName,d.code,...d.colors].join(' ').toLowerCase().includes(q));el('cpCollectTotal').textContent=list.length+' / '+archive.length+'개';el('lfConnection').textContent=connected?'현재 Chrome 프로필의 수집 자료':'수집 확장 프로그램 연결 대기 중. 확장 프로그램과 사이트 파일을 함께 업데이트했는지 확인하세요.';
    for(const d of list){const a=node('article',null,'cp-product-card'), info=node('div',null,'cp-product-info');const images=d.items||[];const main=node('div',null,'cp-product-main');const im=node('img');im.loading='lazy';im.alt=d.lfName;const front=images.find(x=>x.role==='앞면')||images[0];if(safeLink(front?.url))im.src=front.url;main.append(im);const thumbs=node('div',null,'cp-thumb-row');for(const color of d.colors){const subset=images.filter(x=>x.color===color),pic=subset.find(x=>x.role==='앞면')||subset[0];if(!pic)continue;const tag=node('span');const i=node('img');i.loading='lazy';i.alt=color;i.src=safeLink(pic.url);tag.append(i,node('small',color));thumbs.append(tag)}info.append(node('b',d.lfName||'상품명 미확인'),node('span',[d.code,...d.colors].join(' · ')),node('p','최대혜택가 '+money(d.discountPrice)+' / 정가 '+money(d.regularPrice)+(d.priceRequiresReview?' · 확인 필요':'')),node('p','원본 '+images.length+'장 · '+(d.savedAt?formatDate(d.savedAt):'이전 자료')),node('p',(d.options||[]).map(o=>(o.size||'사이즈 미확인')+' : '+(o.stockStatus==='unknown'?'수량 미확인':(o.sourceStock??o.stock)+'개')).join(' / ')||'재고 미확인'));
    const link=node('a','LF몰 원본 보기');link.href=safeLink(d.url);link.target='_blank';link.rel='noopener noreferrer';info.append(link);const btn=node('button','이 상품 제작','cp-send-studio');btn.onclick=()=>{if(bridgeMakerData?.id===d.id)return switchView('studio');const u=new URL(location.href);location.assign(path32(u.href,'studio',d.id))};const pick=node('label');const check=node('input');check.type='checkbox';check.value=d.id;check.className='lfMergePick';pick.append(check,document.createTextNode(' 묶을 상품 선택'));if(d.variants?.length>1){const variants=node('details');variants.append(node('summary','색상별 품번·가격 '+d.variants.length+'개'));for(const v of d.variants){const line=node('p',v.colors.join(', ')+' · '+v.code+' · 최대혜택가 '+money(v.discountPrice)+' / 정가 '+money(v.regularPrice));const lk=node('a',' 원본 보기');lk.href=safeLink(v.url);lk.target='_blank';lk.rel='noopener';line.append(lk);variants.append(line)}info.append(variants)}const del=node('button','보관함에서 삭제');del.type='button';del.onclick=()=>removeFromArchive([d.id]);const fold=node('details',null,'lf-collect-fold'), summary=node('summary'), title=node('strong',d.lfName||'상품명 미확인');
    const meta=node('small',[d.code||'품번 미확인','색상 '+d.colors.length+'개','최대혜택가 '+money(d.discountPrice)+(d.priceRequiresReview?' (확인 필요)':'')].join(' · '));
    summary.append(title,meta);fold.append(summary,main,thumbs,info);const actions=node('div',null,'lf-collect-actions');actions.append(pick,btn,del);a.append(fold,actions);grid.append(a)}if(!list.length)grid.append(node('div',connected?(q?'검색 결과가 없습니다.':'아직 보관된 상품이 없습니다.'):'보관함 연결 중','cp-empty-card'))}
  const library31=document.createElement('section');library31.id='lf31Library';library31.hidden=true;library31.className='cp-card';library31.innerHTML='<h1>상품리스트</h1><p>제작실에서 저장한 완성본입니다. 이 브라우저에 보관되며 원본 수집 카드와 독립적입니다.</p><label>완성 상품 검색 <input id="lf31Query" placeholder="상품명 또는 품번"></label><div class="lf32tools"><label hidden>이전 상태 <select id="lf32Filter"><option>전체</option><option>등록 대기</option><option>등록 완료</option></select></label><label>정렬 <select id="lf32Sort"><option>최근 수정순</option><option>상품명순</option></select></label><span id="lf32Count"></span></div><div id="lf31Rows"></div><section id="lf31Preview" aria-live="polite"></section>';content.append(library31);
  const libEl=id=>document.getElementById(id),libUrls=[];let renderRev=0,previewRev=0,db31;
  function registration34(p,date){return {id:p.id,owner:p.owner,name:p.name,price:p.price,code:p.code,options:(p.options||[]).map(o=>({color:o.color||'',size:o.size||'',code:o.code||''})),date:date||'',wing:'',memo:''}}
  function conn31(){return db31||(db31=new Promise((ok,no)=>{const r=indexedDB.open('lf-product-library-31',2);r.onupgradeneeded=e=>{const db=r.result;for(const n of ['info','images','posted'])if(!db.objectStoreNames.contains(n))db.createObjectStore(n);if(e.oldVersion===1){const tx=r.transaction,cur=tx.objectStore('info').openCursor();cur.onsuccess=()=>{const c=cur.result;if(!c)return;if(c.value.uploaded&&c.value.owner)tx.objectStore('posted').put(registration34(c.value,''),c.key);c.continue()}}};r.onblocked=()=>{const a=document.getElementById('lfConnection');if(a)a.textContent='저장소 갱신 대기 중입니다. 다른 제작실 탭을 닫아 주세요.'};r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();db31=null};ok(r.result)};r.onerror=()=>{db31=null;no(r.error)}}))}
  async function readLib31(store,key){const db=await conn31();return new Promise((ok,no)=>{const t=db.transaction(store),s=t.objectStore(store),r=key===undefined?s.getAll():s.get(key);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
  async function persist31(meta,images){const db=await conn31();return new Promise((ok,no)=>{const t=db.transaction(['info','images'],'readwrite');t.objectStore('info').put(meta,meta.id);t.objectStore('images').put(images,meta.id);t.oncomplete=ok;t.onerror=t.onabort=()=>no(t.error||Error('저장 취소'))})}
  function clearPreview31(){previewRev++;libEl('lf31Preview').replaceChildren();for(const u of libUrls.splice(0))URL.revokeObjectURL(u)}
  function libButton(title,fn){const b=document.createElement('button');b.type='button';b.textContent=title;b.onclick=async()=>{b.disabled=true;try{await fn()}catch(e){alert(e.message)}finally{b.disabled=false}};return b}
  function info31(p){return [p.name,'품번: '+p.code,'브랜드: '+p.brand,'판매가: '+(p.price||'미입력'),'검색어: '+p.tags,'LF몰 링크: '+p.url,'','옵션',...p.options.map(o=>[o.color,o.size,o.code,'판매 수량 '+o.stock].join(' / ')),'','상품정보제공고시',...NOTICE_FIELDS.map(([k,l])=>l+': '+(p.notice[k]||'확인 필요'))].join('\n')}
  function download31(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),30000)}
async function removeFinished33(p){if(!confirm('「'+p.name+'」의 저장된 완성 이미지와 상품정보를 상품리스트에서 삭제할까요? 수집 보관함·재고 관리·쿠팡에는 영향이 없습니다.'))return;const db=await conn31();await new Promise((ok,no)=>{const t=db.transaction(['info','images'],'readwrite'),meta=t.objectStore('info'),r=meta.get(p.id);t.oncomplete=ok;t.onabort=t.onerror=()=>no(t.error||Error('삭제할 수 없습니다. 소유 계정과 상품을 확인하세요.'));r.onsuccess=()=>{if(!authState?.email||r.result?.owner!==authState.email){t.abort();return}meta.delete(p.id);t.objectStore('images').delete(p.id)}});clearPreview31();await render31()}
  const posted34=node('section',null,'cp-card');posted34.hidden=true;posted34.id='posted34';const postedRows34=node('div'),postedQuery34=node('input');postedQuery34.placeholder='상품명 · 색상 품번 · 쿠팡 상품번호';postedQuery34.setAttribute('aria-label','올린 상품 검색');posted34.append(node('h1','올린 상품'),node('p','직접 등록한 시점의 별도 기록입니다. 완성본·재고를 변경하지 않으며 쿠팡과 연동되지 않습니다.'),postedQuery34,postedRows34);content.append(posted34);postedQuery34.oninput=()=>showPosted34();let postedRev34=0;
 async function writePosted34(p,action){const db=await conn31();await new Promise((ok,no)=>{const t=db.transaction('posted','readwrite'),s=t.objectStore('posted'),r=s.get(p.id);let err='';r.onsuccess=()=>{const prev=r.result;if(!authState?.email||p.owner!==authState.email||(prev&&prev.owner!==authState.email)){err='계정을 확인하세요.';t.abort();return}if(action==='new'){if(prev){err='이미 올린 상품 장부에 기록되어 있습니다.';t.abort();return}s.add(p,p.id)}else if(!prev){err='기록이 없습니다.';t.abort()}else if(action==='delete')s.delete(p.id);else s.put({...prev,wing:p.wing,memo:p.memo,date:p.date},p.id)};t.oncomplete=ok;t.onerror=t.onabort=()=>no(Error(err||'장부 저장 실패'))})}
 async function mark32(p){if(!confirm('쿠팡에 직접 올린 상품인가요? 현재 완성본의 정보를 별도 장부에 복사합니다. 쿠팡으로 전송하지 않습니다.'))return;await writePosted34(registration34(p,formatDate()),'new');switchView('posted')}
 async function showPosted34(){const rev=++postedRev34,email=authState?.email;postedRows34.replaceChildren();if(!email||posted34.hidden)return;try{const list=(await readLib31('posted')).filter(p=>p.owner===email).sort((a,b)=>(b.date||'').localeCompare(a.date||''));if(rev!==postedRev34||authState?.email!==email||posted34.hidden)return;const q=postedQuery34.value.trim().toLowerCase();const rows=[];for(const p of list){const codes=[...new Set((p.options||[]).map(o=>[o.color,o.code||'품번 미확인'].filter(Boolean).join(' ')))];if(![p.name,p.code,p.wing,...codes].join(' ').toLowerCase().includes(q))continue;const summary=node('div');summary.append(node('b',p.name),node('small',codes.join(' / ')||p.code));const date=node('input'),wing=node('input'),memo=node('input');date.type='date';date.value=p.date||'';wing.value=p.wing||'';memo.value=p.memo||'';date.setAttribute('aria-label','실제 등록일');wing.setAttribute('aria-label','쿠팡 상품번호');memo.setAttribute('aria-label','작업 메모');const bar=node('div');bar.append(libButton('기록 저장',async()=>{await writePosted34({...p,date:date.value,wing:wing.value.trim(),memo:memo.value.trim()},'edit');await showPosted34()}),libButton('장부에서 삭제',async()=>{if(!confirm('이 등록 기록만 삭제할까요? 상품리스트·재고·쿠팡에는 영향이 없습니다.'))return;await writePosted34(p,'delete');await showPosted34()}));rows.push([summary,p.price||'미입력',date,wing,memo,bar])}postedRows34.append(rows.length?table32(['상품 / 색상별 품번','등록 당시 판매가','실제 등록일','쿠팡 상품번호','메모','관리'],rows):node('p',q?'검색 결과가 없습니다.':'아직 직접 기록한 상품이 없습니다. 상품리스트에서 「올린 상품에 기록」을 누르세요.'))}catch(e){if(rev===postedRev34)postedRows34.textContent=e.message}}

  function table32(head,rows){const wrap=node('div'),t=node('table');wrap.className='lf32wrap';t.className='lf32table';const h=t.createTHead().insertRow();for(const x of head)h.append(node('th',x));const body=t.createTBody();for(const vs of rows){const tr=body.insertRow();for(const x of vs){const td=tr.insertCell();if(x instanceof Node)td.append(x);else td.textContent=String(x??'')}}wrap.append(t);return wrap}
  function libMatches32(p,q,filter){return(filter==='전체'||(p.uploaded?'등록 완료':'등록 대기')===filter)&&[p.name,p.brand,p.code,...(p.colors||[]),...(p.options||[]).map(o=>o.code)].join(' ').toLowerCase().includes(q)}
  async function preview31(p){p=listingFields(p);clearPreview31();const rev=previewRev;const area=libEl('lf31Preview');const bar=node('div',null,'lf32tools');bar.append(node('h2',p.name),libButton('상세 닫기',clearPreview31));const info=node('div',null,'lf32summary');info.append(node('b',p.brand+' · '+p.code),node('span','판매가 '+(p.price||'미입력')),node('span',(p.colors||[]).join(' / ')));const tabs=node('div',null,'lf32tools'),body=node('div');area.append(bar,info,tabs,body);let tabRev=0;let assets=null;const fetchAssets=()=>assets||(assets=readLib31('images',p.id));
    const show=async tab=>{const seq=++tabRev;body.replaceChildren();for(const u of libUrls.splice(0))URL.revokeObjectURL(u);for(const b of tabs.querySelectorAll('button[data-tab]'))b.setAttribute('aria-pressed',String(b.dataset.tab===tab));if(tab==='기본정보'){body.append(table32(['항목','값'],[['상품명',p.name],['브랜드',p.brand],['품번',p.code],['검색어',p.tags],['원본',p.url]]),libButton('상품 정보 복사',()=>navigator.clipboard.writeText(info31(p))));return}if(tab==='옵션·재고'){body.append(table32(['색상','사이즈','품번','판매수량'],(p.options||[]).map(o=>[o.color,o.size,o.code,String(o.stock??'미확인')+(o.stockStatus==='unknown'?' (확인 필요)':'')])));return}if(tab==='상품고시'){body.append(table32(['고시 항목','내용'],NOTICE_FIELDS.map(([k,l])=>[l,p.notice?.[k]||'확인 필요'])));return}const files=(await fetchAssets())||[];if(rev!==previewRev||seq!==tabRev)return;
    for(const section of ['대표 이미지','상세페이지','추가 이미지']){const group=files.filter(f=>(f.path.endsWith('/대표.png')?'대표 이미지':f.path.startsWith('업로드용_상세페이지/')?'상세페이지':'추가 이미지')===section);if(!group.length)continue;const box=node('details');box.open=section==='대표 이미지';box.append(node('summary',section+' '+group.length+'장'));const grid=node('div',null,'lf32images');for(const f of group){const cell=node('div'),u=URL.createObjectURL(f.blob);libUrls.push(u);const thumb=node('img');thumb.src=u;thumb.alt=f.path;thumb.loading='lazy';const view=node('a');view.href=u;view.target='_blank';view.rel='noopener';view.title='원본 크기로 보기';view.append(thumb);cell.append(view,node('small',f.path),libButton('다운로드',()=>download31(f.blob,f.path.replaceAll('/','_'))));grid.append(cell)}box.append(grid);body.append(box)}};
    for(const name of ['기본정보','옵션·재고','상품고시','이미지']){const b=libButton(name,()=>show(name));b.dataset.tab=name;tabs.append(b)}tabs.append(libButton('업로드 자료 다운로드',async()=>{const files=await fetchAssets();download31(await window.LF31Pack([...files.map(f=>[f.path,f.blob]),['상품정보.txt',new Blob(['\uFEFF'+info31(p)],{type:'text/plain;charset=utf-8'})]]),(p.code||'상품')+'_업로드자료.zip')}));await show('기본정보');area.scrollIntoView({block:'start'})}
  let page32=0,pageKey32='';async function render31(){const rev=++renderRev,area=libEl('lf31Rows');try{const email=authState?.email;if(!email){area.textContent='로그인 후 확인하세요.';return}const all=(await readLib31('info')).filter(p=>p.owner===email);if(rev!==renderRev||library31.hidden)return;const q=libEl('lf31Query').value.trim().toLowerCase(),filter=libEl('lf32Filter').value,sort=libEl('lf32Sort').value;const list=all.filter(p=>libMatches32(p,q,filter)).sort((a,b)=>sort==='상품명순'?a.name.localeCompare(b.name,'ko'):b.updated-a.updated);libEl('lf32Count').textContent=list.length+' / '+all.length+'개';area.replaceChildren();if(!list.length){area.textContent=all.length?'조건에 맞는 상품이 없습니다.':'아직 저장된 완성 상품이 없습니다.';return}const pk=[q,filter,sort].join('|');if(pk!==pageKey32){page32=0;pageKey32=pk}const pages=Math.ceil(list.length/20);page32=Math.min(page32,pages-1);const subset=list.slice(page32*20,page32*20+20);area.append(table32(['상품명 / 품번','판매가','옵션','저장일','작업 상태','자료','관리'],subset.map(p=>{const tag=node('div');tag.append(node('strong',p.name),node('small',p.code));const mark=libButton('올린 상품에 기록',()=>mark32(p));mark.title='현재 자료를 별도 장부에 복사합니다. 쿠팡으로 전송되지 않습니다.';return [tag,p.price||'미입력',(p.options||[]).length+'개',new Date(p.updated).toLocaleDateString('ko-KR'),mark,libButton('열기',()=>preview31(p)),libButton('삭제',()=>removeFinished33(p))]})));if(pages>1){const nav=node('div',null,'lf32tools'),back=libButton('이전',()=>{page32--;return render31()}),next=libButton('다음',()=>{page32++;return render31()});back.disabled=page32===0;next.disabled=page32+1===pages;nav.append(back,node('span',(page32+1)+' / '+pages),next);area.append(nav)}}catch(e){area.textContent='목록 조회 실패: '+e.message}}
  libEl('lf31Query').oninput=render31;libEl('lf32Filter').onchange=render31;libEl('lf32Sort').onchange=render31;
  const save31Btn=libButton('완성본을 상품리스트에 저장',async()=>{if(!bridgeMakerData||!authState?.email)throw Error('로그인 후 제작할 상품을 선택하세요.');if(!window.LF31Files)throw Error('studio-core.js를 최신 파일로 교체하세요.');const files=window.LF31Files(),d=bridgeMakerData;const meta={id:JSON.stringify([authState.email,d.id]),owner:authState.email,updated:Date.now(),count:files.length,name:libEl('sName').value.trim()||d.lfName,brand:libEl('sBrand').value,code:d.code,url:d.url,colors:[...d.colors],options:studioOptCtrl.getOptions(),notice:getNoticeFromForm('s'),tags:libEl('sTags').value,price:libEl('sPrice').value,cost:parseNum(libEl('sDiscountPrice').value),priceTerms:priceTerms('s')};await persist31(listingFields(meta),files);switchView('library');await preview31(meta)});save31Btn.className='cp-primary-btn';(document.getElementById('out')||studioRegSection).append(save31Btn);
  function switchView(name,boot=false){if(!boot&&name!=='studio')pendingId=null;if(name==='studio'&&!bridgeMakerData){name='collect';el('lfConnection').textContent='먼저 보관함에서 제작할 상품을 선택하세요.'}if(!boot)history.replaceState(history.state,'',path32(location.href,name,bridgeMakerData?.id));layout.dataset.view=name;const inMaker=name==='studio';menuButtons.forEach(b=>{b.classList.toggle('active',b.dataset.view===name);b.setAttribute('aria-current',b.dataset.view===name?'page':'false')});titleEl.textContent=titles[name];collectView.hidden=name!=='collect';studioRegSection.hidden=!inMaker;if(studioMain)studioMain.hidden=!inMaker;listView.hidden=name!=='stock';quickSaveBtn.hidden=!inMaker;quickSaveBtn.style.display=inMaker?'':'none';const step=['collect','studio','library','posted','stock'].indexOf(name)+1;el('cpStepText').textContent='현재 '+step+' / 5 단계';el('cpStepBar').style.width=step*100/5+'%';posted34.hidden=name!=='posted';if(name==='posted')showPosted34();else{postedRev34++;postedRows34.replaceChildren()}library31.hidden=name!=='library';if(name==='library')render31();else clearPreview31();if(name==='stock'&&authState?.idToken)fetchProducts();scrollPageToTop()}
  let archiveVersion31=false;const deleteRequests31=new Map();const poll=()=>window.postMessage({type:'LF29_POLL'},location.origin);
  window.addEventListener('message',async e=>{if(e.source!==window||e.origin!==location.origin)return;const msg=e.data;if(msg?.type==='LF31_DELETED'&&deleteRequests31.has(msg.rid)){clearTimeout(deleteRequests31.get(msg.rid));deleteRequests31.delete(msg.rid);if(msg.error){el('lfConnection').textContent='삭제 실패: '+msg.error;return}archive=msg.records;updateCollectView();el('lfConnection').textContent='보관함에서 '+msg.ids.length+'개 상품을 삭제했습니다.';return}if(msg?.type==='LF29_LIST')archiveVersion31=msg.version>=31;if(msg?.type==='LF29_ERROR'){el('lfConnection').textContent=msg.message;return}if(msg?.type!=='LF29_LIST'||!Array.isArray(msg.records))return;connected=true;archive=msg.records.filter(d=>d?.id&&Array.isArray(d.items)&&Array.isArray(d.colors));updateCollectView();if(!pendingId||mounting)return;const selected=archive.find(d=>d.id===pendingId);if(!selected){pendingId=null;switchView('collect');el('lfConnection').textContent='선택한 상품을 찾지 못했습니다.';return}pendingId=null;mounting=true;bridgeMakerData=selected;try{switchView('studio');setNativeInputValue(document.getElementById('code'),selected.code);setNativeInputValue(document.getElementById('brand'),(selected.lfName.match(/헤지스|닥스|질스튜어트|마에스트로|알레그리/i)||[])[0]);setNativeInputValue(document.querySelector('input[placeholder="긴팔 카라 니트"]'),selected.lfName);await syncFromStudioPanel(false,true);if(typeof window.LF29Mount!=='function')throw Error('사이트 bridge.js를 함께 교체하세요.');await window.LF29Mount(selected)}catch(err){alert('선택 상품 불러오기: '+err.message)}finally{mounting=false}});
  menuButtons.forEach(b=>b.onclick=()=>switchView(b.dataset.view));sidebar.querySelectorAll('.cp-side-link').forEach(b=>b.onclick=()=>switchView(b.dataset.go));const removeFromArchive=ids=>{const found=archive.filter(g=>ids.includes(g.id));if(!found.length)return alert('삭제할 상품을 선택하세요.');if(confirm(found.map(g=>g.lfName+' ('+g.colors.join(', ')+')').join('\n')+'\n선택한 '+found.length+'개 상품과 해당 색상들을 수집 보관함에서 삭제할까요? 재고 관리 등록 정보는 유지됩니다.')){if(!archiveVersion31)return alert('삭제를 지원하는 최신 content.js가 연결되지 않았습니다. 확장 프로그램과 이 탭을 새로고침하세요.');const rid=crypto.randomUUID();deleteRequests31.set(rid,setTimeout(()=>{deleteRequests31.delete(rid);el('lfConnection').textContent='삭제 응답이 없습니다. 확장 프로그램을 다시 로드한 뒤 목록을 새로고침하세요.'},6000));el('lfConnection').textContent='삭제 확인 중…';window.postMessage({type:'LF31_DELETE',ids,rid},location.origin)}};el('lfRemove').onclick=()=>removeFromArchive([...document.querySelectorAll('.lfMergePick:checked')].map(b=>b.value));el('lfMerge').onclick=()=>{const ids=[...document.querySelectorAll('.lfMergePick:checked')].map(x=>x.value);if(ids.length<2)return alert('같은 상품의 색상 카드 두 개 이상을 체크하세요.');if(confirm('선택한 카드들을 같은 상품의 색상 옵션으로 묶을까요?'))window.postMessage({type:'LF30_MERGE',ids},location.origin)};el('btnCollectSync').onclick=poll;el('cpCollectSearch').oninput=updateCollectView;switchView(entry32.view==='studio'?'collect':entry32.view,true);updateCollectView();poll();

  function updateMonthOptions() {
    const select = document.getElementById("mMonthFilter");
    const prev = select.value;
    const months = [...new Set(
      products.map(p => (p.uploadDate || "").slice(0, 7)).filter(Boolean)
    )].sort((a, b) => b.localeCompare(a));

    select.innerHTML = `<option value="ALL">전체 월 보기</option>`;
    months.forEach(ym => {
      const [y, m] = ym.split("-");
      const opt = document.createElement("option");
      opt.value = ym;
      opt.textContent = `${y}년 ${Number(m)}월`;
      select.appendChild(opt);
    });
    if (months.includes(prev)) select.value = prev;
  }

  function getFilteredProducts() {
    const kw = document.getElementById("mSearch").value.trim().toLowerCase();
    const filter = document.getElementById("mFilter").value;
    const monthFilter = document.getElementById("mMonthFilter").value;
    return products.filter(p => {
      const optCodes = (p.options || []).map(o => o.code).join(" ").toLowerCase();
      const matchText = p.options.some(o=>[o.color,o.size].join(" ").toLowerCase().includes(kw)) ||
        p.name.toLowerCase().includes(kw) ||
        p.lfName.toLowerCase().includes(kw) ||
        p.code.toLowerCase().includes(kw) ||
        optCodes.includes(kw) ||
        p.tags.toLowerCase().includes(kw) ||
        p.copy.toLowerCase().includes(kw);
      if(!['재고 관리','업로드 완료'].includes(p.status))return false;
      const opts=p.options||[];const matchStatus=filter==='ALL'||(filter==='zero'?opts.some(o=>o.stock===0):opts.some(o=>!o.stockStatus||o.stockStatus==='unknown'));
      const matchMonth = monthFilter === "ALL" || (p.uploadDate || "").startsWith(monthFilter);
      return matchText && matchStatus && matchMonth;
    });
  }

  async function fetchProducts() {
    const tbody = document.getElementById("mTableBody");
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:30px;">데이터 불러오는 중...</td></tr>`;
    try {
      const docs=[];let token='';do{const u=new URL(BASE_URL);u.searchParams.set('key',API_KEY);u.searchParams.set('pageSize','100');if(token)u.searchParams.set('pageToken',token);const res=await authFetch(u.href);const json=await res.json();if(!res.ok)throw Error(json.error?.message||'조회 실패');docs.push(...(json.documents||[]));token=json.nextPageToken||''}while(token);
      products = docs.map(doc => {
        const f = doc.fields || {};
        const createdAt = Number(f.createdAt?.integerValue || f.createdAt?.doubleValue || 0);
        let options = [];
        let notice = {};
        try { options = JSON.parse(f.optionsJson?.stringValue || "[]"); } catch { options = []; }
        try { notice = JSON.parse(f.noticeJson?.stringValue || "{}"); } catch { notice = {}; }
        return {
          id: doc.name.split("/").pop(),
          uploadDate: f.uploadDate?.stringValue || formatDate(createdAt || Date.now()),
          brand: f.brand?.stringValue || "",
          category: f.category?.stringValue || "",
          name: f.name?.stringValue || "",
          lfName: f.lfName?.stringValue || "",
          code: f.code?.stringValue || "",
          options: options.map(o => ({ ...o, stock: clampStock(o.stock ?? 0) })),
          notice: { ...notice, size: NOTICE_SIZE_TEXT, asInfo: notice?.asInfo || "상세페이지 참고" },
          tags: parseTags(f.tags?.stringValue, { options, notice }).join("/"),
          sourceUrl: f.sourceUrl?.stringValue || "",
          thumbUrl: f.thumbUrl?.stringValue || "",
          detailImgUrl: f.detailImgUrl?.stringValue || "",
          priceTerms:(()=>{try{return JSON.parse(f.priceTermsJson?.stringValue||'{}')}catch{return {}}})(),
          discountPrice: Number(f.discountPrice?.integerValue || f.discountPrice?.doubleValue || 0),
          price: Number(f.price?.integerValue || f.price?.doubleValue || 0),
          regularPrice: Number(f.regularPrice?.integerValue || f.regularPrice?.doubleValue || 0),
          status: f.status?.stringValue || "수집완료",
          copy: f.copy?.stringValue || "",
          author: f.author?.stringValue || "",
          updatedBy: f.updatedBy?.stringValue || "",
          createdAt
        };
      }).sort((a, b) => b.uploadDate.localeCompare(a.uploadDate) || b.createdAt - a.createdAt);

      updateMonthOptions();
      renderList();
    } catch (err) {
      tbody.replaceChildren();const errRow=tbody.insertRow();const errCell=errRow.insertCell();errCell.colSpan=10;errCell.textContent='조회 실패: '+err.message;
    }
  }

  async function saveToFirebase(item) {
    item = listingFields(item);
    const user = getUserName();
    const firstCode = item.code || (item.options?.[0]?.code || "");
    const safeOpts = (item.options || []).map(o => ({ ...o, stock: clampStock(o.stock ?? 0) }));
    const mergedNotice = { ...(item.notice || {}), asInfo: item.notice?.asInfo || "상세페이지 참고" };

    const payload = {
      fields: {
        uploadDate: { stringValue: item.uploadDate || formatDate() },
        brand: { stringValue: item.brand || "" },
        category: { stringValue: item.category || "" },
        name: { stringValue: item.name },
        lfName: { stringValue: item.lfName || "" },
        code: { stringValue: firstCode },
        optionsJson: { stringValue: JSON.stringify(safeOpts) },
        noticeJson: { stringValue: JSON.stringify(mergedNotice) },
        tags: { stringValue: parseTags(item.tags).join("/") },
        sourceUrl: { stringValue: item.sourceUrl || "" },
        thumbUrl: { stringValue: item.thumbUrl || "" },
        detailImgUrl: { stringValue: item.detailImgUrl || "" },
        discountPrice: { integerValue: String(Math.round(item.discountPrice || 0)) },
        price: { integerValue: String(Math.round(item.price || 0)) },
        regularPrice: { integerValue: String(Math.round(item.regularPrice || 0)) },
        priceTermsJson:{stringValue:JSON.stringify(item.priceTerms||{})},
        status: { stringValue: item.status || "상세페이지 제작중" },
        copy: { stringValue: item.copy || "" },
        author: { stringValue: user },
        updatedBy: { stringValue: user },
        createdAt: { integerValue: String(Date.now()) }
      }
    };
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(bridgeMakerData.id))),v=>v.toString(16).padStart(2,'0')).join('');
    const res = await authFetch(BASE_URL+'?key='+API_KEY+'&documentId=lf29_'+digest, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw Error(res.status===409?'이미 등록된 상품입니다. 재고 관리에서 수정하세요.':(await res.json()).error?.message||'저장 실패');
  }

  async function updateProductInFirebase(id, item) {
    item = listingFields(item);
    const fieldKeys = [
      "uploadDate", "brand", "category", "name", "lfName", "code", "optionsJson", "noticeJson", "tags",
      "sourceUrl", "thumbUrl", "detailImgUrl", "discountPrice", "price", "regularPrice", "priceTermsJson",
      "status", "copy", "updatedBy"
    ];
    const masks = fieldKeys.map(f => `updateMask.fieldPaths=${f}`).join("&");
    const firstCode = item.code || (item.options?.[0]?.code || "");
    const safeOpts = (item.options || []).map(o => ({ ...o, stock: clampStock(o.stock ?? 0) }));
    const mergedNotice = { ...(item.notice || {}), asInfo: item.notice?.asInfo || "상세페이지 참고" };

    const payload = {
      fields: {
        uploadDate: { stringValue: item.uploadDate || formatDate() },
        brand: { stringValue: item.brand || "" },
        category: { stringValue: item.category || "" },
        name: { stringValue: item.name },
        lfName: { stringValue: item.lfName || "" },
        code: { stringValue: firstCode },
        optionsJson: { stringValue: JSON.stringify(safeOpts) },
        noticeJson: { stringValue: JSON.stringify(mergedNotice) },
        tags: { stringValue: parseTags(item.tags).join("/") },
        sourceUrl: { stringValue: item.sourceUrl || "" },
        thumbUrl: { stringValue: item.thumbUrl || "" },
        detailImgUrl: { stringValue: item.detailImgUrl || "" },
        discountPrice: { integerValue: String(Math.round(item.discountPrice || 0)) },
        price: { integerValue: String(Math.round(item.price || 0)) },
        regularPrice: { integerValue: String(Math.round(item.regularPrice || 0)) },
        priceTermsJson:{stringValue:JSON.stringify(item.priceTerms||{})},
        status: { stringValue: item.status },
        copy: { stringValue: item.copy || "" },
        updatedBy: { stringValue: getUserName() }
      }
    };
    const res = await authFetch(`${BASE_URL}/${id}?${masks}&key=${API_KEY}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("수정 실패");
  }

  async function updateStatusOnly(id, newStatus) {
    await authFetch(`${BASE_URL}/${id}?updateMask.fieldPaths=status&updateMask.fieldPaths=updatedBy&key=${API_KEY}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          status: { stringValue: newStatus },
          updatedBy: { stringValue: getUserName() }
        }
      })
    });
  }

  async function deleteProduct(id) {
    if (!confirm("이 상품을 삭제할까요?")) return;
    await authFetch(`${BASE_URL}/${id}?key=${API_KEY}`, { method: "DELETE" });
    fetchProducts();
  }

  document.getElementById("btnExportExcel").addEventListener("click", async () => {
    const list = getFilteredProducts();
    if (!list.length) return alert("다운로드할 상품이 없습니다.");

    try {
      const XLSX = await loadSheetJS();
      const COL_COUNT = 117;

      const row1 = new Array(COL_COUNT).fill("");
      row1[0] = "기본정보"; row1[9] = "구매옵션"; row1[21] = "검색옵션";
      row1[61] = "구성 정보"; row1[88] = "고시정보"; row1[103] = "이미지";
      row1[109] = "상품 상세 설명"; row1[110] = "구비서류";

      const row2 = new Array(COL_COUNT).fill("");
      ["카테고리", "등록상품명", "판매시작일", "판매종료일", "상품상태", "상태설명", "브랜드", "제조사", "검색어"]
        .forEach((h, i) => (row2[i] = h));
      for (let i = 0; i < 6; i++) { row2[9 + i * 2] = `옵션유형${i + 1}`; row2[10 + i * 2] = `옵션값${i + 1}`; }
      for (let i = 0; i < 20; i++) { row2[21 + i * 2] = `옵션유형${i + 1}`; row2[22 + i * 2] = `옵션값${i + 1}`; }
      [
        "판매가격", "판매대행수수료", "할인율기준가", "재고수량", "출고리드타임",
        "인당최대구매수량", "최대구매수량기간(일)", "성인상품(19)", "과세여부", "병행수입여부",
        "해외구매대행", "업체상품코드", "모델번호", "바코드",
        "인증∙신고 등 정보유형", "인증∙신고 등 정보값", "인증∙이동통신 사전승낙서 또는 인증대리점 인증서", "인증∙판매점 사전승낙 인증마크 또는 이동통신사 대리점 인증마크",
        "인증∙신고 등 정보유형", "인증∙신고 등 정보값", "인증∙이동통신 사전승낙서 또는 인증대리점 인증서", "인증∙판매점 사전승낙 인증마크 또는 이동통신사 대리점 인증마크",
        "인증∙신고 등 정보유형", "인증∙신고 등 정보값", "인증∙이동통신 사전승낙서 또는 인증대리점 인증서", "인증∙판매점 사전승낙 인증마크 또는 이동통신사 대리점 인증마크",
        "주문 추가메시지"
      ].forEach((h, i) => (row2[61 + i] = h));
      row2[88] = "상품고시정보 카테고리";
      for (let i = 1; i <= 14; i++) row2[88 + i] = `상품고시정보값${i}`;
      ["대표(옵션)이미지", "대표이미지(직사각형)", "추가이미지", "상태이미지(중고상품)", "중복 이미지", "이미지 퀄리티"]
        .forEach((h, i) => (row2[103 + i] = h));
      row2[109] = "상세 설명";
      for (let i = 1; i <= 7; i++) row2[109 + i] = `구비서류값${i}`;

      const row3 = new Array(COL_COUNT).fill("");
      [0, 1, 6, 7, 61, 63, 64, 65, 88, 103, 109].forEach(idx => (row3[idx] = "필수"));
      const row4 = new Array(COL_COUNT).fill("");
      row4[0] = "쿠팡 일괄등록 자동생성 파일 (5행부터 데이터)";

      const aoa = [row1, row2, row3, row4];

      list.forEach(p => {
        const brandVal = p.brand || (p.name.split(" ")[0] || "자체브랜드");
        const opts = (p.options && p.options.length)
          ? p.options
          : [{ color: "", code: p.code || "", size: "", stock: 0, stockStatus: "unknown", requiresReview: true }];
        const allColorsStr = [...new Set(opts.map(o => o.color).filter(Boolean))].join(", ");
        const n = p.notice || {};

        opts.forEach(opt => {
          const r = new Array(COL_COUNT).fill("");
          r[0] = p.category || "";
          r[1] = p.name || "";
          r[2] = p.uploadDate || formatDate();
          r[3] = "2099-12-31";
          r[4] = "새상품";
          r[6] = brandVal;
          r[7] = brandVal;
          r[8] = parseTags(p.tags, p).join("/");
          if (opt.color) { r[9] = "색상"; r[10] = opt.color; }
          if (opt.size) { r[11] = "사이즈"; r[12] = opt.size; }
          r[61] = p.price || 0;
          r[63] = p.regularPrice || p.price || 0;
          r[64] = clampStock(opt.stock ?? 0);
          r[65] = 2;
          r[66] = 0;
          r[67] = 1;
          r[68] = "N";
          r[69] = "Y";
          r[70] = "N";
          r[71] = "N";
          r[72] = opt.code || p.code || "";
          r[73] = opt.code || p.code || "";
          r[74] = "[바코드없음]온라인 판매를 위한 소규모 제작 상품임";
          r[75] = "인증∙신고 등 대상아님";

          r[88] = "의류";
          r[89] = n.material || "상세페이지 참조";
          r[90] = allColorsStr || n.color || opt.color || "상세페이지 참조";
          r[91] = NOTICE_SIZE_TEXT;
          r[92] = n.manufacturer || brandVal || "상세페이지 참조";
          r[93] = n.country || "상세페이지 참조";
          r[94] = n.care || "상세페이지 참조";
          r[95] = n.mfgDate || "상세페이지 참조";
          r[96] = n.warranty || "상세페이지 참조";
          r[97] = n.asInfo || "상세페이지 참고";

          r[103] = p.thumbUrl || "";
          r[109] = p.detailImgUrl || p.thumbUrl || "";
          aoa.push(r);
        });
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb, ws, "기본");
      XLSX.writeFile(wb, `쿠팡_일괄등록_${formatDate()}.xlsx`);
    } catch (e) {
      alert("엑셀 생성 오류: " + e.message);
    }
  });

  function openEditModal(p) {
    editingId = p.id;
    document.getElementById("eUploadDate").value = p.uploadDate || formatDate();
    document.getElementById("eBrand").value = p.brand || "";
    document.getElementById("eName").value = p.name || "";
    document.getElementById("eLfName").value = p.lfName || "";
    editCatCtrl.setPath(p.category || "");
    editOptCtrl.setOptions(
      p.options && p.options.length ? p.options : [{ color: "", code: p.code || "", size: "", stock: 0, stockStatus: "unknown", requiresReview: true }]
    );
    setNoticeToForm("e", p.notice || {});
    document.getElementById("eTags").value = (p.tags || "").replace(/\//g, ", ");
    updateEditTags();
    document.getElementById("eSourceUrl").value = p.sourceUrl || "";
    document.getElementById("eThumbUrl").value = p.thumbUrl || "";
    document.getElementById("eDetailImgUrl").value = p.detailImgUrl || "";
    document.getElementById("eDiscountPrice").value = formatComma(p.discountPrice);
    document.getElementById("ePrice").value = formatComma(p.price);
    document.getElementById("eRegularPrice").value = formatComma(p.regularPrice);
    document.getElementById("eStatus").value = p.status || "수집완료";
    document.getElementById("eCopy").value = p.copy || "";
    restorePriceTerms('e',p.priceTerms);
    editMarginCtrl.reset(true);
    editModal.hidden = false;
  }

  document.getElementById("btnCancelEdit").addEventListener("click", () => {
    editModal.hidden = true;
    editingId = null;
  });

  document.getElementById("btnSaveEdit").addEventListener("click", async () => {
    if (!editingId) return;
    const name = document.getElementById("eName").value.trim();
    if (!name) return alert("쿠팡 상품명을 입력해 주세요.");
    try {
      const options = editOptCtrl.getOptions();
      await updateProductInFirebase(editingId, {
        uploadDate: document.getElementById("eUploadDate").value || formatDate(),
        brand: document.getElementById("eBrand").value.trim(),
        category: editCatCtrl.getPath(),
        name,
        lfName: document.getElementById("eLfName").value.trim(),
        code: options[0]?.code || "",
        options,
        notice: getNoticeFromForm("e"),
        tags: document.getElementById("eTags").value,
        sourceUrl: document.getElementById("eSourceUrl").value.trim(),
        thumbUrl: document.getElementById("eThumbUrl").value.trim(),
        detailImgUrl: document.getElementById("eDetailImgUrl").value.trim(),
        priceTerms:priceTerms('e'),
        discountPrice: parseNum(document.getElementById("eDiscountPrice").value),
        price: parseNum(document.getElementById("ePrice").value),
        regularPrice: parseNum(document.getElementById("eRegularPrice").value),
        status: document.getElementById("eStatus").value,
        copy: document.getElementById("eCopy").value.trim()
      });
      editModal.hidden = true;
      editingId = null;
      fetchProducts();
    } catch (e) {
      alert("수정 중 오류: " + e.message);
    }
  });

  async function saveFromStudioCombined() {
    if(!bridgeMakerData||mounting)return alert('선택한 상품을 모두 불러온 후 등록하세요.');if(!confirm('이 상품을 등록 상품으로 재고 관리에 추가할까요? 쿠팡으로 전송되지 않습니다.'))return;
    const ext = await readStudioAndExtensionData();
    const panelName = document.getElementById("sName").value.trim();
    const fullName = panelName || ext.defaultName;
    if (!fullName) return alert("상품명을 입력하거나 제작실에 상품 정보를 먼저 입력해 주세요.");

    const panelOptions = studioOptCtrl.getOptions();
    const finalOptions = panelOptions.length ? panelOptions : ext.options;
    const allColorsStr = [...new Set(finalOptions.map(o => o.color).filter(Boolean))].join(", ");

    const panelNotice = getNoticeFromForm("s");
    const hasPanelNotice = Object.values(panelNotice).some(Boolean);
    const baseNotice = hasPanelNotice ? panelNotice : (ext.notice || {});
    const finalNotice = {
      ...baseNotice,
      color: allColorsStr || baseNotice.color || "",
      asInfo: "상세페이지 참고"
    };

    const costVal=parseNum(document.getElementById('sDiscountPrice').value);
    const saleVal=parseNum(document.getElementById('sPrice').value);
    if (!(costVal>0 && saleVal>0)) return alert('LF 원가를 확인한 뒤 소싱가와 판매가를 입력하세요. 미확인 가격으로 등록하지 않습니다.');

    const panelCopy = document.getElementById("sCopy").value.trim();
    const finalCopy = panelCopy || ext.studioCopy;

    const thumbVal = document.getElementById("sThumbUrl").value.trim() || ext.thumbUrl;
    const detailVal = document.getElementById("sDetailImgUrl").value.trim() || ext.detailImgUrl || thumbVal;
    const rawTagsVal = document.getElementById("sTags").value.trim() || (ext.seoTags || []).join(", ");

    try {
      await saveToFirebase({
        uploadDate: document.getElementById("sUploadDate").value || formatDate(),
        brand: document.getElementById("sBrand").value.trim() || ext.brand,
        category: studioCatCtrl.getPath(),
        name: fullName,
        lfName: document.getElementById("sLfName").value.trim() || ext.lfName,
        code: finalOptions[0]?.code || ext.code,
        options: finalOptions,
        notice: finalNotice,
        tags: rawTagsVal,
        sourceUrl: document.getElementById("sSourceUrl").value.trim() || ext.sourceUrl,
        thumbUrl: safeLink(thumbVal)||safeLink(bridgeMakerData.thumbUrl)||safeLink(bridgeMakerData.items[0]?.url),
        detailImgUrl: safeLink(detailVal),
        priceTerms:priceTerms('s'),
        discountPrice: costVal,
        price: saleVal,
        regularPrice: parseNum(document.getElementById("sRegularPrice").value),
        status: "재고 관리",
        copy: finalCopy
      });
      alert(`✅ [${fullName}] 상품을 재고 관리에 등록했습니다.`);
      if (!listView.hidden) fetchProducts();
    } catch (e) {
      alert("저장 중 오류: " + e.message);
    }
  }

  document.getElementById("btnQuickSave").addEventListener("click", saveFromStudioCombined);
  document.getElementById("btnSaveFromStudioSection").addEventListener("click", saveFromStudioCombined);

  document.getElementById("btnRefresh").addEventListener("click", fetchProducts);
  document.getElementById("mMonthFilter").addEventListener("change", renderList);
  document.getElementById("mFilter").addEventListener("change", renderList);
  document.getElementById("mSearch").addEventListener("input", renderList);

function stockGroups33(opts){const groups=new Map();for(const o of (opts||[])){const color=(o.color||'색상 미확인').trim();if(!groups.has(color))groups.set(color,[]);groups.get(color).push(o)}return [...groups].map(([color,rows])=>({color,rows,known:rows.filter(o=>o.stockStatus&&o.stockStatus!=='unknown'&&Number.isFinite(Number(o.stock))),unknown:rows.filter(o=>!o.stockStatus||o.stockStatus==='unknown'||!Number.isFinite(Number(o.stock))).length}))}
  function renderList() {
    const filtered = getFilteredProducts();
    const tbody = document.getElementById("mTableBody");

    document.getElementById("mCount").textContent = filtered.length;
    tbody.innerHTML = "";

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:30px;color:#64748b;">조건에 맞는 상품이 없습니다.</td></tr>`;
      return;
    }

    filtered.forEach(p=>{const tr=node('tr');const td=(s,cls)=>{const cell=node('td',s,cls);tr.append(cell);return cell};const image=td();if(safeLink(p.thumbUrl)||/^data:image\/(jpeg|png|webp);base64,/i.test(p.thumbUrl)){const i=node('img');i.width=48;i.height=48;i.loading='lazy';i.style.objectFit='contain';i.alt='';i.src=p.thumbUrl;image.append(i)}td(p.uploadDate);td([p.brand,p.name,p.code].filter(Boolean).join('\n'),'lf29-stock');const link=td();if(safeLink(p.sourceUrl)){const a=node('a','원본 보기');a.href=p.sourceUrl;a.rel='noopener';a.target='_blank';link.append(a)}const by=stockGroups33(p.options);const cell=td();let total=0,uncertain=0;for(const g of by){const sum=g.known.reduce((n,o)=>n+Number(o.stock),0);total+=sum;uncertain+=g.unknown;const box=node('details'),head=node('summary',g.color+' · '+g.rows.length+'옵션 · 확인 '+sum+'개'+(g.unknown?' · 미확인 '+g.unknown+'건':''));const codes=[...new Set(g.rows.map(o=>String(o.code??'').trim()||'미확인'))];head.append(node('span','품번: '+codes.join(' / '),'lf-stock-codes'));head.style.cursor='pointer';box.append(head,table32(['사이즈','품번','판매 재고'],g.rows.map(o=>[o.size||'미확인',o.code||'미확인',g.known.includes(o)?o.stock+'개':'미확인'])));cell.append(box)}if(!by.length)cell.textContent='옵션 미확인';td(by.length?'확인 '+total+'개'+(uncertain?' / 미확인 '+uncertain+'건':''):'미확인');td(money(p.discountPrice));td(money(p.regularPrice));td(money(p.price));const actions=td();const b=node('button','수정','cp-edit-btn');b.onclick=()=>openEditModal(p);const x=node('button','삭제','cp-del-btn');x.onclick=()=>deleteProduct(p.id);actions.append(b,x);tbody.append(tr)});
  }

  document.getElementById('sStatus').closest('label').hidden=true;document.getElementById('sStatus').closest('label').style.display='none';
  updateAuthUI();
})();
