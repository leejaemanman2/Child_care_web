// js/profile.js

// 1) 기본 Store(동기, fallback) 먼저 정의
let Store = {
  get: (k, f = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  remove: (k) => localStorage.removeItem(k),
};

// 2) 가능하면 storage.js로 덮어쓰기 (비동기)
(async () => {
  try {
    const mod = await import('/js/storage.js');
    if (mod?.Store) Store = mod.Store;
  } catch {
    // 실패해도 위 fallback Store 계속 사용
  }
})();

const KEY_PROFILES = 'profiles';
const $ = (s) => document.querySelector(s);

// Toast (auth.js에도 있지만 독립 동작하도록)
function toast(msg, ms = 1800) {
    const t = document.getElementById('toast');
    if (!t) return alert(msg);
    t.textContent = msg;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', ms);
}

function readProfiles() { return Store.get(KEY_PROFILES, []) || []; }
function writeProfiles(arr) { Store.set(KEY_PROFILES, arr); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// 이미지 리사이즈 (최대 512px, jpeg 0.85)
async function toDataURLResized(file, max = 512) {
    if (!file) return '';
    const img = await new Promise(r => {
        const i = new Image();
        i.onload = () => r(i);
        i.src = URL.createObjectURL(file);
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
    const cv = Object.assign(document.createElement('canvas'), { width: w, height: h });
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, w, h);
    return cv.toDataURL('image/jpeg', 0.85);
}

// ===== 목록(검색/정렬/페이지네이션) =====
const state = { q: '', sort: 'createdAt_desc', page: 1, pageSize: 8 };
const els = { list: null, q: null, sort: null, count: null, prev: null, next: null, info: null };

function sortProfiles(arr, sortKey) {
    const copy = [...arr];
    switch (sortKey) {
        case 'name_asc': copy.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko')); break;
        case 'birth_asc': copy.sort((a, b) => (a.birth || '9999-12-31').localeCompare(b.birth || '9999-12-31')); break;
        default: copy.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return copy;
}
function queryProfiles() {
    const all = readProfiles();
    const filtered = all.filter(p => {
        if (!state.q) return true;
        const q = state.q.toLowerCase();
        return (p.name || '').toLowerCase().includes(q) || (p.allergy || '').toLowerCase().includes(q);
    });
    const sorted = sortProfiles(filtered, state.sort);
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * state.pageSize;
    return { total, totalPages, items: sorted.slice(start, start + state.pageSize) };
}
function renderCard(p) {
    const card = document.createElement('div');
    card.style.cssText = 'border:1px solid #e5e5e5;border-radius:12px;padding:12px;';
    card.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;">
      <img src="${p.photo || ''}" alt="" style="width:68px;height:68px;object-fit:cover;border-radius:8px;border:1px solid #eee;${p.photo ? '' : 'display:none;'}"/>
      <div style="flex:1;">
        <div><strong>${p.name}</strong> · ${p.gender || '성별미정'}</div>
        <div style="color:#666;font-size:14px;">생일: ${p.birth || '-'}</div>
        <div style="color:#666;font-size:14px;">알레르기: ${p.allergy || '없음'}</div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <a href="/html/profile-edit.html?id=${encodeURIComponent(p.id)}"><button>수정</button></a>
      <button data-del="${p.id}" style="background:#fee;border:1px solid #fbb;">삭제</button>
    </div>
  `;
    return card;
}
function renderList() {
    const { total, totalPages, items } = queryProfiles();
    if (els.count) els.count.textContent = `${total}명`;
    if (els.info) els.info.textContent = `${state.page} / ${totalPages}`;
    if (els.prev) els.prev.disabled = state.page <= 1;
    if (els.next) els.next.disabled = state.page >= totalPages;
    els.list.innerHTML = items.length ? '' : '<p>조건에 맞는 프로필이 없습니다.</p>';
    for (const p of items) els.list.appendChild(renderCard(p));
}
function bindDeleteOnce() {
    els.list?.addEventListener('click', (e) => {
        const id = e.target.getAttribute?.('data-del');
        if (!id) return;
        if (!confirm('삭제할까요?')) return;
        writeProfiles(readProfiles().filter(x => x.id !== id));
        renderList();
        toast('삭제되었습니다.');
    }, { once: true });
}
function debounce(fn, ms = 200) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function initProfileList() {
    els.list = $('#profileList');
    if (!els.list) return; // 목록 페이지가 아니면 패스
    els.q = $('#q');
    els.sort = $('#sort');
    els.count = $('#count');
    els.prev = $('#prev');
    els.next = $('#next');
    els.info = $('#pageInfo');

    els.q?.addEventListener('input', debounce(() => { state.q = els.q.value.trim(); state.page = 1; renderList(); }, 200));
    els.sort?.addEventListener('change', () => { state.sort = els.sort.value; state.page = 1; renderList(); });
    els.prev?.addEventListener('click', () => { if (state.page > 1) { state.page--; renderList(); } });
    els.next?.addEventListener('click', () => { state.page++; renderList(); });

    // Export / Import 버튼
    $('#exportProfiles')?.addEventListener('click', () => {
        const data = JSON.stringify(readProfiles(), null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'profiles.json';
        a.click();
        URL.revokeObjectURL(a.href);
        toast('프로필 내보내기 완료');
    });
    $('#importProfiles')?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        try {
            const text = await file.text();
            const arr = JSON.parse(text);
            if (!Array.isArray(arr)) throw new Error('not array');
            writeProfiles(arr);
            toast('프로필 가져오기 완료');
            setTimeout(() => location.reload(), 600);
        } catch { toast('JSON 형식이 올바르지 않습니다.'); }
    });

    renderList();
    bindDeleteOnce();
}

// ===== 편집(등록/수정) =====
function initProfileEdit() {
    const form = $('#profileForm');
    if (!form) return;

    const title = $('#formTitle');
    const name = $('#pName');
    const birth = $('#pBirth');
    const gender = $('#pGender');
    const allergy = $('#pAllergy');
    const phone = $('#pPhone');
    const photo = $('#pPhoto');
    const preview = $('#photoPreview');
    const btnCancel = $('#btnCancel');

    photo?.addEventListener('change', () => {
        const file = photo.files?.[0];
        if (!file) { preview.style.display = 'none'; preview.src = ''; return; }
        const r = new FileReader(); r.onload = () => { preview.src = r.result; preview.style.display = 'block'; };
        r.readAsDataURL(file);
    });

    const params = new URLSearchParams(location.search);
    const editId = params.get('id');
    let current = null;
    if (editId) {
        const arr = readProfiles();
        current = arr.find(x => x.id === editId) || null;
        if (current) {
            title.textContent = '프로필 수정';
            name.value = current.name || ''; birth.value = current.birth || ''; gender.value = current.gender || '';
            allergy.value = current.allergy || ''; phone.value = current.phone || '';
            if (current.photo) { preview.src = current.photo; preview.style.display = 'block'; }
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phoneVal = (phone?.value || '').trim();
        if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(phoneVal)) {
            toast('연락처 형식을 확인하세요. (예: 010-1234-5678)'); phone?.focus(); return;
        }

        const file = photo?.files?.[0];
        const photoUrl = file ? await toDataURLResized(file, 512) : (current?.photo || '');

        const arr = readProfiles();
        if (current) {
            Object.assign(current, {
                name: name.value.trim(), birth: birth.value, gender: gender.value,
                allergy: allergy.value.trim(), phone: phoneVal, photo: photoUrl
            });
            writeProfiles(arr); toast('수정되었습니다.');
        } else {
            arr.push({
                id: uid(), name: name.value.trim(), birth: birth.value, gender: gender.value,
                allergy: allergy.value.trim(), phone: phoneVal, photo: photoUrl, createdAt: Date.now()
            });
            writeProfiles(arr); toast('등록되었습니다.');
        }
        setTimeout(() => location.href = '/html/profile-list.html', 800);
    });

    btnCancel?.addEventListener('click', () => history.back());
}

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
    initProfileList();
    initProfileEdit();
});
