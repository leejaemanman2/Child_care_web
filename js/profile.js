// 로컬 저장 키
const KEY_PROFILES = 'profiles';

function readProfiles() {
    try { return JSON.parse(localStorage.getItem(KEY_PROFILES)) || []; }
    catch { return []; }
}
function writeProfiles(arr) {
    localStorage.setItem(KEY_PROFILES, JSON.stringify(arr));
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ==============================
// 목록 화면 (검색 + 정렬 + 페이지네이션)
// ==============================
const state = {
    q: '',
    sort: 'createdAt_desc',
    page: 1,
    pageSize: 8
};

const els = {
    list: null, q: null, sort: null, count: null, prev: null, next: null, info: null
};

function sortProfiles(arr, sortKey) {
    const copy = [...arr];
    switch (sortKey) {
        case 'name_asc':
            copy.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
            break;
        case 'birth_asc':
            copy.sort((a, b) => (a.birth || '9999-12-31').localeCompare(b.birth || '9999-12-31'));
            break;
        case 'createdAt_desc':
        default:
            copy.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return copy;
}

function queryProfiles() {
    const all = readProfiles();
    const filtered = all.filter(p => {
        if (!state.q) return true;
        const q = state.q.toLowerCase();
        return (p.name || '').toLowerCase().includes(q) ||
            (p.allergy || '').toLowerCase().includes(q);
    });
    const sorted = sortProfiles(filtered, state.sort);
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * state.pageSize;
    const pageItems = sorted.slice(start, start + state.pageSize);

    return { total, totalPages, items: pageItems };
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
        const arr = readProfiles().filter(x => x.id !== id);
        writeProfiles(arr);
        renderList();
    }, { once: true });
}

function initProfileList() {
    els.list = document.querySelector('#profileList');
    els.q = document.querySelector('#q');
    els.sort = document.querySelector('#sort');
    els.count = document.querySelector('#count');
    els.prev = document.querySelector('#prev');
    els.next = document.querySelector('#next');
    els.info = document.querySelector('#pageInfo');

    if (!els.list) return; // 목록 페이지 아닐 때는 패스

    els.q?.addEventListener('input', () => { state.q = els.q.value.trim(); state.page = 1; renderList(); });
    els.sort?.addEventListener('change', () => { state.sort = els.sort.value; state.page = 1; renderList(); });
    els.prev?.addEventListener('click', () => { if (state.page > 1) { state.page--; renderList(); } });
    els.next?.addEventListener('click', () => { state.page++; renderList(); });

    renderList();
    bindDeleteOnce();
}

// ==============================
// 편집 화면 로직
// ==============================
function initProfileEdit() {
    const form = document.querySelector('#profileForm');
    if (!form) return;

    const title = document.querySelector('#formTitle');
    const name = document.querySelector('#pName');
    const birth = document.querySelector('#pBirth');
    const gender = document.querySelector('#pGender');
    const allergy = document.querySelector('#pAllergy');
    const phone = document.querySelector('#pPhone');
    const photo = document.querySelector('#pPhoto');
    const preview = document.querySelector('#photoPreview');
    const btnCancel = document.querySelector('#btnCancel');

    photo.addEventListener('change', () => {
        const file = photo.files?.[0];
        if (!file) { preview.style.display = 'none'; preview.src = ''; return; }
        const rdr = new FileReader();
        rdr.onload = () => { preview.src = rdr.result; preview.style.display = 'block'; };
        rdr.readAsDataURL(file);
    });

    const params = new URLSearchParams(location.search);
    const editId = params.get('id');
    let current = null;

    if (editId) {
        const arr = readProfiles();
        current = arr.find(x => x.id === editId);
        if (current) {
            title.textContent = '프로필 수정';
            name.value = current.name || '';
            birth.value = current.birth || '';
            gender.value = current.gender || '';
            allergy.value = current.allergy || '';
            phone.value = current.phone || '';
            if (current.photo) { preview.src = current.photo; preview.style.display = 'block'; }
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const phoneVal = phone.value.trim();
        if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(phoneVal)) {
            alert('연락처 형식을 확인하세요. (예: 010-1234-5678)');
            phone.focus();
            return;
        }

        const file = photo.files?.[0];
        const toDataURL = (f) => new Promise(res => {
            if (!f) return res(current?.photo || '');
            const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f);
        });
        const photoUrl = await toDataURL(file);

        const arr = readProfiles();
        if (current) {
            Object.assign(current, {
                name: name.value.trim(),
                birth: birth.value,
                gender: gender.value,
                allergy: allergy.value.trim(),
                phone: phoneVal,
                photo: photoUrl
            });
            writeProfiles(arr); alert('수정되었습니다.');
        } else {
            arr.push({
                id: uid(),
                name: name.value.trim(),
                birth: birth.value,
                gender: gender.value,
                allergy: allergy.value.trim(),
                phone: phoneVal,
                photo: photoUrl,
                createdAt: Date.now()
            });
            writeProfiles(arr); alert('등록되었습니다.');
        }
        location.href = '/html/profile-list.html';
    });

    btnCancel.addEventListener('click', () => {
        history.back();
    });
}

// ==============================
// 초기화
// ==============================
document.addEventListener('DOMContentLoaded', () => {
    initProfileList();
    initProfileEdit();
});
