(() => {
  if (window.__CP_MANAGER_LOADED__) return;
  window.__CP_MANAGER_LOADED__ = true;

  // =========================================================================
  // 1) 설정 및 상수 (CONFIG)
  // =========================================================================
  const PROJECT_ID = "coupang-auto-9f7f0";
  const API_KEY = "AIzaSyDaySX9tYRXdftu7TGEdb5kG-nv44OqS90";
  const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/products`;
  const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  const REFRESH_URL = `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`;
  const AUTH_STORAGE_KEY = "cp_team_auth_v1";
  const COLLECT_ARCHIVE_KEY = "cp_collected_archive_v2";

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

  const WORKFLOW_STEPS = [
    { step: 1, title: "상품 수집", sub: "LF몰 후보 상품 수집·보관", view: "collect" },
    { step: 2, title: "상품 제작", sub: "상세페이지·옵션·사이즈표 제작", view: "studio" },
    { step: 3, title: "재고 관리", sub: "판매 상태·재고·변동 이력", view: "list" }
  ];

  let products = [];
  let collectedArchive = loadCollectedArchive();
  let editingId = null;
  let authState = loadAuth();
  let bridgeMakerData = null;
  let latestMeasuredSizes = null;
  let latestMaterialText = "";
  let latestThumbDataUrl = "";
  let latestDetailDataUrl = "";
  let currentView = "studio";
  let activeStep = 2;

  // =========================================================================
  // 2) 수집 보관소 & 유틸리티 (ARCHIVE & UTILS)
  // =========================================================================
  function loadCollectedArchive() {
    try { return JSON.parse(localStorage.getItem(COLLECT_ARCHIVE_KEY)) || []; }
    catch { return []; }
  }

  function saveCollectedArchive(list) {
    collectedArchive = Array.isArray(list) ? list : [];
    try { localStorage.setItem(COLLECT_ARCHIVE_KEY, JSON.stringify(collectedArchive)); } catch {}
  }

  function upsertCollectedItem(raw, statusOverride = "수집 성공") {
    if (!raw) return null;
    const url = String(raw.url || "").trim();
    const code = String(raw.code || (url.match(/\/app\/product\/([A-Za-z0-9_-]+)/) || [])[1] || "").trim();
    const title = sanitizeProductTitle(raw.lfName || raw.title || code || "수집 상품");
    if (!url && !code && !title) return null;

    const existing = collectedArchive.find(x => (code && x.code === code) || (url && x.url === url));
    const isDuplicate = !!existing;

    const record = {
      id: existing?.id || `${code || "ITEM"}_${Date.now()}`,
      url,
      code,
      brand: raw.brand || existing?.brand || extractBrandFromText(title),
      lfName: title,
      title,
      colors: Array.isArray(raw.colors) && raw.colors.length ? raw.colors : (existing?.colors || []),
      options: Array.isArray(raw.options) && raw.options.length ? raw.options : (existing?.options || []),
      regularPrice: Number(raw.regularPrice) >= 10000 ? Number(raw.regularPrice) : (existing?.regularPrice || 0),
      discountPrice: Number(raw.discountPrice) >= 10000 ? Number(raw.discountPrice) : (existing?.discountPrice || 0),
      notice: raw.notice && Object.values(raw.notice).some(Boolean) ? raw.notice : (existing?.notice || {}),
      measuredSizes: raw.measuredSizes?.rows?.length ? raw.measuredSizes : (existing?.measuredSizes || null),
      seoTags: Array.isArray(raw.seoTags) && raw.seoTags.length ? raw.seoTags : (existing?.seoTags || []),
      thumbUrl: raw.thumbUrl || raw.items?.[0]?.url || existing?.thumbUrl || "",
      items: Array.isArray(raw.items) && raw.items.length ? raw.items : (existing?.items || []),
      collectStatus: statusOverride,
      isDuplicate,
      collectedAt: Date.now()
    };

    const next = [record, ...collectedArchive.filter(x => x.id !== record.id)].slice(0, 150);
    saveCollectedArchive(next);
    return record;
  }

  try {
    const cached = localStorage.getItem("lfMakerDataBridge");
    if (cached) {
      bridgeMakerData = JSON.parse(cached);
      upsertCollectedItem(bridgeMakerData, "수집 성공");
    }
  } catch {}

  window.addEventListener("message", e => {
    if (e.data?.type === "LF_MAKER_DATA_SYNC" && e.data.data) {
      bridgeMakerData = e.data.data;
      upsertCollectedItem(bridgeMakerData, "수집 성공");
      try { localStorage.setItem("lfMakerDataBridge", JSON.stringify(bridgeMakerData)); } catch {}
      if (currentView === "collect") renderCollectView();
      syncFromStudioPanel(false, true);
    }
  });

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

  function formatDateTime(ts) {
    const d = ts ? new Date(ts) : new Date();
    return `${formatDate(ts)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function parseNum(val) {
    const n = Number(String(val ?? "").replace(/[^0-9-]/g, "")) || 0;
    return n >= 10000 ? n : 0;
  }

  function clampStock(val) {
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(MAX_STOCK, Math.round(n));
  }

  function getTotalStock(p) {
    if (Array.isArray(p?.options) && p.options.length) {
      return p.options.reduce((sum, o) => sum + clampStock(o.stock ?? MAX_STOCK), 0);
    }
    return clampStock(p?.stock ?? MAX_STOCK);
  }

  function formatComma(val) {
    const raw = String(val ?? "").replace(/[^0-9]/g, "");
    if (!raw) return "";
    return Number(raw).toLocaleString();
  }

  function formatWon(num) {
    return `${(Number(num) || 0).toLocaleString()}원`;
  }

  function parseTags(str) {
    return String(str || "")
      .split(/[,/]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  function sanitizeProductTitle(raw) {
    return String(raw || "")
      .replace(/\s+/g, " ")
      .replace(/나를\s*나답게\s*LFmall\.com/gi, "")
      .replace(/\s*\|\s*LF몰.*$/i, "")
      .replace(/^\s*[-–|·]+\s*|\s*[-–|·]+\s*$/g, "")
      .trim();
  }

  function extractBrandFromText(text) {
    const m = String(text || "").match(/(닥스|헤지스|질스튜어트|마에스트로|알레그리|바버|이자벨마랑|빈스|던스트|리복|챔피온|콜마|티엔지티|TNGT|DAKS|HAZZYS)/i);
    return m ? m[1] : "";
  }

  function isNavyColor(colorName) {
    return /네이비|navy|남색/i.test(String(colorName || "").trim());
  }

  function buildSeoTagsFromFields({ name, lfName, code, material, options }) {
    const baseText = `${name || ""} ${lfName || ""} ${material || ""} ${(options || []).map(o => `${o.color || ""} ${o.size || ""}`).join(" ")}`;
    const items = baseText.match(/(숏패딩|롱패딩|패딩|점퍼|자켓|재킷|코트|가디건|니트|스웨터|맨투맨|후드|셔츠|티셔츠|팬츠|바지|슬랙스|데님|카라)/g) || [];
    const fabrics = (material || "").match(/(캐시미어|울|모|메리노|면|코튼|린넨|폴리에스터|나일론|레이온|아크릴|실크|구스|덕다운)/g) || [];
    const colors = [...new Set((options || []).map(o => o.color).filter(Boolean))];
    const words = baseText
      .replace(/[^가-힣A-Za-z0-9%\s]/g, " ")
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length >= 2);

    return [...new Set([
      ...items.map(i => `남성${i.replace(/^남성/, "")}`),
      ...items,
      ...fabrics.flatMap(f => items.slice(0, 2).map(i => `${f}${i}`)),
      ...fabrics,
      ...colors,
      ...words,
      code
    ].map(x => String(x || "").replace(/\s+/g, "").trim()).filter(x => x && x.length >= 2 && x.length <= 20))].slice(0, 20);
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
    if (CATEGORY_TREE[prev] && CATEGORY_TREE[prev].includes(last)) return { main: prev, sub: last };
    if (CATEGORY_TREE["단품/기본 의류"].includes(last)) return { main: "단품/기본 의류", sub: last };
    return { main: "", sub: "" };
  }

  function calcTargetSalePrice(cost, targetMarginPct = DEFAULT_TARGET_MARGIN, feeRate = DEFAULT_FEE_RATE, shipping = DEFAULT_SHIPPING) {
    const c = parseNum(cost);
    if (!c) return 0;
    const denom = 1 - (Number(feeRate) / 100) - (Number(targetMarginPct) / 100);
    if (denom <= 0) return 0;
    return Math.round(((c + parseNum(shipping)) / denom) / 1000) * 1000;
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
    if (!str || input.value === str) return;
    const proto = input.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(input, str);
    else input.value = str;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function scrollPageToTop() {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  // =========================================================================
  // 3) 기존 제작실 안전 연동 (STUDIO SAFE BRIDGE)
  // =========================================================================
  function getSizeRowsAndAddBtn() {
    const addBtn = [...document.querySelectorAll("button")].find(b =>
      !b.id?.startsWith("cp") &&
      !b.closest("#cpStudioRegSection, #cpEditModal, #cpListView, #cpCollectView") &&
      /사이즈\s*한\s*줄\s*추가/.test((b.innerText || b.textContent || "").replace(/\s+/g, " ").trim())
    );
    const sizeInputs = [...document.querySelectorAll('input[aria-label="사이즈"]')].filter(
      inp => !inp.closest("#cpStudioRegSection, #cpEditModal, #cpListView, #cpCollectView")
    );
    const rows = sizeInputs.map(szInp => {
      const tr = szInp.closest("tr");
      if (!tr) return null;
      return {
        size: szInp,
        totalLength: tr.querySelector('input[aria-label="총 길이"]'),
        shoulder: tr.querySelector('input[aria-label="어깨너비"]'),
        chest: tr.querySelector('input[aria-label="가슴둘레"]'),
        sleeve: tr.querySelector('input[aria-label="소매길이"]')
      };
    }).filter(Boolean);
    return { rows, addBtn: addBtn || null };
  }

  function applyMeasuredSizesToStudio(measuredSizes) {
    if (currentView !== "studio") return;
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
    if (currentView !== "studio") return;
    if (materialText) latestMaterialText = materialText;
    const text = materialText || latestMaterialText;
    if (!text) return;

    const labels = [...document.querySelectorAll("label, span, div, p, b, strong")].filter(el =>
      !el.id?.startsWith("cp") &&
      !el.closest("#cpStudioRegSection, #cpEditModal, #cpListView, #cpCollectView") &&
      el.children.length <= 2 &&
      /확인한\s*소재\s*및\s*혼용률/.test((el.innerText || el.textContent || "").replace(/\s+/g, " ").trim())
    );

    for (const lbl of labels) {
      let cur = lbl.parentElement;
      for (let i = 0; i < 4 && cur; i++) {
        const inp = cur.querySelector("input, textarea");
        if (inp) {
          setNativeInputValue(inp, text);
          return;
        }
        cur = cur.parentElement;
      }
    }
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

  function setFileInputFiles(input, files) {
    if (!input || !files) return;
    const arr = Array.isArray(files) ? files.filter(Boolean) : [files].filter(Boolean);
    if (!arr.length) return;
    try {
      const dt = new DataTransfer();
      arr.forEach(f => dt.items.add(f));
      input.files = dt.files;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    } catch {}
  }

  function detectSlotRole(fileInput) {
    let cur = fileInput.parentElement;
    for (let i = 0; i < 6 && cur; i++) {
      const t = (cur.innerText || cur.textContent || "").replace(/\s+/g, " ").trim();
      if (t.length <= 140) {
        if (/추가\s*디테일/.test(t)) return "추가 디테일";
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
      if (inp.closest("#cpStudioRegSection, #cpEditModal, #cpListView, #cpCollectView")) return false;
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

  function applyNavyWhiteTextColor(optCard, colorName) {
    if (!optCard || !isNavyColor(colorName)) return;
    const colorPickers = [...optCard.querySelectorAll('input[type="color"]')];
    const textColorInput = colorPickers[1] || colorPickers[colorPickers.length - 1];
    if (textColorInput) {
      textColorInput.value = "#ffffff";
      textColorInput.dispatchEvent(new Event("input", { bubbles: true }));
      textColorInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  // 0. LF몰에서 받은 이미지: 가로 flex/grid 배치 보장
  function renderLfReceivedHorizontal(makerData) {
    const lfRec = document.getElementById("lfReceived");
    if (!lfRec) return;
    lfRec.classList.add("cp-lf-rec-horizontal");
    const items = Array.isArray(makerData?.items)
      ? makerData.items.filter(x => (x?.dataUrl || x?.url) && x.role !== "제외")
      : [];
    if (!items.length) return;
    lfRec.innerHTML = items.map(x => `
      <div class="cp-lf-rec-card">
        <img src="${x.dataUrl || x.url}" alt="수집사진">
        <div class="cp-lf-rec-cap">${x.color || ""} · ${x.role || ""}</div>
      </div>
    `).join("");
  }

  async function applyCollectedPhotosToStudio(makerData) {
    if (currentView !== "studio") return;
    const items = Array.isArray(makerData?.items) ? makerData.items : [];
    if (!items.length) return;

    renderLfReceivedHorizontal(makerData);

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
      applyNavyWhiteTextColor(optCard, g.color);

      const codeInp = textInputs.find(i =>
        i !== colorInp &&
        (/품번|색상별/.test(i.placeholder || "") || /옵션\s*품번/.test(((i.closest("div")?.parentElement?.innerText) || "")))
      );

      if (codeInp && g.code) setNativeInputValue(codeInp, g.code);

      const extraPhotos = g.photos.filter(p => /추가\s*디테일/.test(p.role));
      const extraFiles = [];
      for (const ep of extraPhotos) {
        const ef = await urlToFile(ep.imgSrc, `${g.color}_extra_${ep.key || "detail"}.jpg`);
        if (ef) extraFiles.push(ef);
      }

      const cardFileInputs = [...optCard.querySelectorAll('input[type="file"]')];
      for (const fInp of cardFileInputs) {
        const slotRole = detectSlotRole(fInp);
        if (!slotRole) continue;

        if (slotRole === "추가 디테일") {
          if (extraFiles.length) {
            setFileInputFiles(fInp, extraFiles);
            const slotWrap = fInp.closest("div")?.parentElement || fInp.parentElement;
            const noFileNode = [...(slotWrap?.querySelectorAll("span, small, p, div") || [])].find(
              n => n.children.length === 0 && /선택된\s*파일\s*없음/.test((n.textContent || "").trim())
            );
            if (noFileNode) noFileNode.textContent = `${extraFiles.length}개 파일 선택됨`;
          }
          continue;
        }

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
    let thumbUrl = latestThumbDataUrl || "";
    let detailImgUrl = latestDetailDataUrl || "";

    const canvases = [...document.querySelectorAll("canvas")].filter(c => {
      if (c.closest("#cpStudioRegSection, #cpEditModal, #cpListView, #cpCollectView")) return false;
      return c.width > 80 && c.height > 80;
    });

    if (canvases.length) {
      try {
        const firstUrl = canvases[0].toDataURL("image/jpeg", 0.85);
        if (firstUrl && firstUrl.startsWith("data:image")) {
          thumbUrl = firstUrl;
          latestThumbDataUrl = firstUrl;
        }
      } catch {}
      try {
        const lastUrl = canvases[canvases.length - 1].toDataURL("image/jpeg", 0.85);
        if (lastUrl && lastUrl.startsWith("data:image")) {
          detailImgUrl = lastUrl;
          latestDetailDataUrl = lastUrl;
        }
      } catch {}
    }

    return { thumbUrl, detailImgUrl };
  }

  // =========================================================================
  // 4) 스타일 & 레이아웃 (UI & VIEWS)
  // =========================================================================
  const style = document.createElement("style");
  style.textContent = `
    body { margin: 0 !important; background: #f3f6f4 !important; color: #111827 !important; }
    #cpTopBar {
      position: fixed; top: 0; left: 0; right: 0; height: 56px; z-index: 10000;
      background: #0f3d2e; color: #fff;
      display: flex; justify-content: space-between; align-items: center;
      padding: 0 22px; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.1);
    }
    .cp-brand-wrap { display: flex; align-items: center; gap: 12px; }
    .cp-brand-logo {
      background: #ffffff; color: #0f3d2e; font-weight: 800; font-size: 14px;
      padding: 5px 12px; border-radius: 7px; letter-spacing: -0.3px;
    }
    .cp-brand-title { font-size: 15.5px; font-weight: 700; color: #fff; }
    .cp-top-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .cp-sync-btn {
      background: #15803d !important; color: #fff !important; border: none !important;
      padding: 8px 14px !important; border-radius: 8px !important; font-weight: 700 !important;
      cursor: pointer; font-size: 12.5px !important; margin: 0 !important;
    }
    .cp-sub-btn {
      background: #1e293b !important; color: #fff !important; border: none !important;
      padding: 7px 12px !important; border-radius: 7px !important; font-weight: 600 !important;
      cursor: pointer; font-size: 12px !important; margin: 0 !important;
    }
    .cp-excel-btn {
      background: #15803d !important; color: #fff !important; border: none !important;
      padding: 9px 15px !important; border-radius: 8px !important; font-weight: 700 !important;
      cursor: pointer; font-size: 13px !important; margin: 0 !important;
    }

    /* 0. LF몰에서 받은 이미지 가로 정렬 보장 */
    #lfReceived, #lfReceived.cp-lf-rec-horizontal {
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: wrap !important;
      gap: 10px !important;
      align-items: flex-start !important;
      width: 100% !important;
    }
    #lfReceived > div, .cp-lf-rec-card {
      width: 128px !important;
      flex: 0 0 128px !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 8px !important;
      padding: 6px !important;
      background: #ffffff !important;
      text-align: center !important;
    }
    #lfReceived img, .cp-lf-rec-card img {
      display: block !important;
      width: 100% !important;
      height: 96px !important;
      object-fit: cover !important;
      border-radius: 5px !important;
    }
    .cp-lf-rec-cap {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      margin-top: 5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    #cpLayout { display: flex; min-height: 100vh; padding-top: 56px; }
    #cpSidebar {
      width: 248px; flex-shrink: 0; background: #ffffff;
      border-right: 1px solid #e2e8f0; padding: 18px 14px;
      position: fixed; top: 56px; bottom: 0; left: 0; overflow-y: auto;
      display: flex; flex-direction: column;
    }
    .cp-progress-box { margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid #eef2f6; }
    .cp-progress-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
    .cp-progress-label { font-size: 12.5px; font-weight: 700; color: #334155; }
    .cp-progress-pct { font-size: 12.5px; font-weight: 800; color: #15803d; }
    .cp-progress-track { width: 100%; height: 6px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
    .cp-progress-fill { height: 100%; background: #15803d; border-radius: 999px; transition: width 0.25s; }

    .cp-step-list { display: flex; flex-direction: column; gap: 6px; }
    .cp-step-btn {
      width: 100%; display: flex; align-items: flex-start; gap: 10px;
      text-align: left; padding: 10px !important; border-radius: 9px !important;
      border: 1px solid transparent !important; background: transparent !important;
      cursor: pointer; margin: 0 !important; transition: 0.15s;
    }
    .cp-step-btn:hover { background: #f8fafc !important; }
    .cp-step-btn.is-active { background: #ecfdf5 !important; border-color: #bbf7d0 !important; }
    .cp-step-badge-ico {
      width: 22px; height: 22px; border-radius: 999px; flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 800; margin-top: 1px;
    }
    .ico-done { background: #dcfce7; color: #15803d; }
    .ico-active { background: #15803d; color: #ffffff; }
    .ico-wait { background: #f1f5f9; color: #64748b; }
    .cp-step-texts { flex: 1; min-width: 0; }
    .cp-step-head-row { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
    .cp-step-name { font-size: 13px; font-weight: 700; color: #0f172a; }
    .cp-step-tag { font-size: 10.5px; font-weight: 700; padding: 1px 6px; border-radius: 6px; white-space: nowrap; }
    .tag-done { background: #dcfce7; color: #15803d; }
    .tag-active { background: #15803d; color: #fff; }
    .tag-wait { background: #f1f5f9; color: #64748b; }
    .cp-step-desc { font-size: 11px; color: #64748b; margin-top: 2px; line-height: 1.35; }

    .cp-menu-group { font-size: 12px; font-weight: 700; color: #64748b; margin: 14px 0 6px 6px; }
    .cp-menu-item {
      display: block; width: 100%; text-align: left;
      background: transparent !important; color: #334155 !important;
      border: none !important; padding: 9px 11px !important; margin: 2px 0 !important;
      border-radius: 8px !important; font-size: 13.5px !important; font-weight: 600;
      cursor: pointer; transition: 0.15s;
    }
    .cp-menu-item:hover { background: #f1f5f9 !important; }
    .cp-menu-item.active { background: #ecfdf5 !important; color: #0f3d2e !important; font-weight: 700 !important; }
    .cp-sidebar-divider { border-top: 1px solid #e2e8f0; margin: 14px 0; }
    .cp-sidebar-footer { font-size: 12px; color: #475569; padding: 0 6px; line-height: 1.55; }
    .cp-side-btn {
      margin-top: 8px !important; width: 100%;
      background: #f1f5f9 !important; color: #334155 !important;
      border: 1px solid #cbd5e1 !important; padding: 7px 10px !important;
      border-radius: 7px !important; font-size: 12px !important; font-weight: 600 !important;
      cursor: pointer;
    }

    #cpContent {
      flex: 1; margin-left: 248px; min-width: 0; padding: 24px 26px 48px;
      display: flex; flex-direction: column; align-items: center;
    }
    #cpCollectView { width: 100%; max-width: 1240px; margin: 0 auto 22px; }
    .cp-wb-header-bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    .cp-wb-h1 { margin: 0; font-size: 23px; font-weight: 800; color: #0f172a; }
    .cp-wb-sub { margin: 4px 0 0; font-size: 13.5px; color: #64748b; }

    .cp-url-box {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 18px; margin-bottom: 18px;
    }
    .cp-url-box textarea {
      width: 100%; padding: 10px !important; border: 1px solid #cbd5e1 !important;
      border-radius: 8px !important; font-size: 13px !important; box-sizing: border-box;
    }

    .cp-collect-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 14px;
    }
    .cp-collect-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 14px; display: flex; flex-direction: column; gap: 10px;
    }
    .cp-collect-top { display: flex; gap: 12px; align-items: center; }
    .cp-collect-thumb {
      width: 64px; height: 80px; object-fit: cover; border-radius: 8px;
      border: 1px solid #e2e8f0; flex-shrink: 0; background: #f8fafc;
    }
    .cp-collect-meta { flex: 1; min-width: 0; }
    .cp-collect-name { font-size: 13.5px; font-weight: 800; color: #0f172a; line-height: 1.35; word-break: break-word; }
    .cp-collect-sub { font-size: 11.5px; color: #64748b; margin-top: 3px; }
    .cp-collect-price { font-size: 13px; font-weight: 700; color: #0f3d2e; margin-top: 4px; }
    .cp-collect-badge {
      display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 7px;
      border-radius: 6px; margin-bottom: 4px;
    }
    .badge-ok { background: #dcfce7; color: #15803d; }
    .badge-dup { background: #fef3c7; color: #b45309; }
    .cp-collect-photos-strip { display: flex; gap: 5px; overflow-x: auto; padding-bottom: 2px; }
    .cp-collect-photos-strip img {
      width: 42px; height: 52px; object-fit: cover; border-radius: 5px;
      border: 1px solid #cbd5e1; flex-shrink: 0;
    }
    .cp-collect-actions { display: flex; gap: 6px; justify-content: flex-end; margin-top: auto; flex-wrap: wrap; }
    .cp-load-btn {
      background: #0f3d2e !important; color: #fff !important; border: none !important;
      padding: 7px 12px !important; border-radius: 7px !important; font-size: 12px !important;
      font-weight: 700 !important; cursor: pointer; margin: 0 !important;
    }

    #cpContent > main {
      width: 100% !important; max-width: 960px !important;
      margin: 0 auto 20px !important; padding: 0 !important;
    }
    #cpContent > main > * { max-width: 100% !important; margin-left: auto !important; margin-right: auto !important; }

    .cp-card {
      width: 100%; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 22px; margin-bottom: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      box-sizing: border-box;
    }
    .cp-studio-reg-card { max-width: 960px; margin: 0 auto 20px; border-top: 4px solid #0f3d2e; }
    .cp-list-card { max-width: 1240px; margin: 0 auto; }
    .cp-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; gap: 10px; flex-wrap: wrap; }
    .cp-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 10px; }
    .cp-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 10px; }
    @media (max-width: 760px) { .cp-grid-2, .cp-grid-3 { grid-template-columns: 1fr; } }
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
    .cp-opt-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; margin: 10px 0 14px; }
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
    .cp-notice-details { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; margin: 10px 0 14px; }
    .cp-notice-details summary { font-size: 13px; font-weight: 700; color: #0f172a; cursor: pointer; user-select: none; }
    .cp-notice-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 12px; margin-top: 12px; }
    @media (max-width: 760px) { .cp-notice-grid { grid-template-columns: 1fr; } }
    .cp-tag-count { font-size: 11.5px; font-weight: 700; color: #0f3d2e; margin-left: 6px; }
    .cp-tag-count.over { color: #dc2626; }
    .cp-table-wrap { width: 100%; overflow-x: auto; }
    .cp-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 1180px; }
    .cp-table th, .cp-table td { padding: 11px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: middle; }
    .cp-table th { background: #f8fafc; color: #334155; font-weight: 700; white-space: nowrap; }
    .cp-num-col { text-align: center !important; color: #64748b; font-weight: 700; }
    .cp-price-col { text-align: right !important; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .cp-thumb-mini { width: 44px; height: 56px; object-fit: cover; border-radius: 5px; border: 1px solid #cbd5e1; background: #f8fafc; display: block; }
    .cp-stock-input { width: 62px !important; padding: 5px 6px !important; text-align: center; font-size: 12.5px !important; font-weight: 700; border: 1px solid #cbd5e1 !important; border-radius: 6px !important; }
    .cp-lf-sub { font-size: 11.5px; color: #64748b; margin-top: 2px; }
    .cp-link-btn { display: inline-block; background: #eff6ff; color: #1d4ed8; padding: 4px 9px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; white-space: nowrap; }
    .cp-worker-tag { font-size: 11px; color: #94a3b8; margin-top: 3px; }
    .cp-row-status { width: 100%; min-width: 120px; font-size: 12px !important; padding: 6px !important; }
    .cp-action-wrap { display: flex; gap: 5px; white-space: nowrap; }
    .cp-edit-btn { background: #2563eb !important; color: #fff !important; padding: 6px 10px !important; font-size: 12px !important; border-radius: 6px !important; margin: 0 !important; }
    .cp-del-btn { background: #ef4444 !important; color: #fff !important; padding: 6px 10px !important; font-size: 12px !important; border-radius: 6px !important; margin: 0 !important; }
    .cp-primary-btn { background: #0f3d2e !important; color: #fff !important; padding: 9px 18px !important; border-radius: 8px !important; font-weight: 600 !important; }

    #cpEditModal, #cpLoginOverlay {
      position: fixed; inset: 0; z-index: 20000; background: rgba(15, 23, 42, 0.65);
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    #cpLoginOverlay { background: #f3f6f4; z-index: 30000; }
    #cpEditModal[hidden], #cpLoginOverlay[hidden] { display: none !important; }
    .cp-modal-box { background: #fff; width: 100%; max-width: 740px; max-height: 92vh; overflow-y: auto; border-radius: 14px; padding: 22px 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.18); }
    .cp-login-box { max-width: 380px; text-align: center; }
    .cp-login-box h2 { margin: 0 0 8px; color: #0f3d2e; font-size: 22px; }
    .cp-login-box p { margin: 0 0 20px; color: #64748b; font-size: 13.5px; }
    .cp-login-box input { margin-bottom: 12px; padding: 11px 12px !important; width: 100%; box-sizing: border-box; }
    .cp-login-err { color: #dc2626; font-size: 12.5px; min-height: 18px; margin-bottom: 10px; }
    .cp-modal-box h3 { margin: 0 0 14px; font-size: 18px; color: #0f172a; }
    .cp-modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .cp-cancel-btn { background: #e2e8f0 !important; color: #334155 !important; padding: 9px 16px !important; border-radius: 8px !important; font-weight: 600 !important; }
  `;
  document.head.appendChild(style);

  const studioMain = document.querySelector("main");

  const topBar = document.createElement("header");
  topBar.id = "cpTopBar";
  topBar.innerHTML = `
    <div class="cp-brand-wrap">
      <span class="cp-brand-logo">쿠팡 자동화</span>
      <span class="cp-brand-title" id="cpCurrentTitle">2. 상품 제작</span>
    </div>
    <div class="cp-top-right">
      <button type="button" id="btnQuickSave" class="cp-sync-btn">☁️ 제작실 상품 바로 저장</button>
    </div>
  `;

  const layout = document.createElement("div");
  layout.id = "cpLayout";

  // 바로가기에서 '상품 제작실' 제거하고 '상품 리스트'만 유지
  const sidebar = document.createElement("aside");
  sidebar.id = "cpSidebar";
  sidebar.innerHTML = `
    <div class="cp-progress-box">
      <div class="cp-progress-top">
        <span class="cp-progress-label" id="cpStepProgressText">전체 진행률 2 / 3</span>
        <span class="cp-progress-pct" id="cpStepProgressPct">67%</span>
      </div>
      <div class="cp-progress-track">
        <div class="cp-progress-fill" id="cpStepProgressBar" style="width:67%;"></div>
      </div>
    </div>

    <div class="cp-step-list" id="cpStepList"></div>

    <div class="cp-menu-group">바로가기</div>
    <button type="button" class="cp-menu-item" data-view="list">└ 상품 리스트</button>

    <div class="cp-sidebar-divider"></div>
    <div class="cp-sidebar-footer">
      <div>☁️ 실시간 연동중</div>
      <div id="cpUserEmail" style="margin-top:6px;font-weight:700;color:#0f172a;"></div>
      <button type="button" id="btnLogout" class="cp-side-btn">로그아웃</button>
    </div>
  `;

  const content = document.createElement("div");
  content.id = "cpContent";

  const collectView = document.createElement("section");
  collectView.id = "cpCollectView";
  collectView.hidden = true;

  const listView = document.createElement("div");
  listView.id = "cpListView";
  listView.hidden = true;
  listView.style.width = "100%";
  listView.innerHTML = `
    <div class="cp-card cp-list-card">
      <div class="cp-card-head">
        <h2 style="margin:0;">📦 3. 재고 관리 · 상품 리스트 (<span id="mCount">0</span>개)</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" id="btnExportExcel" class="cp-excel-btn">📥 쿠팡 일괄등록 엑셀 다운로드</button>
          <button type="button" id="btnRefresh" class="cp-primary-btn">🔄 새로고침</button>
        </div>
      </div>
      <div class="cp-toolbar">
        <select id="mMonthFilter"><option value="ALL">전체 월 보기</option></select>
        <select id="mFilter">
          <option value="ALL">전체 상태 보기</option>
          <option value="판매 중">판매 중</option>
          <option value="품절">품절</option>
          <option value="확인 필요">확인 필요</option>
          <option value="상품 종료">상품 종료</option>
        </select>
        <input id="mSearch" type="text" placeholder="상품명, 품번, 태그 검색...">
      </div>
      <div class="cp-table-wrap">
        <table class="cp-table">
          <thead>
            <tr>
              <th style="width:44px;text-align:center;">순번</th>
              <th style="width:90px;">업로드 날짜</th>
              <th style="width:56px;">썸네일</th>
              <th style="min-width:210px;">상품명 (쿠팡 / LF몰)</th>
              <th style="width:70px;">상품링크</th>
              <th style="width:120px;">품번</th>
              <th style="width:70px;text-align:center;">재고</th>
              <th style="width:94px;text-align:right;">최대혜택가(소싱)</th>
              <th style="width:100px;text-align:right;">쿠팡 판매가</th>
              <th style="width:90px;text-align:right;">정가</th>
              <th style="width:126px;">판매 상태</th>
              <th style="width:98px;">관리</th>
            </tr>
          </thead>
          <tbody id="mTableBody"></tbody>
        </table>
      </div>
    </div>
  `;

  function buildFormHTML(p, isStudio = false) {
    const mainOpts = Object.keys(CATEGORY_TREE).map(k => `<option value="${k}">${k}</option>`).join("");
    const noticeInputs = NOTICE_FIELDS.map(([key, label]) => {
      const defVal = key === "asInfo" ? "상세페이지 참고" : "";
      return `<label class="cp-field-label">${label}<input id="${p}Notice_${key}" type="text" value="${defVal}" placeholder="비워두면 '상세페이지 참조'로 자동 입력"></label>`;
    }).join("");

    return `
      <div class="cp-grid-3">
        <label class="cp-field-label">업로드 날짜<input id="${p}UploadDate" type="date" value="${formatDate()}"></label>
        <label class="cp-field-label">브랜드<input id="${p}Brand" type="text" placeholder="예: 닥스"></label>
        <label class="cp-field-label">판매 상태
          <select id="${p}Status">
            <option value="판매 중" ${isStudio ? "selected" : ""}>판매 중</option>
            <option value="품절">품절</option>
            <option value="확인 필요">확인 필요</option>
            <option value="상품 종료">상품 종료</option>
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
        <label class="cp-field-label">대표이미지 URL<input id="${p}ThumbUrl" type="text" placeholder="https://..."></label>
        <label class="cp-field-label">상세설명 이미지 URL<input id="${p}DetailImgUrl" type="text" placeholder="https://..."></label>
      </div>

      <div class="cp-grid-3">
        <label class="cp-field-label">최대혜택가 / 소싱가 (원)<input id="${p}DiscountPrice" class="cp-money-input" type="text" inputmode="numeric" placeholder="예: 69,000"></label>
        <label class="cp-field-label">쿠팡 판매가 (원)<input id="${p}Price" class="cp-money-input" type="text" inputmode="numeric" placeholder="자동 계산 또는 직접 입력"></label>
        <label class="cp-field-label">정가 (할인율기준가/원)<input id="${p}RegularPrice" class="cp-money-input" type="text" inputmode="numeric" placeholder="예: 129,000"></label>
      </div>

      <details class="cp-notice-details">
        <summary>📋 상품정보제공고시 (의류 9개 항목 · 클릭해서 펼치기)</summary>
        <div class="cp-notice-grid">${noticeInputs}</div>
      </details>

      <label class="cp-field-label">상세페이지 문구 / 변경 이력 메모
        <textarea id="${p}Copy" rows="3" placeholder="CHECK POINT 문구나 재고/가격 변경 이력을 입력하세요"></textarea>
      </label>
    `;
  }

  const studioRegSection = document.createElement("section");
  studioRegSection.id = "cpStudioRegSection";
  studioRegSection.className = "cp-card cp-studio-reg-card";
  studioRegSection.innerHTML = `
    <div class="cp-card-head">
      <h2 style="margin:0;">📥 2. 상품 제작 정보</h2>
      <button type="button" id="btnSyncFromStudio" class="cp-sub-btn">🔄 1. 상품 수집값 자동 반영</button>
    </div>
    ${buildFormHTML("s", true)}
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px;">
      <button type="button" id="btnResetStudioReg" class="cp-cancel-btn">입력 초기화</button>
      <button type="button" id="btnSaveFromStudioSection" class="cp-primary-btn">☁️ 완성 결과 저장 (3. 재고 관리로)</button>
    </div>
  `;

  const editModal = document.createElement("div");
  editModal.id = "cpEditModal";
  editModal.hidden = true;
  editModal.innerHTML = `
    <div class="cp-modal-box">
      <h3>✏️ 상품 정보 · 변경 이력 수정</h3>
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

  // =========================================================================
  // 5) 1. 상품 수집 전용 뷰 (별도 보관소 관리)
  // =========================================================================
  function renderCollectView() {
    if (currentView !== "collect") {
      collectView.hidden = true;
      return;
    }
    collectView.hidden = false;
    document.getElementById("cpCurrentTitle").textContent = "1. 상품 수집";

    collectView.innerHTML = `
      <div class="cp-wb-header-bar">
        <div>
          <h1 class="cp-wb-h1">1. 상품 수집 (${collectedArchive.length}건 보관중)</h1>
          <p class="cp-wb-sub">LF몰에서 수집한 판매 후보 상품을 별도로 보관합니다. (상품 리스트와 분리 보관)</p>
        </div>
        <button type="button" class="cp-sub-btn" id="btnClearCollectArchive">수집 보관함 비우기</button>
      </div>

      <div class="cp-url-box">
        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:6px;">🔗 LF몰 URL 단건 / 일괄 등록 (줄바꿈으로 여러 URL 입력 가능)</div>
        <textarea id="cpBulkUrlsInput" rows="2" placeholder="https://www.lfmall.co.kr/app/product/DMJU5D041N2&#10;https://www.lfmall.co.kr/app/product/..."></textarea>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
          <button type="button" class="cp-primary-btn" id="btnAddUrlsToCollect">+ URL 후보 추가 및 중복 확인</button>
        </div>
      </div>

      ${collectedArchive.length ? `
        <div class="cp-collect-grid">
          ${collectedArchive.map((item, idx) => {
            const thumbs = (item.items || []).filter(i => i?.dataUrl || i?.url).slice(0, 5);
            const mainThumb = thumbs[0]?.dataUrl || thumbs[0]?.url || item.thumbUrl || "";
            const sizesTxt = [...new Set((item.options || []).map(o => o.size).filter(Boolean))].join(", ") || "-";
            const stockSum = (item.options || []).reduce((s, o) => s + clampStock(o.stock ?? MAX_STOCK), 0);
            const colorsTxt = (item.colors || []).join(", ") || "-";
            return `
              <article class="cp-collect-card">
                <div>
                  <span class="cp-collect-badge ${item.isDuplicate ? "badge-dup" : "badge-ok"}">${item.isDuplicate ? "중복 상품 갱신" : (item.collectStatus || "수집 성공")}</span>
                </div>
                <div class="cp-collect-top">
                  ${mainThumb ? `<img src="${mainThumb}" class="cp-collect-thumb" alt="수집 썸네일">` : `<div class="cp-collect-thumb"></div>`}
                  <div class="cp-collect-meta">
                    <div class="cp-collect-name">${item.title || item.lfName || "수집 상품"}</div>
                    <div class="cp-collect-sub">품번: ${item.code || "-"} · 색상: ${colorsTxt}</div>
                    <div class="cp-collect-sub">사이즈: ${sizesTxt} · 재고합계: ${stockSum}개</div>
                    <div class="cp-collect-price">최대혜택가 ${formatWon(item.discountPrice)} / 정가 ${formatWon(item.regularPrice)}</div>
                  </div>
                </div>
                ${thumbs.length ? `
                  <div class="cp-collect-photos-strip">
                    ${thumbs.map(t => `<img src="${t.dataUrl || t.url}" alt="사진">`).join("")}
                  </div>
                ` : ""}
                <div class="cp-collect-actions">
                  ${item.url ? `<a href="${item.url}" target="_blank" class="cp-link-btn">LF몰 열기 ↗</a>` : ""}
                  <button type="button" class="cp-del-btn" data-del-idx="${idx}">삭제</button>
                  <button type="button" class="cp-load-btn" data-idx="${idx}">2. 상품 제작으로 보내기 →</button>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      ` : `
        <div class="cp-card" style="text-align:center;color:#64748b;padding:36px;">
          보관된 수집 상품이 없습니다. LF몰 페이지에서 <strong>이미지 수집</strong>을 누르거나 위 입력칸에 LF몰 URL을 추가해 주세요.
        </div>
      `}
    `;

    document.getElementById("btnAddUrlsToCollect")?.addEventListener("click", () => {
      const raw = document.getElementById("cpBulkUrlsInput")?.value || "";
      const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      if (!lines.length) return alert("LF몰 상품 URL을 입력해 주세요.");
      lines.forEach(u => {
        const code = (u.match(/\/app\/product\/([A-Za-z0-9_-]+)/) || [])[1] || "";
        upsertCollectedItem({ url: u, code, title: code ? `LF몰 후보 상품 (${code})` : u }, "URL 등록됨");
      });
      renderCollectView();
    });

    collectView.querySelectorAll(".cp-load-btn").forEach(btnEl => {
      btnEl.addEventListener("click", async () => {
        const picked = collectedArchive[Number(btnEl.dataset.idx)];
        if (!picked) return;
        bridgeMakerData = picked;
        try { localStorage.setItem("lfMakerDataBridge", JSON.stringify(picked)); } catch {}
        activeStep = 2;
        currentView = "studio";
        await syncFromStudioPanel(false, true);
        renderStepSidebar();
        applyViewVisibility();
        scrollPageToTop();
      });
    });

    collectView.querySelectorAll("[data-del-idx]").forEach(btnEl => {
      btnEl.addEventListener("click", () => {
        const idx = Number(btnEl.dataset.delIdx);
        const next = collectedArchive.filter((_, i) => i !== idx);
        saveCollectedArchive(next);
        renderCollectView();
      });
    });

    document.getElementById("btnClearCollectArchive")?.addEventListener("click", () => {
      if (!confirm("1. 상품 수집 보관함을 비울까요?")) return;
      saveCollectedArchive([]);
      renderCollectView();
    });
  }

  function renderStepSidebar() {
    const pct = Math.round((activeStep / WORKFLOW_STEPS.length) * 100);
    document.getElementById("cpStepProgressText").textContent = `전체 진행률 ${activeStep} / ${WORKFLOW_STEPS.length}`;
    document.getElementById("cpStepProgressPct").textContent = `${pct}%`;
    document.getElementById("cpStepProgressBar").style.width = `${pct}%`;

    const listEl = document.getElementById("cpStepList");
    listEl.innerHTML = WORKFLOW_STEPS.map(s => {
      const state = s.step < activeStep ? "done" : s.step === activeStep ? "active" : "wait";
      const badgeTxt = state === "done" ? "완료" : state === "active" ? "진행 중" : "대기";
      const icoTxt = state === "done" ? "✓" : String(s.step);
      return `
        <button type="button" class="cp-step-btn ${state === "active" ? "is-active" : ""}" data-step="${s.step}" data-view="${s.view}">
          <span class="cp-step-badge-ico ico-${state}">${icoTxt}</span>
          <span class="cp-step-texts">
            <span class="cp-step-head-row">
              <span class="cp-step-name">${s.step}. ${s.title}</span>
              <span class="cp-step-tag tag-${state}">${badgeTxt}</span>
            </span>
            <span class="cp-step-desc">${s.sub}</span>
          </span>
        </button>
      `;
    }).join("");

    listEl.querySelectorAll(".cp-step-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        activeStep = Number(btn.dataset.step);
        currentView = btn.dataset.view;
        renderStepSidebar();
        applyViewVisibility();
        if (currentView === "list") fetchProducts();
        scrollPageToTop();
      });
    });
  }

  function applyViewVisibility() {
    menuButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.view === currentView));
    const isCollect = currentView === "collect";
    const isStudio = currentView === "studio";
    const isList = currentView === "list";

    collectView.hidden = !isCollect;
    studioRegSection.style.setProperty("display", isStudio ? "block" : "none", "important");
    if (studioMain) studioMain.style.setProperty("display", isStudio ? "block" : "none", "important");
    listView.hidden = !isList;

    if (isCollect) {
      document.getElementById("cpCurrentTitle").textContent = "1. 상품 수집";
      renderCollectView();
    } else if (isStudio) {
      document.getElementById("cpCurrentTitle").textContent = "2. 상품 제작";
      renderLfReceivedHorizontal(bridgeMakerData);
    } else {
      document.getElementById("cpCurrentTitle").textContent = "3. 재고 관리 · 상품 리스트";
    }
  }

  // =========================================================================
  // 6) 폼 바인딩 & 데이터 동기화 (FORMS & FIREBASE SYNC)
  // =========================================================================
  function getNoticeFromForm(p) {
    const obj = {};
    NOTICE_FIELDS.forEach(([k]) => {
      const val = document.getElementById(`${p}Notice_${k}`)?.value.trim() || "";
      obj[k] = k === "asInfo" ? (val || "상세페이지 참고") : val;
    });
    return obj;
  }

  function setNoticeToForm(p, notice = {}) {
    NOTICE_FIELDS.forEach(([k]) => {
      const el = document.getElementById(`${p}Notice_${k}`);
      if (el) {
        if (k === "asInfo") el.value = notice?.[k] || "상세페이지 참고";
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
    function addRow(opt = { color: "", code: "", size: "", stock: MAX_STOCK }) {
      const safeStock = clampStock(opt.stock ?? MAX_STOCK);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="text" class="opt-color" placeholder="예: 블랙" value="${opt.color || ""}"></td>
        <td><input type="text" class="opt-code" placeholder="예: DMSW6D301BK" value="${opt.code || ""}"></td>
        <td><input type="text" class="opt-size" placeholder="예: 100" value="${opt.size || ""}"></td>
        <td><input type="number" class="opt-stock" min="0" max="${MAX_STOCK}" value="${safeStock}"></td>
        <td><button type="button" class="cp-opt-del-btn">×</button></td>
      `;
      tr.querySelector(".cp-opt-del-btn").addEventListener("click", () => {
        if (tbody.children.length > 1) tr.remove();
        else tr.querySelectorAll("input").forEach(i => (i.value = i.classList.contains("opt-stock") ? MAX_STOCK : ""));
      });
      tbody.appendChild(tr);
    }
    document.getElementById(`${p}BtnAddOpt`).addEventListener("click", () => {
      const last = tbody.lastElementChild;
      addRow({
        color: last?.querySelector(".opt-color")?.value || "",
        code: last?.querySelector(".opt-code")?.value || "",
        size: "",
        stock: MAX_STOCK
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
    function update() {
      const rawList = String(input.value || "").split(/[,/]+/).map(s => s.trim()).filter(Boolean);
      badge.textContent = `${rawList.length} / 20개`;
      badge.classList.toggle("over", rawList.length > 20);
    }
    input.addEventListener("input", update);
    return update;
  }

  const updateStudioTags = setupTagCounter("s");
  const updateEditTags = setupTagCounter("e");

  async function readStudioAndExtensionData() {
    const brand = document.querySelector('input[placeholder="닥스"]')?.value.trim() || "";
    const code = document.querySelector('input[placeholder="DMSW6D301BK"]')?.value.trim() || "";
    const kind = document.querySelector('input[placeholder="긴팔 카라 니트"]')?.value.trim() || "";
    const studioCopy = document.getElementById("copy")?.value.trim() || "";
    const generatedAssets = readGeneratedStudioAssets();

    let storageData = bridgeMakerData || {};
    if (!Object.keys(storageData).length && typeof chrome !== "undefined" && chrome.storage?.local) {
      storageData = await new Promise(r => chrome.storage.local.get("lfMakerData", o => r(o.lfMakerData || {})));
    }
    if (!Object.keys(storageData).length) {
      try {
        const cached = localStorage.getItem("lfMakerDataBridge");
        if (cached) storageData = JSON.parse(cached);
      } catch {}
    }

    const cleanLfName = sanitizeProductTitle(storageData.lfName || storageData.title || "");
    const defaultName = [brand, kind, code].filter(Boolean).join(" ") || cleanLfName || "";
    const collectedOptions = (Array.isArray(storageData.options) && storageData.options.length)
      ? storageData.options.map(o => ({ ...o, stock: clampStock(o.stock ?? MAX_STOCK) }))
      : (code ? [{ color: "", code, size: "", stock: MAX_STOCK }] : []);

    const colorsFromOpts = [...new Set(collectedOptions.map(o => o.color).filter(Boolean))];
    const colorText = (Array.isArray(storageData.colors) && storageData.colors.length)
      ? storageData.colors.join(", ")
      : colorsFromOpts.join(", ");

    const mergedNotice = {
      ...(storageData.notice || {}),
      color: colorText || storageData.notice?.color || "",
      asInfo: "상세페이지 참고"
    };

    const autoTags = Array.isArray(storageData.seoTags) && storageData.seoTags.length
      ? storageData.seoTags
      : buildSeoTagsFromFields({
          name: defaultName,
          lfName: cleanLfName,
          code: collectedOptions[0]?.code || code,
          material: mergedNotice.material || "",
          options: collectedOptions
        });

    const firstHttpThumb =
      (storageData.thumbUrl && !storageData.thumbUrl.startsWith("blob:") ? storageData.thumbUrl : "") ||
      (Array.isArray(storageData.items) ? (storageData.items.find(i => i?.url && !i.url.startsWith("blob:"))?.url || "") : "");

    const rawCost = Number(storageData.discountPrice) || 0;
    const rawReg = Number(storageData.regularPrice) || 0;

    return {
      brand: brand || storageData.brand || extractBrandFromText(cleanLfName),
      code,
      defaultName,
      lfName: cleanLfName,
      sourceUrl: storageData.url || "",
      thumbUrl: generatedAssets.thumbUrl || firstHttpThumb || "",
      detailImgUrl: generatedAssets.detailImgUrl || firstHttpThumb || "",
      discountPrice: rawCost >= 10000 ? rawCost : 0,
      regularPrice: rawReg >= 10000 ? rawReg : 0,
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
    window.postMessage({ type: "REQUEST_LF_MAKER_DATA" }, "*");
    const d = await readStudioAndExtensionData();
    if (d.brand && (overwrite || !document.getElementById("sBrand").value)) document.getElementById("sBrand").value = d.brand;
    if (d.defaultName && (overwrite || !document.getElementById("sName").value)) document.getElementById("sName").value = d.defaultName;
    if (d.lfName && (overwrite || !document.getElementById("sLfName").value)) document.getElementById("sLfName").value = d.lfName;
    if (d.sourceUrl && (overwrite || !document.getElementById("sSourceUrl").value)) document.getElementById("sSourceUrl").value = d.sourceUrl;
    if (d.thumbUrl && (overwrite || !document.getElementById("sThumbUrl").value)) document.getElementById("sThumbUrl").value = d.thumbUrl;
    if (d.detailImgUrl && (overwrite || !document.getElementById("sDetailImgUrl").value)) document.getElementById("sDetailImgUrl").value = d.detailImgUrl;
    if (d.seoTags?.length && (overwrite || !document.getElementById("sTags").value)) {
      document.getElementById("sTags").value = d.seoTags.join(", ");
      updateStudioTags();
    }
    if (d.discountPrice && (overwrite || !parseNum(document.getElementById("sDiscountPrice").value))) {
      document.getElementById("sDiscountPrice").value = formatComma(d.discountPrice);
      const autoSale = calcTargetSalePrice(d.discountPrice);
      if (autoSale) document.getElementById("sPrice").value = formatComma(autoSale);
    }
    if (d.regularPrice && (overwrite || !parseNum(document.getElementById("sRegularPrice").value))) {
      document.getElementById("sRegularPrice").value = formatComma(d.regularPrice);
    }
    if (d.studioCopy && (overwrite || !document.getElementById("sCopy").value)) document.getElementById("sCopy").value = d.studioCopy;
    if (d.options.length) studioOptCtrl.setOptions(d.options);
    if (d.notice && Object.values(d.notice).some(Boolean)) setNoticeToForm("s", d.notice);
    if (d.measuredSizes?.rows?.length) applyMeasuredSizesToStudio(d.measuredSizes);
    if (d.notice?.material) applyFabricMaterialToStudio(d.notice.material);
    if (Array.isArray(d.items) && d.items.length) await applyCollectedPhotosToStudio(d);

    if (showToast) alert("📥 1. 상품 수집 데이터를 제작 폼에 반영했습니다!");
  }

  document.getElementById("btnSyncFromStudio").addEventListener("click", () => syncFromStudioPanel(true, true));

  document.getElementById("btnResetStudioReg").addEventListener("click", () => {
    ["sBrand", "sName", "sLfName", "sTags", "sSourceUrl", "sThumbUrl", "sDetailImgUrl", "sDiscountPrice", "sPrice", "sRegularPrice", "sCopy"]
      .forEach(id => (document.getElementById(id).value = ""));
    document.getElementById("sUploadDate").value = formatDate();
    studioCatCtrl.setPath("");
    studioOptCtrl.setOptions([]);
    setNoticeToForm("s", { asInfo: "상세페이지 참고" });
    updateStudioTags();
  });

  function updateAuthUI() {
    if (authState?.idToken) {
      loginOverlay.hidden = true;
      document.getElementById("cpUserEmail").textContent = `👤 ${authState.email}`;
      syncFromStudioPanel(false, false);
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
      if (currentView === "list") fetchProducts();
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

  menuButtons.forEach(btnEl => {
    btnEl.addEventListener("click", () => {
      currentView = btnEl.dataset.view;
      activeStep = currentView === "list" ? 3 : 2;
      renderStepSidebar();
      applyViewVisibility();
      if (currentView === "list") fetchProducts();
      scrollPageToTop();
    });
  });

  function updateMonthOptions() {
    const select = document.getElementById("mMonthFilter");
    const prev = select.value;
    const months = [...new Set(products.map(p => (p.uploadDate || "").slice(0, 7)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
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
      const matchText =
        p.name.toLowerCase().includes(kw) ||
        p.lfName.toLowerCase().includes(kw) ||
        p.code.toLowerCase().includes(kw) ||
        optCodes.includes(kw) ||
        p.tags.toLowerCase().includes(kw) ||
        p.copy.toLowerCase().includes(kw);
      const matchStatus = filter === "ALL" || p.status === filter;
      const matchMonth = monthFilter === "ALL" || (p.uploadDate || "").startsWith(monthFilter);
      return matchText && matchStatus && matchMonth;
    });
  }

  async function fetchProducts() {
    const tbody = document.getElementById("mTableBody");
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:30px;">데이터 불러오는 중...</td></tr>`;
    try {
      const res = await authFetch(`${BASE_URL}?key=${API_KEY}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "불러오기 실패");
      const docs = json.documents || [];
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
          options: options.map(o => ({ ...o, stock: clampStock(o.stock ?? MAX_STOCK) })),
          notice: { ...notice, asInfo: notice?.asInfo || "상세페이지 참고" },
          tags: f.tags?.stringValue || "",
          sourceUrl: f.sourceUrl?.stringValue || "",
          thumbUrl: f.thumbUrl?.stringValue || "",
          detailImgUrl: f.detailImgUrl?.stringValue || "",
          discountPrice: Number(f.discountPrice?.integerValue || f.discountPrice?.doubleValue || 0),
          price: Number(f.price?.integerValue || f.price?.doubleValue || 0),
          regularPrice: Number(f.regularPrice?.integerValue || f.regularPrice?.doubleValue || 0),
          status: f.status?.stringValue || "판매 중",
          copy: f.copy?.stringValue || "",
          author: f.author?.stringValue || "",
          updatedBy: f.updatedBy?.stringValue || "",
          createdAt
        };
      }).sort((a, b) => b.uploadDate.localeCompare(a.uploadDate) || b.createdAt - a.createdAt);

      updateMonthOptions();
      renderList();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;color:#dc2626;padding:30px;">오류: ${err.message}</td></tr>`;
    }
  }

  async function saveToFirebase(item) {
    const user = getUserName();
    const firstCode = item.code || (item.options?.[0]?.code || "");
    const safeOpts = (item.options || []).map(o => ({ ...o, stock: clampStock(o.stock ?? MAX_STOCK) }));
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
        status: { stringValue: item.status || "판매 중" },
        copy: { stringValue: item.copy || "" },
        author: { stringValue: user },
        updatedBy: { stringValue: user },
        createdAt: { integerValue: String(Date.now()) }
      }
    };
    const res = await authFetch(`${BASE_URL}?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("저장 실패");
  }

  async function updateProductInFirebase(id, item) {
    const fieldKeys = [
      "uploadDate", "brand", "category", "name", "lfName", "code", "optionsJson", "noticeJson", "tags",
      "sourceUrl", "thumbUrl", "detailImgUrl", "discountPrice", "price", "regularPrice",
      "status", "copy", "updatedBy"
    ];
    const masks = fieldKeys.map(f => `updateMask.fieldPaths=${f}`).join("&");
    const firstCode = item.code || (item.options?.[0]?.code || "");
    const safeOpts = (item.options || []).map(o => ({ ...o, stock: clampStock(o.stock ?? MAX_STOCK) }));
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

  async function updateStockOnly(p, newTotalStock) {
    const safeTotal = clampStock(newTotalStock);
    const opts = Array.isArray(p.options) && p.options.length
      ? p.options.map((o, i) => ({ ...o, stock: i === 0 ? safeTotal : 0 }))
      : [{ color: "", code: p.code || "", size: "", stock: safeTotal }];
    p.options = opts;
    const logLine = `[${formatDateTime()}] ${getUserName()}: 재고 ${safeTotal}개로 변경`;
    const nextCopy = p.copy ? `${p.copy}\n${logLine}` : logLine;
    p.copy = nextCopy;

    await authFetch(`${BASE_URL}/${p.id}?updateMask.fieldPaths=optionsJson&updateMask.fieldPaths=copy&updateMask.fieldPaths=updatedBy&key=${API_KEY}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          optionsJson: { stringValue: JSON.stringify(opts) },
          copy: { stringValue: nextCopy },
          updatedBy: { stringValue: getUserName() }
        }
      })
    });
  }

  async function updateStatusOnly(p, newStatus) {
    const logLine = `[${formatDateTime()}] ${getUserName()}: 상태 '${newStatus}' 변경`;
    const nextCopy = p.copy ? `${p.copy}\n${logLine}` : logLine;
    p.copy = nextCopy;
    await authFetch(`${BASE_URL}/${p.id}?updateMask.fieldPaths=status&updateMask.fieldPaths=copy&updateMask.fieldPaths=updatedBy&key=${API_KEY}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          status: { stringValue: newStatus },
          copy: { stringValue: nextCopy },
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
          : [{ color: "", code: p.code || "", size: "", stock: MAX_STOCK }];
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
          r[8] = parseTags(p.tags).join("/");
          if (opt.color) { r[9] = "색상"; r[10] = opt.color; }
          if (opt.size) { r[11] = "사이즈"; r[12] = opt.size; }
          r[61] = p.price || 0;
          r[63] = p.regularPrice || p.price || 0;
          r[64] = clampStock(opt.stock ?? MAX_STOCK);
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
          r[91] = n.size || opt.size || "상세페이지 참조";
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
      p.options && p.options.length ? p.options : [{ color: "", code: p.code || "", size: "", stock: MAX_STOCK }]
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
    document.getElementById("eStatus").value = p.status || "판매 중";
    document.getElementById("eCopy").value = p.copy || "";
    editModal.hidden = false;
  }

  document.getElementById("btnCancelEdit").addEventListener("click", () => {
    editModal.hidden = true;
    editingId = null;
  });

  document.getElementById("btnSaveEdit").addEventListener("click", async () => {
    if (!editingId) return;
    const name = sanitizeProductTitle(document.getElementById("eName").value);
    if (!name) return alert("쿠팡 상품명을 입력해 주세요.");
    try {
      const options = editOptCtrl.getOptions();
      await updateProductInFirebase(editingId, {
        uploadDate: document.getElementById("eUploadDate").value || formatDate(),
        brand: document.getElementById("eBrand").value.trim(),
        category: editCatCtrl.getPath(),
        name,
        lfName: sanitizeProductTitle(document.getElementById("eLfName").value),
        code: options[0]?.code || "",
        options,
        notice: getNoticeFromForm("e"),
        tags: document.getElementById("eTags").value,
        sourceUrl: document.getElementById("eSourceUrl").value.trim(),
        thumbUrl: document.getElementById("eThumbUrl").value.trim(),
        detailImgUrl: document.getElementById("eDetailImgUrl").value.trim(),
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
    await triggerMakeAllAndCaptureAssets();
    const ext = await readStudioAndExtensionData();
    const panelName = sanitizeProductTitle(document.getElementById("sName").value);
    const fullName = panelName || ext.defaultName;
    if (!fullName) return alert("상품명을 입력하거나 제작실에 상품 정보를 먼저 입력해 주세요.");

    const panelOptions = studioOptCtrl.getOptions();
    const finalOptions = panelOptions.length ? panelOptions : ext.options;
    const allColorsStr = [...new Set(finalOptions.map(o => o.color).filter(Boolean))].join(", ");

    const panelNotice = getNoticeFromForm("s");
    const hasPanelNotice = Object.values(panelNotice).some(Boolean);
    const baseNotice = hasPanelNotice ? panelNotice : (ext.notice || {});
    const finalNotice = { ...baseNotice, color: allColorsStr || baseNotice.color || "", asInfo: "상세페이지 참고" };

    const costVal = parseNum(document.getElementById("sDiscountPrice").value) || ext.discountPrice;
    let saleVal = parseNum(document.getElementById("sPrice").value);
    if (!saleVal && costVal) saleVal = calcTargetSalePrice(costVal);

    const thumbVal = document.getElementById("sThumbUrl").value.trim() || ext.thumbUrl;
    const detailVal = document.getElementById("sDetailImgUrl").value.trim() || ext.detailImgUrl || thumbVal;
    const rawTagsVal = document.getElementById("sTags").value.trim() || (ext.seoTags || []).join(", ");

    try {
      await saveToFirebase({
        uploadDate: document.getElementById("sUploadDate").value || formatDate(),
        brand: document.getElementById("sBrand").value.trim() || ext.brand,
        category: studioCatCtrl.getPath(),
        name: fullName,
        lfName: sanitizeProductTitle(document.getElementById("sLfName").value) || ext.lfName,
        code: finalOptions[0]?.code || ext.code,
        options: finalOptions,
        notice: finalNotice,
        tags: rawTagsVal,
        sourceUrl: document.getElementById("sSourceUrl").value.trim() || ext.sourceUrl,
        thumbUrl: thumbVal,
        detailImgUrl: detailVal,
        discountPrice: costVal,
        price: saleVal,
        regularPrice: parseNum(document.getElementById("sRegularPrice").value) || ext.regularPrice,
        status: document.getElementById("sStatus").value || "판매 중",
        copy: document.getElementById("sCopy").value.trim() || ext.studioCopy
      });
      alert(`✅ [${fullName}] 상품이 3. 재고 관리(상품 리스트)에 저장되었습니다!`);
      if (currentView === "list") fetchProducts();
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

  function renderList() {
    const filtered = getFilteredProducts();
    const tbody = document.getElementById("mTableBody");
    document.getElementById("mCount").textContent = filtered.length;
    tbody.innerHTML = "";

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:30px;color:#64748b;">조건에 맞는 상품이 없습니다.</td></tr>`;
      return;
    }

    filtered.forEach((p, idx) => {
      const tr = document.createElement("tr");
      const workerInfo = [
        p.author ? `등록: ${p.author}` : "",
        p.updatedBy ? `마지막 확인: ${p.updatedBy}` : ""
      ].filter(Boolean).join(" · ");

      const uniqueCodes = [...new Set((p.options || []).map(o => o.code).filter(Boolean))];
      const displayCode = uniqueCodes.length ? uniqueCodes.join(", ") : (p.code || "-");
      const totalStock = getTotalStock(p);
      const thumbSrc = p.thumbUrl || p.detailImgUrl || "";

      tr.innerHTML = `
        <td class="cp-num-col">${idx + 1}</td>
        <td style="white-space:nowrap;color:#475569;">${p.uploadDate}</td>
        <td>
          ${thumbSrc
            ? `<img src="${thumbSrc}" class="cp-thumb-mini" alt="썸네일">`
            : `<span style="color:#94a3b8;font-size:11.5px;">없음</span>`}
        </td>
        <td>
          <div style="font-weight:700;word-break:break-word;color:#0f172a;">${p.name}</div>
          ${p.lfName ? `<div class="cp-lf-sub">LF: ${p.lfName}</div>` : ""}
          ${workerInfo ? `<div class="cp-worker-tag">${workerInfo}</div>` : ""}
        </td>
        <td>
          ${p.sourceUrl ? `<a href="${p.sourceUrl}" target="_blank" class="cp-link-btn">링크 ↗</a>` : `<span style="color:#94a3b8;">-</span>`}
        </td>
        <td style="font-family:monospace;font-size:12px;color:#334155;word-break:break-all;">${displayCode}</td>
        <td style="text-align:center;">
          <input type="number" class="cp-stock-input" min="0" max="${MAX_STOCK}" value="${totalStock}">
        </td>
        <td class="cp-price-col">${formatWon(p.discountPrice)}</td>
        <td class="cp-price-col" style="font-weight:700;color:#0f3d2e;">${formatWon(p.price)}</td>
        <td class="cp-price-col" style="color:#64748b;">${formatWon(p.regularPrice)}</td>
        <td>
          <select class="cp-row-status">
            <option value="판매 중" ${p.status === "판매 중" ? "selected" : ""}>판매 중</option>
            <option value="품절" ${p.status === "품절" ? "selected" : ""}>품절</option>
            <option value="확인 필요" ${p.status === "확인 필요" ? "selected" : ""}>확인 필요</option>
            <option value="상품 종료" ${p.status === "상품 종료" ? "selected" : ""}>상품 종료</option>
          </select>
        </td>
        <td>
          <div class="cp-action-wrap">
            <button type="button" class="cp-edit-btn">수정</button>
            <button type="button" class="cp-del-btn">삭제</button>
          </div>
        </td>
      `;
      tr.querySelector(".cp-stock-input").addEventListener("change", e => {
        const clamped = clampStock(e.target.value);
        e.target.value = clamped;
        updateStockOnly(p, clamped);
      });
      tr.querySelector(".cp-row-status").addEventListener("change", e => updateStatusOnly(p, e.target.value));
      tr.querySelector(".cp-edit-btn").addEventListener("click", () => openEditModal(p));
      tr.querySelector(".cp-del-btn").addEventListener("click", () => deleteProduct(p.id));
      tbody.appendChild(tr);
    });
  }

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
    if (e.target.placeholder && /블랙/.test(e.target.placeholder)) {
      const card = e.target.closest("div")?.parentElement?.parentElement || e.target.parentElement;
      if (card) applyNavyWhiteTextColor(card, e.target.value);
    }
  });

  let observerTimer = null;
  const studioObserver = new MutationObserver(() => {
    clearTimeout(observerTimer);
    observerTimer = setTimeout(() => {
      cleanUnwantedUI();
      if (currentView === "studio") {
        if (latestMeasuredSizes?.rows?.length) applyMeasuredSizesToStudio(latestMeasuredSizes);
        if (latestMaterialText) applyFabricMaterialToStudio(latestMaterialText);
        findOptionCards().forEach(card => {
          const cInp = card.querySelector('input[placeholder*="블랙"], input[type="text"]');
          if (cInp?.value) applyNavyWhiteTextColor(card, cInp.value);
        });
      }
    }, 150);
  });
  studioObserver.observe(document.documentElement, { childList: true, subtree: true });

  renderStepSidebar();
  applyViewVisibility();
  updateAuthUI();
})();
