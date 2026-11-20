(() => {
  if (window.__CP_MANAGER_LOADED__) return;
  window.__CP_MANAGER_LOADED__ = true;
  const PROJECT_ID = "coupang-auto-9f7f0";
  const API_KEY = "AIzaSyDaySX9tYRXdftu7TGEdb5kG-nv44OqS90";
  const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/products`;
  const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  const REFRESH_URL = `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`;
  const AUTH_STORAGE_KEY = "cp_team_auth_v1";

  let products = [];
  let editingId = null;
  let authState = loadAuth();

  function loadAuth() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)) || null;
    } catch {
      return null;
    }
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
    .cp-top-right { display: flex; align-items: center; gap: 10px; }
    .cp-sync-btn {
      background: #f59e0b !important; color: #fff !important; border: none !important;
      padding: 8px 16px !important; border-radius: 8px !important; font-weight: 700 !important;
      cursor: pointer; font-size: 13px !important; margin: 0 !important;
    }
    .cp-sync-btn:hover { background: #d97706 !important; }

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
    .cp-logout-btn {
      margin-top: 10px !important; width: 100%;
      background: #f1f5f9 !important; color: #475569 !important;
      border: 1px solid #cbd5e1 !important; padding: 7px 10px !important;
      border-radius: 7px !important; font-size: 12.5px !important; font-weight: 600 !important;
      cursor: pointer;
    }
    .cp-logout-btn:hover { background: #e2e8f0 !important; }

    #cpContent { flex: 1; margin-left: 235px; min-width: 0; padding: 24px; }
    #cpContent > main { max-width: 960px !important; margin: 0 auto !important; padding: 0 !important; }

    .cp-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 22px; margin-bottom: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .cp-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px; margin-bottom: 12px;
    }
    .cp-toolbar { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
    .cp-toolbar input { max-width: 260px; }
    .cp-toolbar select { max-width: 170px; }

    .cp-table-wrap { width: 100%; overflow-x: auto; }
    .cp-table { width: 100%; border-collapse: collapse; font-size: 13.5px; table-layout: fixed; min-width: 740px; }
    .cp-table th, .cp-table td {
      padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: middle;
    }
    .cp-table th { background: #f8fafc; color: #334155; font-weight: 700; }
    .cp-thumb { width: 54px; height: 54px; object-fit: cover; border-radius: 6px; background: #f1f5f9; }
    .cp-memo-preview {
      font-size: 12px; color: #64748b; margin-top: 4px;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      overflow: hidden; word-break: break-word;
    }
    .cp-worker-tag { font-size: 11px; color: #94a3b8; margin-top: 4px; }
    .cp-row-status { width: 100%; font-size: 12.5px !important; padding: 6px !important; }
    .cp-action-wrap { display: flex; gap: 5px; }
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

    /* 수정 모달 & 로그인 오버레이 */
    #cpEditModal, #cpLoginOverlay {
      position: fixed; inset: 0; z-index: 20000;
      background: rgba(15, 23, 42, 0.65);
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    #cpLoginOverlay { background: #f4f6fa; z-index: 30000; }
    #cpEditModal[hidden], #cpLoginOverlay[hidden] { display: none !important; }
    .cp-modal-box {
      background: #fff; width: 100%; max-width: 560px; border-radius: 14px;
      padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.18);
    }
    .cp-login-box { max-width: 380px; text-align: center; }
    .cp-login-box h2 { margin: 0 0 8px; color: #003cb3; font-size: 22px; }
    .cp-login-box p { margin: 0 0 20px; color: #64748b; font-size: 13.5px; }
    .cp-login-box input { margin-bottom: 12px; padding: 11px 12px !important; }
    .cp-login-err { color: #dc2626; font-size: 12.5px; min-height: 18px; margin-bottom: 10px; }
    .cp-modal-box h3 { margin: 0 0 16px; font-size: 18px; color: #0f172a; }
    .cp-modal-box label { font-size: 12.5px; font-weight: 700; color: #475569; margin-bottom: 10px; text-align: left; }
    .cp-modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .cp-cancel-btn {
      background: #e2e8f0 !important; color: #334155 !important;
      padding: 9px 16px !important; border-radius: 8px !important; font-weight: 600 !important;
    }
  `;
  document.head.appendChild(style);

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
      <button type="button" id="btnLogout" class="cp-logout-btn">로그아웃</button>
    </div>
  `;

  const content = document.createElement("div");
  content.id = "cpContent";

  const listView = document.createElement("div");
  listView.id = "cpListView";
  listView.hidden = true;
  listView.innerHTML = `
    <div class="cp-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2 style="margin:0;">📦 등록된 상품 리스트 (<span id="mCount">0</span>개)</h2>
        <button type="button" id="btnRefresh" class="cp-primary-btn">🔄 새로고침</button>
      </div>
      <div class="cp-toolbar">
        <input id="mSearch" type="text" placeholder="상품명 또는 메모 검색...">
        <select id="mFilter">
          <option value="ALL">전체 상태 보기</option>
          <option value="수집완료">수집완료</option>
          <option value="상세페이지 제작중">상세페이지 제작중</option>
          <option value="업로드 완료">업로드 완료</option>
        </select>
      </div>
      <div class="cp-table-wrap">
        <table class="cp-table">
          <thead>
            <tr>
              <th style="width:70px;">썸네일</th>
              <th>상품명 / 메모</th>
              <th style="width:95px;">판매가</th>
              <th style="width:145px;">상태</th>
              <th style="width:110px;">관리</th>
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
      <h2>➕ 새 상품 직접 등록</h2>
      <div class="cp-grid">
        <label>상품명<input id="mName" type="text" placeholder="예: 닥스 남성 긴팔 카라 니트"></label>
        <label>판매가 (원)<input id="mPrice" type="number" placeholder="예: 89000"></label>
        <label>소싱처 URL<input id="mSourceUrl" type="url" placeholder="https://www.lfmall.co.kr/..."></label>
        <label>썸네일 URL<input id="mThumbUrl" type="url" placeholder="https://..."></label>
        <label>진행 상태
          <select id="mStatus">
            <option value="수집완료">1. 수집완료</option>
            <option value="상세페이지 제작중">2. 상세페이지 제작중</option>
            <option value="업로드 완료">3. 쿠팡 업로드 완료</option>
          </select>
        </label>
      </div>
      <label>상세페이지 문구 / 메모
        <textarea id="mCopy" rows="4" placeholder="CHECK POINT 문구나 메모를 입력하세요"></textarea>
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
      <label>상품명<input id="eName" type="text"></label>
      <div class="cp-grid">
        <label>판매가 (원)<input id="ePrice" type="number"></label>
        <label>진행 상태
          <select id="eStatus">
            <option value="수집완료">수집완료</option>
            <option value="상세페이지 제작중">상세페이지 제작중</option>
            <option value="업로드 완료">업로드 완료</option>
          </select>
        </label>
      </div>
      <label>소싱처 URL<input id="eSourceUrl" type="url"></label>
      <label>썸네일 URL<input id="eThumbUrl" type="url"></label>
      <label>상세페이지 문구 / 메모<textarea id="eCopy" rows="5"></textarea></label>
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
      if (!res.ok) throw new Error(data.error?.message || "이메일 또는 비밀번호를 확인해 주세요.");
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
    } catch (e) {
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
    add: "새 상품 직접 등록"
  };

  function switchView(viewName) {
    menuButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.view === viewName));
    titleEl.textContent = titles[viewName] || "";
    if (studioMain) studioMain.hidden = viewName !== "studio";
    listView.hidden = viewName !== "list";
    addView.hidden = viewName !== "add";
    if (viewName === "list") fetchProducts();
  }

  menuButtons.forEach(btn => btn.addEventListener("click", () => switchView(btn.dataset.view)));

  // 5. Firebase CRUD 함수들 (작업자 자동 기록 포함)
  async function fetchProducts() {
    const tbody = document.getElementById("mTableBody");
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;">데이터 불러오는 중...</td></tr>`;
    try {
      const res = await authFetch(`${BASE_URL}?key=${API_KEY}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "불러오기 실패");
      const docs = json.documents || [];
      products = docs.map(doc => {
        const f = doc.fields || {};
        return {
          id: doc.name.split("/").pop(),
          name: f.name?.stringValue || "",
          price: Number(f.price?.integerValue || f.price?.doubleValue || 0),
          sourceUrl: f.sourceUrl?.stringValue || "",
          thumbUrl: f.thumbUrl?.stringValue || "",
          status: f.status?.stringValue || "수집완료",
          copy: f.copy?.stringValue || "",
          author: f.author?.stringValue || "",
          updatedBy: f.updatedBy?.stringValue || "",
          createdAt: Number(f.createdAt?.integerValue || f.createdAt?.doubleValue || 0)
        };
      }).sort((a, b) => b.createdAt - a.createdAt);
      renderList();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#dc2626;padding:30px;">오류: ${err.message}</td></tr>`;
    }
  }

  async function saveToFirebase(item) {
    const user = getUserName();
    const payload = {
      fields: {
        name: { stringValue: item.name },
        price: { integerValue: String(Math.round(item.price || 0)) },
        sourceUrl: { stringValue: item.sourceUrl || "" },
        thumbUrl: { stringValue: item.thumbUrl || "" },
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
    if (!res.ok) throw new Error("저장 실패 (권한 또는 로그인 확인)");
  }

  async function updateProductInFirebase(id, item) {
    const masks = ["name", "price", "sourceUrl", "thumbUrl", "status", "copy", "updatedBy"]
      .map(f => `updateMask.fieldPaths=${f}`).join("&");
    const payload = {
      fields: {
        name: { stringValue: item.name },
        price: { integerValue: String(Math.round(item.price || 0)) },
        sourceUrl: { stringValue: item.sourceUrl || "" },
        thumbUrl: { stringValue: item.thumbUrl || "" },
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

  // 6. 수정 모달
  function openEditModal(p) {
    editingId = p.id;
    document.getElementById("eName").value = p.name;
    document.getElementById("ePrice").value = p.price;
    document.getElementById("eStatus").value = p.status;
    document.getElementById("eSourceUrl").value = p.sourceUrl;
    document.getElementById("eThumbUrl").value = p.thumbUrl;
    document.getElementById("eCopy").value = p.copy;
    editModal.hidden = false;
  }

  document.getElementById("btnCancelEdit").addEventListener("click", () => {
    editModal.hidden = true;
    editingId = null;
  });

  document.getElementById("btnSaveEdit").addEventListener("click", async () => {
    if (!editingId) return;
    const name = document.getElementById("eName").value.trim();
    if (!name) return alert("상품명을 입력해 주세요.");
    try {
      await updateProductInFirebase(editingId, {
        name,
        price: Number(document.getElementById("ePrice").value) || 0,
        status: document.getElementById("eStatus").value,
        sourceUrl: document.getElementById("eSourceUrl").value.trim(),
        thumbUrl: document.getElementById("eThumbUrl").value.trim(),
        copy: document.getElementById("eCopy").value.trim()
      });
      editModal.hidden = true;
      editingId = null;
      fetchProducts();
    } catch (e) {
      alert("수정 중 오류: " + e.message);
    }
  });

  // 7. 제작실 -> 바로 저장
  document.getElementById("btnQuickSave").addEventListener("click", async () => {
    const brand = document.querySelector('input[placeholder="닥스"]')?.value.trim() || "";
    const code = document.querySelector('input[placeholder="DMSW6D301BK"]')?.value.trim() || "";
    const kind = document.querySelector('input[placeholder="긴팔 카라 니트"]')?.value.trim() || "";
    const copy = document.getElementById("copy")?.value.trim() || "";
    const firstImg = document.querySelector("#lfReceived img")?.src || "";

    const storageData = (typeof chrome !== "undefined" && chrome.storage)
      ? await new Promise(r => chrome.storage.local.get("lfMakerData", o => r(o.lfMakerData || {})))
      : {};
    const fullName = [brand, kind, code].filter(Boolean).join(" ") || storageData.title || "이름 없는 상품";

    try {
      await saveToFirebase({
        name: fullName,
        price: 0,
        sourceUrl: storageData.url || "",
        thumbUrl: firstImg,
        status: "상세페이지 제작중",
        copy
      });
      alert(`✅ [${fullName}] 상품이 저장되었습니다!`);
      if (!listView.hidden) fetchProducts();
    } catch (e) {
      alert("저장 중 오류: " + e.message);
    }
  });

  // 8. 수동 등록
  document.getElementById("btnAddManual").addEventListener("click", async () => {
    const name = document.getElementById("mName").value.trim();
    if (!name) return alert("상품명을 입력해 주세요.");
    try {
      await saveToFirebase({
        name,
        price: Number(document.getElementById("mPrice").value) || 0,
        sourceUrl: document.getElementById("mSourceUrl").value.trim(),
        thumbUrl: document.getElementById("mThumbUrl").value.trim(),
        status: document.getElementById("mStatus").value,
        copy: document.getElementById("mCopy").value.trim()
      });
      ["mName", "mPrice", "mSourceUrl", "mThumbUrl", "mCopy"].forEach(id => document.getElementById(id).value = "");
      alert("✅ 상품이 등록되었습니다!");
      switchView("list");
    } catch (e) {
      alert("저장 중 오류: " + e.message);
    }
  });

  document.getElementById("btnRefresh").addEventListener("click", fetchProducts);
  document.getElementById("mSearch").addEventListener("input", renderList);
  document.getElementById("mFilter").addEventListener("change", renderList);

  // 9. 테이블 렌더링
  function renderList() {
    const kw = document.getElementById("mSearch").value.trim().toLowerCase();
    const filter = document.getElementById("mFilter").value;
    const tbody = document.getElementById("mTableBody");

    const filtered = products.filter(p => {
      const matchText = p.name.toLowerCase().includes(kw) || p.copy.toLowerCase().includes(kw);
      const matchStatus = filter === "ALL" || p.status === filter;
      return matchText && matchStatus;
    });

    document.getElementById("mCount").textContent = filtered.length;
    tbody.innerHTML = "";

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:#64748b;">저장된 상품이 없습니다.</td></tr>`;
      return;
    }

    filtered.forEach(p => {
      const tr = document.createElement("tr");
      const workerInfo = [
        p.author ? `등록: ${p.author}` : "",
        p.updatedBy ? `수정: ${p.updatedBy}` : ""
      ].filter(Boolean).join(" · ");

      tr.innerHTML = `
        <td>${p.thumbUrl ? `<img src="${p.thumbUrl}" class="cp-thumb">` : `<div class="cp-thumb"></div>`}</td>
        <td>
          <div style="font-weight:700;word-break:break-word;">
            ${p.sourceUrl ? `<a href="${p.sourceUrl}" target="_blank" style="color:#003cb3;text-decoration:none;">${p.name} ↗</a>` : p.name}
          </div>
          <div class="cp-memo-preview" title="${p.copy.replace(/"/g, '"')}">${p.copy || "메모 없음"}</div>
          ${workerInfo ? `<div class="cp-worker-tag">${workerInfo}</div>` : ""}
        </td>
        <td style="font-weight:600;">${p.price.toLocaleString()}원</td>
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

  // 초기 실행 시 로그인 여부 확인
  updateAuthUI();
})();
