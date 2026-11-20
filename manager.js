(() => {
  if (window.__CP_MANAGER_LOADED__) return;
  window.__CP_MANAGER_LOADED__ = true;

  const PROJECT_ID = "coupang-auto-9f7f0";
  const API_KEY = "AIzaSyDaySX9tYRXdftu7TGEdb5kG-nv44OqS90";
  const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/products`;
  const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  const REFRESH_URL = `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`;
  const AUTH_STORAGE_KEY = "cp_team_auth_v1";

  const DEFAULT_FEE_RATE = 11.55; // 쿠팡 수수료율 (%)
  const DEFAULT_SHIPPING = 0;     // 기본 배송비 (원)

  // 남성 의류 카테고리 프리셋
  const MENS_CATEGORIES = [
    "패션의류잡화>남성패션>남성의류>가디건>남성 기본(허리길이)가디건",
    "패션의류잡화>남성패션>남성의류>가디건>남성 롱 가디건",
    "패션의류잡화>남성패션>남성의류>골프의류>남성 골프 니트/가디건",
    "패션의류잡화>남성패션>남성의류>골프의류>남성 골프 바람막이/재킷",
    "패션의류잡화>남성패션>남성의류>골프의류>남성 골프 바지",
    "패션의류잡화>남성패션>남성의류>골프의류>남성 골프 셔츠",
    "패션의류잡화>남성패션>남성의류>골프의류>남성 골프 조끼",
    "패션의류잡화>남성패션>남성의류>골프의류>남성 골프 티셔츠",
    "패션의류잡화>남성패션>남성의류>골프의류>남성 골프 패딩/다운패딩",
    "패션의류잡화>남성패션>남성의류>남성 맨투맨",
    "패션의류잡화>남성패션>남성의류>남성 베스트(조끼)",
    "패션의류잡화>남성패션>남성의류>남성 와이셔츠(드레스셔츠)",
    "패션의류잡화>남성패션>남성의류>남성 정장세트",
    "패션의류잡화>남성패션>남성의류>남성 캐주얼 셔츠",
    "패션의류잡화>남성패션>남성의류>남성 후드집업/집업류",
    "패션의류잡화>남성패션>남성의류>남성 후드티",
    "패션의류잡화>남성패션>남성의류>남성레깅스",
    "패션의류잡화>남성패션>남성의류>등산/아웃도어 의류>남성 등산/아웃도어 니트/스웨터",
    "패션의류잡화>남성패션>남성의류>등산/아웃도어 의류>남성 등산/아웃도어 바람막이/방수자켓",
    "패션의류잡화>남성패션>남성의류>등산/아웃도어 의류>남성 등산/아웃도어 바지",
    "패션의류잡화>남성패션>남성의류>등산/아웃도어 의류>남성 등산/아웃도어 셔츠",
    "패션의류잡화>남성패션>남성의류>등산/아웃도어 의류>남성 등산/아웃도어 조끼",
    "패션의류잡화>남성패션>남성의류>등산/아웃도어 의류>남성 등산/아웃도어 패딩/점퍼",
    "패션의류잡화>남성패션>남성의류>등산/아웃도어 의류>남성 등산/아웃도어 플리스자켓",
    "패션의류잡화>남성패션>남성의류>등산/아웃도어 의류>등산/아웃도어 티셔츠",
    "패션의류잡화>남성패션>남성의류>바지/캐주얼>남성 긴바지",
    "패션의류잡화>남성패션>남성의류>바지/캐주얼>남성 반바지",
    "패션의류잡화>남성패션>남성의류>바지/캐주얼>남성 정장바지",
    "패션의류잡화>남성패션>남성의류>스웨터/니트>남성 라운드넥",
    "패션의류잡화>남성패션>남성의류>스웨터/니트>남성 브이넥",
    "패션의류잡화>남성패션>남성의류>스웨터/니트>남성 카라넥",
    "패션의류잡화>남성패션>남성의류>스웨터/니트>남성 터틀넥",
    "패션의류잡화>남성패션>남성의류>스웨터/니트>남성 후드",
    "패션의류잡화>남성패션>남성의류>스포츠의류>남성 스포츠 니트/스웨터",
    "패션의류잡화>남성패션>남성의류>스포츠의류>남성 스포츠 상하의 세트",
    "패션의류잡화>남성패션>남성의류>스포츠의류>남성 스포츠 셔츠",
    "패션의류잡화>남성패션>남성의류>스포츠의류>댄스복",
    "패션의류잡화>남성패션>남성의류>스포츠의류>발레복",
    "패션의류잡화>남성패션>남성의류>스포츠의류>수영복",
    "패션의류잡화>남성패션>남성의류>스포츠의류>스키/보드복",
    "패션의류잡화>남성패션>남성의류>스포츠의류>스포츠 바지/레깅스",
    "패션의류잡화>남성패션>남성의류>스포츠의류>스포츠 자켓/집업",
    "패션의류잡화>남성패션>남성의류>스포츠의류>스포츠 티셔츠/나시",
    "패션의류잡화>남성패션>남성의류>스포츠의류>에어로빅복",
    "패션의류잡화>남성패션>남성의류>스포츠의류>요가/피트니스웨어",
    "패션의류잡화>남성패션>남성의류>재킷>남성 정장재킷",
    "패션의류잡화>남성패션>남성의류>재킷>남성 캐주얼재킷",
    "패션의류잡화>남성패션>남성의류>점퍼>남성 기타 점퍼류",
    "패션의류잡화>남성패션>남성의류>점퍼>남성 바람막이 점퍼",
    "패션의류잡화>남성패션>남성의류>점퍼>남성 야구점퍼/스타디움",
    "패션의류잡화>남성패션>남성의류>점퍼>남성 야상/사파리",
    "패션의류잡화>남성패션>남성의류>점퍼>남성 패딩/다운패딩점퍼",
    "패션의류잡화>남성패션>남성의류>점퍼>남성 패딩/다운패딩조끼",
    "패션의류잡화>남성패션>남성의류>점퍼>남성 항공점퍼/블루종",
    "패션의류잡화>남성패션>남성의류>청바지>남성 긴바지",
    "패션의류잡화>남성패션>남성의류>청바지>남성 반바지",
    "패션의류잡화>남성패션>남성의류>코트>남성 겨울 코트",
    "패션의류잡화>남성패션>남성의류>코트>남성 봄가을 코트/트렌치",
    "패션의류잡화>남성패션>남성의류>티셔츠>남성 긴소매",
    "패션의류잡화>남성패션>남성의류>티셔츠>남성 민소매/나시",
    "패션의류잡화>남성패션>남성의류>티셔츠>남성 반소매",
    "패션의류잡화>남성패션>남성의류>패션 트레이닝복>남성 상의",
    "패션의류잡화>남성패션>남성의류>패션 트레이닝복>남성 상하의 세트",
    "패션의류잡화>남성패션>남성의류>패션 트레이닝복>남성 하의"
  ];

  let products = [];
  let editingId = null;
  let authState = loadAuth();

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

  function formatWon(num) {
    return `${(Number(num) || 0).toLocaleString()}원`;
  }

  function calcMargin(cost, salePrice, feeRate = DEFAULT_FEE_RATE, shipping = DEFAULT_SHIPPING) {
    const c = Number(cost) || 0;
    const s = Number(salePrice) || 0;
    const f = Number(feeRate) || 0;
    const sh = Number(shipping) || 0;
    const fee = Math.round(s * (f / 100));
    const profit = s - c - fee - sh;
    const rate = s > 0 ? (profit / s) * 100 : 0;
    return { fee, profit, rate };
  }

  function calcTargetSalePrice(cost, targetMarginPct, feeRate = DEFAULT_FEE_RATE, shipping = DEFAULT_SHIPPING) {
    const denom = 1 - (Number(feeRate) / 100) - (Number(targetMarginPct) / 100);
    if (denom <= 0) return 0;
    const raw = (Number(cost) + Number(shipping)) / denom;
    return Math.ceil(raw / 100) * 100;
  }

  // SheetJS 동적 로드 (엑셀 생성용)
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

  // 1. 스타일 추가
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
    .cp-excel-btn {
      background: #16a34a !important; color: #fff !important; border: none !important;
      padding: 9px 15px !important; border-radius: 8px !important; font-weight: 700 !important;
      cursor: pointer; font-size: 13px !important; margin: 0 !important;
    }
    .cp-excel-btn:hover { background: #15803d !important; }

    #cpLayout { display: flex; min-height: 100vh; padding-top: 56px; }
    #cpSidebar {
      width: 235px; flex-shrink: 0; background: #fff;
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

    #cpContent { flex: 1; margin-left: 235px; min-width: 0; padding: 24px; }
    #cpContent > main { max-width: 960px !important; margin: 0 auto !important; padding: 0 !important; }

    .cp-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 22px; margin-bottom: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .cp-card-head {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 14px; gap: 10px; flex-wrap: wrap;
    }
    .cp-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 12px; margin-bottom: 12px;
    }
    .cp-toolbar { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; align-items: center; }
    .cp-toolbar input { max-width: 240px; }
    .cp-toolbar select { max-width: 170px; }

    /* 마진율 계산기 박스 */
    .cp-margin-box {
      background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px;
      padding: 14px 16px; margin: 12px 0 16px;
    }
    .cp-margin-title { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 10px; }
    .cp-margin-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
    .cp-margin-row label { flex: 1; min-width: 120px; margin: 0; font-size: 12px; color: #475569; }
    .cp-margin-result {
      margin-top: 12px; padding-top: 10px; border-top: 1px dashed #cbd5e1;
      display: flex; gap: 18px; flex-wrap: wrap; font-size: 13.5px; font-weight: 700;
    }
    .cp-profit-pos { color: #16a34a; }
    .cp-profit-neg { color: #dc2626; }
    .cp-calc-btn {
      background: #0f172a !important; color: #fff !important; border: none !important;
      padding: 8px 12px !important; border-radius: 7px !important; font-size: 12.5px !important;
      font-weight: 600 !important; cursor: pointer; margin: 0 !important; height: 37px;
    }

    .cp-table-wrap { width: 100%; overflow-x: auto; }
    .cp-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 1120px; }
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
      background: #fff; width: 100%; max-width: 680px; max-height: 92vh; overflow-y: auto;
      border-radius: 14px; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.18);
    }
    .cp-login-box { max-width: 380px; text-align: center; }
    .cp-login-box h2 { margin: 0 0 8px; color: #003cb3; font-size: 22px; }
    .cp-login-box p { margin: 0 0 20px; color: #64748b; font-size: 13.5px; }
    .cp-login-box input { margin-bottom: 12px; padding: 11px 12px !important; }
    .cp-login-err { color: #dc2626; font-size: 12.5px; min-height: 18px; margin-bottom: 10px; }
    .cp-modal-box h3 { margin: 0 0 14px; font-size: 18px; color: #0f172a; }
    .cp-modal-box label { font-size: 12.5px; font-weight: 700; color: #475569; margin-bottom: 10px; text-align: left; }
    .cp-modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .cp-cancel-btn {
      background: #e2e8f0 !important; color: #334155 !important;
      padding: 9px 16px !important; border-radius: 8px !important; font-weight: 600 !important;
    }
  `;
  document.head.appendChild(style);

  // 카테고리 datalist
  const catDataList = document.createElement("datalist");
  catDataList.id = "cpCategoryOptions";
  catDataList.innerHTML = MENS_CATEGORIES.map(c => `<option value="${c}"></option>`).join("");
  document.body.appendChild(catDataList);

  // 2. 레이아웃 구성
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
    <button type="button" class="cp-menu-item" data-view="add">└ 새 상품 직접 등록</button>

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
  listView.innerHTML = `
    <div class="cp-card">
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
        <input id="mSearch" type="text" placeholder="상품명, 품번, 메모 검색...">
      </div>
      <div class="cp-table-wrap">
        <table class="cp-table">
          <thead>
            <tr>
              <th style="width:48px;text-align:center;">순번</th>
              <th style="width:96px;">업로드 날짜</th>
              <th style="min-width:200px;">상품명</th>
              <th style="width:74px;">상품링크</th>
              <th style="width:120px;">품번</th>
              <th style="width:96px;text-align:right;">제품 할인가</th>
              <th style="width:125px;text-align:right;">쿠팡 판매가 / 마진</th>
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

  const addView = document.createElement("div");
  addView.id = "cpAddView";
  addView.hidden = true;
  addView.innerHTML = `
    <div class="cp-card">
      <div class="cp-card-head"><h2 style="margin:0;">➕ 새 상품 직접 등록</h2></div>
      <div class="cp-grid">
        <label>업로드 날짜<input id="mUploadDate" type="date" value="${formatDate()}"></label>
        <label>브랜드<input id="mBrand" type="text" placeholder="예: 닥스"></label>
        <label>품번<input id="mCode" type="text" placeholder="예: DMSW6D301BK"></label>
        <label>진행 상태
          <select id="mStatus">
            <option value="수집완료">1. 수집완료</option>
            <option value="상세페이지 제작중">2. 상세페이지 제작중</option>
            <option value="업로드 완료">3. 쿠팡 업로드 완료</option>
          </select>
        </label>
      </div>
      <label>상품명<input id="mName" type="text" placeholder="예: 닥스 남성 긴팔 카라 니트"></label>
      <label>쿠팡 카테고리 (클릭 또는 검색)<input id="mCategory" list="cpCategoryOptions" placeholder="예: 남성 카라넥, 남성 패딩 등 검색..."></label>
      <div class="cp-grid">
        <label>색상 옵션 (쉼표 구분)<input id="mColors" type="text" placeholder="예: 블랙, 네이비"></label>
        <label>사이즈 옵션 (쉼표 구분)<input id="mSizes" type="text" placeholder="예: 95, 100, 105"></label>
      </div>
      <div class="cp-grid">
        <label>상품링크 (URL)<input id="mSourceUrl" type="url" placeholder="https://www.lfmall.co.kr/..."></label>
        <label>대표이미지 URL<input id="mThumbUrl" type="url" placeholder="https://..."></label>
        <label>상세설명 이미지 URL<input id="mDetailImgUrl" type="url" placeholder="https://... (여러 개는 쉼표 구분)"></label>
      </div>
      <div class="cp-grid">
        <label>제품 할인가 (소싱가/원)<input id="mDiscountPrice" type="number" placeholder="예: 69000"></label>
        <label>쿠팡 판매가 (원)<input id="mPrice" type="number" placeholder="예: 89000"></label>
        <label>정가 (할인율기준가/원)<input id="mRegularPrice" type="number" placeholder="예: 129000"></label>
      </div>

      <!-- 마진율 자동계산기 (등록용) -->
      <div class="cp-margin-box">
        <div class="cp-margin-title">🧮 마진율 자동계산기 (기본 수수료 11.55% · 무료배송 0원)</div>
        <div class="cp-margin-row">
          <label>수수료율 (%)<input id="mFeeRate" type="number" step="0.01" value="${DEFAULT_FEE_RATE}"></label>
          <label>배송비 부담 (원)<input id="mShipping" type="number" value="${DEFAULT_SHIPPING}"></label>
          <label>목표 마진율 (%)<input id="mTargetMargin" type="number" placeholder="예: 20"></label>
          <button type="button" id="btnCalcAddPrice" class="cp-calc-btn">판매가 자동 계산</button>
        </div>
        <div id="mMarginResult" class="cp-margin-result">
          <span>수수료: 0원</span>
          <span>예상 순수익: 0원</span>
          <span>마진율: 0.0%</span>
        </div>
      </div>

      <label>상세페이지 문구 / 메모
        <textarea id="mCopy" rows="3" placeholder="CHECK POINT 문구나 메모를 입력하세요"></textarea>
      </label>
      <button type="button" id="btnAddManual" class="cp-primary-btn">+ 상품 저장하기</button>
    </div>
  `;

  const editModal = document.createElement("div");
  editModal.id = "cpEditModal";
  editModal.hidden = true;
  editModal.innerHTML = `
    <div class="cp-modal-box">
      <h3>✏️ 상품 정보 수정</h3>
      <div class="cp-grid">
        <label>업로드 날짜<input id="eUploadDate" type="date"></label>
        <label>브랜드<input id="eBrand" type="text"></label>
        <label>품번<input id="eCode" type="text"></label>
      </div>
      <label>상품명<input id="eName" type="text"></label>
      <label>쿠팡 카테고리<input id="eCategory" list="cpCategoryOptions" placeholder="카테고리 선택 또는 검색"></label>
      <div class="cp-grid">
        <label>색상 옵션 (쉼표 구분)<input id="eColors" type="text" placeholder="예: 블랙, 네이비"></label>
        <label>사이즈 옵션 (쉼표 구분)<input id="eSizes" type="text" placeholder="예: 95, 100, 105"></label>
      </div>
      <div class="cp-grid">
        <label>상품링크 (URL)<input id="eSourceUrl" type="url"></label>
        <label>대표이미지 URL<input id="eThumbUrl" type="url"></label>
        <label>상세설명 이미지 URL<input id="eDetailImgUrl" type="url"></label>
      </div>
      <div class="cp-grid">
        <label>제품 할인가 (소싱가/원)<input id="eDiscountPrice" type="number"></label>
        <label>쿠팡 판매가 (원)<input id="ePrice" type="number"></label>
        <label>정가 (할인율기준가/원)<input id="eRegularPrice" type="number"></label>
      </div>

      <!-- 마진율 자동계산기 (수정용) -->
      <div class="cp-margin-box">
        <div class="cp-margin-title">🧮 마진율 자동계산기</div>
        <div class="cp-margin-row">
          <label>수수료율 (%)<input id="eFeeRate" type="number" step="0.01" value="${DEFAULT_FEE_RATE}"></label>
          <label>배송비 부담 (원)<input id="eShipping" type="number" value="${DEFAULT_SHIPPING}"></label>
          <label>목표 마진율 (%)<input id="eTargetMargin" type="number" placeholder="예: 20"></label>
          <button type="button" id="btnCalcEditPrice" class="cp-calc-btn">판매가 자동 계산</button>
        </div>
        <div id="eMarginResult" class="cp-margin-result">
          <span>수수료: 0원</span>
          <span>예상 순수익: 0원</span>
          <span>마진율: 0.0%</span>
        </div>
      </div>

      <label>진행 상태
        <select id="eStatus">
          <option value="수집완료">수집완료</option>
          <option value="상세페이지 제작중">상세페이지 제작중</option>
          <option value="업로드 완료">업로드 완료</option>
        </select>
      </label>
      <label>상세페이지 문구 / 메모<textarea id="eCopy" rows="3"></textarea></label>
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

  if (studioMain) content.appendChild(studioMain);
  content.appendChild(listView);
  content.appendChild(addView);
  layout.appendChild(sidebar);
  layout.appendChild(content);

  document.body.insertBefore(topBar, document.body.firstChild);
  document.body.insertBefore(layout, topBar.nextSibling);
  document.body.appendChild(editModal);
  document.body.appendChild(loginOverlay);

  // 마진율 계산기 이벤트 바인딩 함수
  function bindMarginCalc(prefix, btnId) {
    const costEl = document.getElementById(`${prefix}DiscountPrice`);
    const priceEl = document.getElementById(`${prefix}Price`);
    const feeEl = document.getElementById(`${prefix}FeeRate`);
    const shipEl = document.getElementById(`${prefix}Shipping`);
    const targetEl = document.getElementById(`${prefix}TargetMargin`);
    const resEl = document.getElementById(`${prefix}MarginResult`);

    function update() {
      const { fee, profit, rate } = calcMargin(costEl.value, priceEl.value, feeEl.value, shipEl.value);
      const cls = profit >= 0 ? "cp-profit-pos" : "cp-profit-neg";
      resEl.innerHTML = `
        <span>수수료: ${formatWon(fee)}</span>
        <span class="${cls}">예상 순수익: ${formatWon(profit)}</span>
        <span class="${cls}">마진율: ${rate.toFixed(1)}%</span>
      `;
    }

    [costEl, priceEl, feeEl, shipEl].forEach(el => el.addEventListener("input", update));
    document.getElementById(btnId).addEventListener("click", () => {
      const cost = Number(costEl.value) || 0;
      const target = Number(targetEl.value) || 0;
      if (!cost) return alert("먼저 제품 할인가(소싱가)를 입력해 주세요.");
      if (!target) return alert("목표 마진율(%)을 입력해 주세요.");
      const recommended = calcTargetSalePrice(cost, target, feeEl.value, shipEl.value);
      if (!recommended) return alert("목표 마진율이 너무 높습니다.");
      priceEl.value = recommended;
      update();
    });
    return update;
  }

  const updateAddMargin = bindMarginCalc("m", "btnCalcAddPrice");
  const updateEditMargin = bindMarginCalc("e", "btnCalcEditPrice");

  // 3. 인증 및 토큰 자동 갱신
  function updateAuthUI() {
    if (authState?.idToken) {
      loginOverlay.hidden = true;
      document.getElementById("cpUserEmail").textContent = `👤 ${authState.email}`;
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

  // 4. 사이드바 메뉴 전환
  const menuButtons = sidebar.querySelectorAll(".cp-menu-item");
  const titleEl = document.getElementById("cpCurrentTitle");
  const titles = {
    studio: "상세페이지·썸네일 제작실",
    list: "상품 리스트",
    add: "새 상품 직접 등록
