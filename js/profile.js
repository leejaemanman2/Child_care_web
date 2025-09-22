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

// 목록 화면 렌더
function renderProfileList() {
    const wrap = document.querySelector('#profileList');
    if (!wrap) return;

    const data = readProfiles();
    wrap.innerHTML = data.length ? '' : '<p>등록된 프로필이 없습니다. 오른쪽 상단에서 추가하세요.</p>';

    for (const p of data) {
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
        wrap.appendChild(card);
    }

    // 삭제 핸들러
    wrap.addEventListener('click', (e) => {
        const id = e.target.getAttribute?.('data-del');
        if (!id) return;
        if (!confirm('삭제할까요?')) return;
        const arr = readProfiles().filter(x => x.id !== id);
        writeProfiles(arr);
        renderProfileList();
    }, { once: true });
}

// 편집 화면 로직
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

    // 미리보기
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

        // 연락처 유효성 검사 추가
        const phoneVal = phone.value.trim();
        if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(phoneVal)) {
            alert('연락처 형식을 확인하세요. (예: 010-1234-5678)');
            phone.focus();
            return;
        }

        const file = photo.files?.[0];
        const toDataURL = (f) => new Promise(res => {
            if (!f) return res(cur?.photo || '');
            const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f);
        });
        const photoUrl = await toDataURL(file);

        const arr = read();
        if (cur) {
            Object.assign(cur, {
                name: name.value.trim(),
                birth: birth.value,
                gender: gender.value,
                allergy: allergy.value.trim(),
                phone: phoneVal,
                photo: photoUrl
            });
            write(arr); alert('수정되었습니다.');
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
            write(arr); alert('등록되었습니다.');
        }
        location.href = '/html/profile-list.html';
    });


    btnCancel.addEventListener('click', () => {
        history.back();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderProfileList();
    initProfileEdit();
});
