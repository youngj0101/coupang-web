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
  let latestMeasuredSizes = null;
  let latestMaterialText = "";

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

  function parseTags(str) {
    return String(str || "")
      .split(/[,/]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 20);
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

  function calcTargetSalePrice(cost, targetMarginPct = DEFAULT_TARGET_MARGIN, feeRate = DEFAULT_FEE_RATE, shipping = DEFAULT_SHIPPING) {
    const denom = 1 - (Number(feeRate) / 100) - (Number(targetMarginPct) / 100);
    if (denom <= 0) return 0;
    const raw = (parseNum(cost) + parseNum(shipping)) / denom;
    return Math.round(raw / 1000) * 1000;
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
    const proto = input.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(input, str);
    else input.value = str;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function cleanUnwantedUI() {
    // 1) 기존 남성/숏패딩 선택 박스(#lfGender, #lfSizeKind, #lfFillSize) 숨김
    ["#lfGender", "#lfSizeKind", "#lfFillSize"].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) {
        el.style.setProperty("display", "none", "important");
        const box = el.closest("div[style*='background']");
        if (box) box.style.setProperty("display", "none", "important");
      }
    });

    // 2) 사이즈표 제목 변경 및 불필요 선택란/안내문 숨김
    document.querySelectorAll("div, footer, nav, section, aside, label, h1, h2, h3, h4, p, b, strong, small, button, select").forEach(el => {
      if (el.id?.startsWith("cp") || el.closest("#cpTopBar, #cpSidebar, #cpEditModal, #cpLoginOverlay, #cpStudioRegSection")) return;
      if (el.querySelector("#lfReceived, #btnMakeAll, .cp-card")) return;

      const txt = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
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

  function findSizeTableContainer() {
    const addBtn = [...document.querySelectorAll("button")].find(b =>
      !b.id?.startsWith("cp") &&
      !b.closest("#cpStudioRegSection, #cpEditModal") &&
      /사이즈\s*한\s*줄\s*추가/.test((b.innerText || "").replace(/\s+/g, " ").trim())
    );
    if (addBtn) {
      let cur = addBtn.parentElement;
      for (let i = 0; i < 4 && cur; i++) {
        if (cur.querySelectorAll("input").length >= 4) return { container: cur, addBtn };
        cur = cur.parentElement;
      }
    }

    const headerMatch = [...document.querySelectorAll("div, section, table")].find(el => {
      if (el.id?.startsWith("cp") || el.closest("#cpStudioRegSection, #cpEditModal")) return false;
      const t = (el.innerText || "").replace(/\s+/g, " ");
      return /총\s*길이/.test(t) && /어깨너비/.test(t) && /가슴둘레/.test(t) && el.querySelectorAll("input").length >= 4;
    });
    return { container: headerMatch || null, addBtn: addBtn || null };
  }

  function applyMeasuredSizesToStudio(measuredSizes) {
    cleanUnwantedUI();
    if (measuredSizes?.rows?.length) latestMeasuredSizes = measuredSizes;
    const data = measuredSizes?.rows?.length ? measuredSizes : latestMeasuredSizes;
    if (!data?.rows?.length) return;

    const { container, addBtn } = findSizeTableContainer();
    if (!container) return;

    const getRowGroups = () => {
      const trs = [...container.querySelectorAll("tr")].filter(tr => tr.querySelectorAll("input").length >= 4);
      if (trs.length) return trs.map(tr => [...tr.querySelectorAll("input")]);

      const rowDivs = [...container.querySelectorAll("div")].filter(d => {
        const inps = d.querySelectorAll("input");
        return inps.length >= 4 && inps.length <= 6 && ![...d.querySelectorAll("div")].some(sub => sub.querySelectorAll("input").length >= 4);
      });
      if (rowDivs.length) return rowDivs.map(d => [...d.querySelectorAll("input")]);

      const allInps = [...container.querySelectorAll("input")];
      const groups = [];
      for (let i = 0; i + 4 <= allInps.length; i += 5) {
        groups.push(allInps.slice(i, i + 5));
      }
      return groups;
    };

    let groups = getRowGroups();
    let guard = 0;
    while (groups.length < data.rows.length && addBtn && guard < 20) {
      addBtn.click();
      groups = getRowGroups();
      guard++;
    }

    data.rows.forEach((r, idx) => {
      const rowInputs = groups[idx];
      if (!rowInputs) return;
      const vals = [r.size, r.totalLength, r.shoulder, r.chest, r.sleeve];
      vals.forEach((v, cIdx) => {
        if (rowInputs[cIdx] && v !== undefined && v !== "") {
          setNativeInputValue(rowInputs[cIdx], v);
        }
      });
    });
  }

  function applyFabricMaterialToStudio(materialText) {
    if (materialText) latestMaterialText = materialText;
    const text = materialText || latestMaterialText;
    if (!text) return;

    const labels = [...document.querySelectorAll("label, span, div, p, b, strong")].filter(el =>
      !el.id?.startsWith("cp") &&
      !el.closest("#cpStudioRegSection, #cpEditModal") &&
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

  // 제작실 내부가 늦게 렌더되는 경우에도 실측 사이즈·소재가 빠지지 않게 보완
  const studioObserver = new MutationObserver(() => {
    cleanUnwantedUI();
    if (latestMeasuredSizes?.rows?.length) applyMeasuredSizesToStudio(latestMeasuredSizes);
    if (latestMaterialText) applyFabricMaterialToStudio(latestMaterialText);
  });
  studioObserver.observe(document.documentElement, { childList: true, subtree: true });

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
  document.head.appendChild(style);

  const studioMain = document.querySelector("main");

  const topBar = document.createElement("header");
  topBar.id = "cpTopBar";
  topBar.innerHTML = `
    <div class="cp-brand-wrap">
      <span class="cp-brand-logo">쿠팡 자동화</span>
      <span class="cp-brand-title" id="cpCurrentTitle">상세페이지·썸네일 제작실</span>
    </div>
    <div class="cp-top-right">
      <button type="button" id="btnQuickSave" class="cp-sync-btn">☁️ 제작실 상품 바로 저장</button>
    </div>
  `;

  const layout = document.createElement("div");
  layout.id = "cpLayout";

  const sidebar = document.createElement("aside");
  sidebar.id = "cpSidebar";
  sidebar.innerHTML = `
    <div class="cp-menu-group">1) 제작 도구</div>
    <button type="button" class="cp-menu-item active" data-view="studio">└ 상세페이지·썸네일 제작실</button>

    <div class="cp-menu-group">2) 상품 관리</div>
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

  const listView = document.createElement("div");
  listView.id = "cpListView";
  listView.hidden = true;
  listView.style.width = "100%";
  listView.innerHTML = `
    <div class="cp-card cp-list-card">
      <div class="cp-card-head">
        <h2 style="margin:0;">📦 등록된 상품 리스트 (<span id="mCount">0</span>개)</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" id="btnExportExcel" class="cp-excel-btn">📥 쿠팡 일괄등록 엑셀 다운로드</button>
          <button type="button" id="btnRefresh" class="cp-primary-btn">🔄 새로고침</button>
        </div>
      </div>
      <div class="cp-toolbar">
        <select id="mMonthFilter"><option value="ALL">전체 월 보기</option></select>
        <select id="mFilter">
          <option value="ALL">전체 상태 보기</option>
          <option value="수집완료">수집완료</option>
          <option value="상세페이지 제작중">상세페이지 제작중</option>
          <option value="업로드 완료">업로드 완료</option>
        </select>
        <input id="mSearch" type="text" placeholder="상품명, 품번, 태그 검색...">
      </div>
      <div class="cp-table-wrap">
        <table class="cp-table">
          <thead>
            <tr>
              <th style="width:48px;text-align:center;">순번</th>
              <th style="width:94px;">업로드 날짜</th>
              <th style="min-width:220px;">상품명 (쿠팡 / LF몰)</th>
              <th style="width:72px;">상품링크</th>
              <th style="width:125px;">품번</th>
              <th style="width:96px;text-align:right;">최대혜택가(소싱)</th>
              <th style="width:130px;text-align:right;">쿠팡 판매가 / 마진</th>
              <th style="width:96px;text-align:right;">정가</th>
              <th style="width:136px;">상태</th>
              <th style="width:102px;">관리</th>
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
      const defVal = key === "asInfo" ? "상세페이지 참고" : "";
      return `<label class="cp-field-label">${label}<input id="${p}Notice_${key}" type="text" value="${defVal}" placeholder="비워두면 '상세페이지 참조'로 자동 입력"></label>`;
    }).join("");

    return `
      <div class="cp-grid-3">
        <label class="cp-field-label">업로드 날짜<input id="${p}UploadDate" type="date" value="${formatDate()}"></label>
        <label class="cp-field-label">브랜드<input id="${p}Brand" type="text" placeholder="예: 닥스"></label>
        <label class="cp-field-label">진행 상태
          <select id="${p}Status">
            <option value="수집완료">1. 수집완료</option>
            <option value="상세페이지 제작중" ${isStudio ? "selected" : ""}>2. 상세페이지 제작중</option>
            <option value="업로드 완료">3. 쿠팡 업로드 완료</option>
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
        <label class="cp-field-label">쿠팡 판매가 (20% 마진 자동)<input id="${p}Price" class="cp-money-input" type="text" inputmode="numeric" placeholder="자동 계산됨"></label>
        <label class="cp-field-label">정가 (할인율기준가/원)<input id="${p}RegularPrice" class="cp-money-input" type="text" inputmode="numeric" placeholder="예: 129,000"></label>
      </div>

      <div class="cp-margin-box">
        <div class="cp-margin-title">🧮 마진율 자동계산기 (수수료 11.55% · 무료배송 0원 · 1,000원 단위 반올림)</div>
        <div class="cp-margin-row">
          <label class="cp-field-label">수수료율 (%)<input id="${p}FeeRate" type="number" step="0.01" value="${DEFAULT_FEE_RATE}"></label>
          <label class="cp-field-label">배송비 부담 (원)<input id="${p}Shipping" class="cp-money-input" type="text" inputmode="numeric" value="${DEFAULT_SHIPPING}"></label>
          <label class="cp-field-label">목표 마진율 (%)<input id="${p}TargetMargin" type="number" value="${DEFAULT_TARGET_MARGIN}"></label>
          <button type="button" id="${p}BtnCalcPrice" class="cp-calc-btn">판매가 자동 계산</button>
        </div>
        <div id="${p}MarginResult" class="cp-margin-result">
          <span>쿠팡 수수료: 0원</span>
          <span>예상 부가세: 0원</span>
          <span class="cp-profit-pos">예상 순수익: 0원 (0.0%)</span>
          <span class="cp-profit-pos">부가세 포함 순수익: 0원 (0.0%)</span>
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
      <h2 style="margin:0;">📥 이미지 수집 · 상품 정보</h2>
      <button type="button" id="btnSyncFromStudio" class="cp-sub-btn">🔄 확장프로그램 수집값 자동 반영</button>
    </div>
    ${buildFormHTML("s", true)}
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px;">
      <button type="button" id="btnResetStudioReg" class="cp-cancel-btn">입력 초기화</button>
      <button type="button" id="btnSaveFromStudioSection" class="cp-primary-btn">☁️ 상품 리스트에 저장하기</button>
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
  setTimeout(cleanUnwantedUI, 600);

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

  function bindMarginCalc(p, autoFillOnCostChange = false) {
    const costEl = document.getElementById(`${p}DiscountPrice`);
    const priceEl = document.getElementById(`${p}Price`);
    const feeEl = document.getElementById(`${p}FeeRate`);
    const shipEl = document.getElementById(`${p}Shipping`);
    const targetEl = document.getElementById(`${p}TargetMargin`);
    const resEl = document.getElementById(`${p}MarginResult`);

    function applyTarget(force = false) {
      const cost = parseNum(costEl.value);
      const target = Number(targetEl.value) || DEFAULT_TARGET_MARGIN;
      if (!cost) {
        if (force) alert("먼저 최대혜택가(소싱가)를 입력해 주세요.");
        return;
      }
      const recommended = calcTargetSalePrice(cost, target, feeEl.value, shipEl.value);
      if (!recommended) {
        if (force) alert("목표 마진율이 너무 높습니다.");
        return;
      }
      if (force || !parseNum(priceEl.value)) {
        priceEl.value = formatComma(recommended);
      }
    }

    function update() {
      const { fee, profit, rate, vat, profitAfterVat, rateAfterVat } =
        calcMargin(costEl.value, priceEl.value, feeEl.value, shipEl.value);
      const c1 = profit >= 0 ? "cp-profit-pos" : "cp-profit-neg";
      const c2 = profitAfterVat >= 0 ? "cp-profit-pos" : "cp-profit-neg";
      resEl.innerHTML = `
        <span>쿠팡 수수료: ${formatWon(fee)}</span>
        <span>예상 부가세: ${formatWon(vat)}</span>
        <span class="${c1}">예상 순수익: ${formatWon(profit)} (${rate.toFixed(1)}%)</span>
        <span class="${c2}">부가세 포함 순수익: ${formatWon(profitAfterVat)} (${rateAfterVat.toFixed(1)}%)</span>
      `;
    }

    costEl.addEventListener("input", () => {
      if (autoFillOnCostChange) applyTarget(false);
      update();
    });
    [priceEl, feeEl, shipEl].forEach(el => el.addEventListener("input", update));
    document.getElementById(`${p}BtnCalcPrice`).addEventListener("click", () => {
      applyTarget(true);
      update();
    });
    return { update, applyTarget };
  }

  const studioMarginCtrl = bindMarginCalc("s", true);
  const editMarginCtrl = bindMarginCalc("e", false);

  async function readStudioAndExtensionData() {
    const brand = document.querySelector('input[placeholder="닥스"]')?.value.trim() || "";
    const code = document.querySelector('input[placeholder="DMSW6D301BK"]')?.value.trim() || "";
    const kind = document.querySelector('input[placeholder="긴팔 카라 니트"]')?.value.trim() || "";
    const studioCopy = document.getElementById("copy")?.value.trim() || "";
    const firstImg = document.querySelector("#lfReceived img")?.src || "";

    const storageData = (typeof chrome !== "undefined" && chrome.storage)
      ? await new Promise(r => chrome.storage.local.get("lfMakerData", o => r(o.lfMakerData || {})))
      : {};

    const defaultName = [brand, kind, code].filter(Boolean).join(" ") || storageData.lfName || storageData.title || "";
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

    return {
      brand,
      code,
      defaultName,
      lfName: storageData.lfName || storageData.title || "",
      sourceUrl: storageData.url || "",
      thumbUrl: storageData.thumbUrl || firstImg,
      discountPrice: Number(storageData.discountPrice) || 0,
      regularPrice: Number(storageData.regularPrice) || 0,
      options: collectedOptions,
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
    if (d.defaultName && (overwrite || !document.getElementById("sName").value)) {
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
    if (d.discountPrice && (overwrite || !parseNum(document.getElementById("sDiscountPrice").value))) {
      document.getElementById("sDiscountPrice").value = formatComma(d.discountPrice);
      const autoSale = calcTargetSalePrice(d.discountPrice, Number(document.getElementById("sTargetMargin").value) || DEFAULT_TARGET_MARGIN, document.getElementById("sFeeRate").value, document.getElementById("sShipping").value);
      if (autoSale) document.getElementById("sPrice").value = formatComma(autoSale);
    }
    if (d.regularPrice && (overwrite || !parseNum(document.getElementById("sRegularPrice").value))) {
      document.getElementById("sRegularPrice").value = formatComma(d.regularPrice);
    }
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
    if (showToast) alert("📥 확장프로그램 수집값(옵션·고시정보·가격·실측사이즈·소재·상품명·이미지)을 반영했습니다!");
  }

  document.getElementById("btnSyncFromStudio").addEventListener("click", () => syncFromStudioPanel(true, true));

  if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.lfMakerData?.newValue) {
        syncFromStudioPanel(false, true);
      }
    });
  }

  document.getElementById("btnResetStudioReg").addEventListener("click", () => {
    ["sBrand", "sName", "sLfName", "sTags", "sSourceUrl", "sThumbUrl", "sDetailImgUrl", "sDiscountPrice", "sPrice", "sRegularPrice", "sCopy"]
      .forEach(id => (document.getElementById(id).value = ""));
    document.getElementById("sUploadDate").value = formatDate();
    document.getElementById("sTargetMargin").value = DEFAULT_TARGET_MARGIN;
    studioCatCtrl.setPath("");
    studioOptCtrl.setOptions([]);
    setNoticeToForm("s", { asInfo: "상세페이지 참고" });
    updateStudioTags();
    studioMarginCtrl.update();
  });

  function updateAuthUI() {
    if (authState?.idToken) {
      loginOverlay.hidden = true;
      document.getElementById("cpUserEmail").textContent = `👤 ${authState.email}`;
      syncFromStudioPanel(false, false);
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
  const titles = {
    studio: "상세페이지·썸네일 제작실",
    list: "상품 리스트"
  };

  function switchView(viewName) {
    menuButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.view === viewName));
    titleEl.textContent = titles[viewName] || "";
    const isStudio = viewName === "studio";
    if (studioMain) studioMain.hidden = !isStudio;
    studioRegSection.hidden = !isStudio;
    listView.hidden = isStudio;
    if (isStudio) {
      syncFromStudioPanel(false, false);
      cleanUnwantedUI();
    } else {
      fetchProducts();
    }
  }

  menuButtons.forEach(btn => btn.addEventListener("click", () => switchView(btn.dataset.view)));

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
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:30px;">데이터 불러오는 중...</td></tr>`;
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
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:#dc2626;padding:30px;">오류: ${err.message}</td></tr>`;
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
        status: { stringValue: item.status || "상세페이지 제작중" },
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
    document.getElementById("eStatus").value = p.status || "수집완료";
    document.getElementById("eCopy").value = p.copy || "";
    editMarginCtrl.update();
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

    const costVal = parseNum(document.getElementById("sDiscountPrice").value) || ext.discountPrice;
    let saleVal = parseNum(document.getElementById("sPrice").value);
    if (!saleVal && costVal) {
      saleVal = calcTargetSalePrice(costVal, Number(document.getElementById("sTargetMargin").value) || DEFAULT_TARGET_MARGIN, document.getElementById("sFeeRate").value, document.getElementById("sShipping").value);
    }

    const panelCopy = document.getElementById("sCopy").value.trim();
    const finalCopy = panelCopy || ext.studioCopy;

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
        tags: document.getElementById("sTags").value,
        sourceUrl: document.getElementById("sSourceUrl").value.trim() || ext.sourceUrl,
        thumbUrl: document.getElementById("sThumbUrl").value.trim() || ext.thumbUrl,
        detailImgUrl: document.getElementById("sDetailImgUrl").value.trim(),
        discountPrice: costVal,
        price: saleVal,
        regularPrice: parseNum(document.getElementById("sRegularPrice").value) || ext.regularPrice,
        status: document.getElementById("sStatus").value || "상세페이지 제작중",
        copy: finalCopy
      });
      alert(`✅ [${fullName}] 상품이 저장되었습니다!\n(옵션 ${finalOptions.length}개 · 20% 마진 판매가 반영)`);
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

  function renderList() {
    const filtered = getFilteredProducts();
    const tbody = document.getElementById("mTableBody");

    document.getElementById("mCount").textContent = filtered.length;
    tbody.innerHTML = "";

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:30px;color:#64748b;">조건에 맞는 상품이 없습니다.</td></tr>`;
      return;
    }

    filtered.forEach((p, idx) => {
      const tr = document.createElement("tr");
      const { profitAfterVat, rateAfterVat } = calcMargin(p.discountPrice, p.price);
      const marginBadge = p.price > 0
        ? `<div class="cp-margin-badge ${profitAfterVat >= 0 ? "pos" : "neg"}">세후 ${rateAfterVat.toFixed(1)}% (${formatWon(profitAfterVat)})</div>`
        : "";
      const workerInfo = [
        p.author ? `등록: ${p.author}` : "",
        p.updatedBy ? `수정: ${p.updatedBy}` : ""
      ].filter(Boolean).join(" · ");

      const uniqueCodes = [...new Set((p.options || []).map(o => o.code).filter(Boolean))];
      const displayCode = uniqueCodes.length ? uniqueCodes.join(", ") : (p.code || "-");

      tr.innerHTML = `
        <td class="cp-num-col">${idx + 1}</td>
        <td style="white-space:nowrap;color:#475569;">${p.uploadDate}</td>
        <td>
          <div style="font-weight:700;word-break:break-word;color:#0f172a;">${p.name}</div>
          ${p.lfName ? `<div class="cp-lf-sub">LF: ${p.lfName}</div>` : ""}
          ${workerInfo ? `<div class="cp-worker-tag">${workerInfo}</div>` : ""}
        </td>
        <td>
          ${p.sourceUrl ? `<a href="${p.sourceUrl}" target="_blank" class="cp-link-btn">링크 ↗</a>` : `<span style="color:#94a3b8;">-</span>`}
        </td>
        <td style="font-family:monospace;font-size:12px;color:#334155;word-break:break-all;">${displayCode}</td>
        <td class="cp-price-col">${formatWon(p.discountPrice)}</td>
        <td class="cp-price-col">
          <div style="font-weight:700;color:#003cb3;">${formatWon(p.price)}</div>
          ${marginBadge}
        </td>
        <td class="cp-price-col" style="color:#64748b;">${formatWon(p.regularPrice)}</td>
        <td>
          <select class="cp-row-status">
            <option value="수집완료" ${p.status === "수집완료" ? "selected" : ""}>수집완료</option>
            <option value="상세페이지 제작중" ${p.status === "상세페이지 제작중" ? "selected" : ""}>상세페이지 제작중</option>
            <option value="업로드 완료" ${p.status === "업로드 완료" ? "selected" : ""}>업로드 완료</option>
          </select>
        </td>
        <td>
          <div class="cp-action-wrap">
            <button type="button" class="cp-edit-btn">수정</button>
            <button type="button" class="cp-del-btn">삭제</button>
          </div>
        </td>
      `;
      tr.querySelector(".cp-row-status").addEventListener("change", e => updateStatusOnly(p.id, e.target.value));
      tr.querySelector(".cp-edit-btn").addEventListener("click", () => openEditModal(p));
      tr.querySelector(".cp-del-btn").addEventListener("click", () => deleteProduct(p.id));
      tbody.appendChild(tr);
    });
  }

  updateAuthUI();
})();
