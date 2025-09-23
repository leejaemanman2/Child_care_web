const state = {
    user: null,
    baby: null,
    playing: false,
    progress: 25
};

const onboarding = document.getElementById('onboarding');
const babyChip = document.getElementById('babyChip');
const authArea = document.getElementById('authArea');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const addBabyBtn = document.getElementById('addBaby');
const routineList = document.getElementById('routineList');
const progressBar = document.getElementById('progressBar');
const playBtn = document.getElementById('playBtn');
const player = document.getElementById('player');
const toggleBtn = document.getElementById('toggleBtn');
const closePlayer = document.getElementById('closePlayer');
const range = document.getElementById('range');

function renderAuth() {
    if (state.user) {
        authArea.innerHTML =
            '<span class="muted">' + state.user.email + (state.baby ? ' · ' + state.baby.name : '') + '</span>' +
            '<button class="btn" id="logoutBtn">로그아웃</button>';
        document.getElementById('logoutBtn').onclick = () => { state.user = null; state.baby = null; renderAll(); };
    } else {
        authArea.innerHTML =
            '<button class="btn ghost" id="loginBtn">로그인</button>' +
            '<button class="btn" id="signupBtn">회원가입</button>';
        document.getElementById('loginBtn').onclick = fakeLogin;
        document.getElementById('signupBtn').onclick = fakeSignup;
    }
}

function renderBaby() {
    onboarding.style.display = (!state.user || state.baby) ? 'none' : '';
    babyChip.textContent = '아기: ' + (state.baby ? `${state.baby.name} · ${state.baby.birth}` : '-');
}

function renderRoutines() {
    const data = [
        { time: '11:00', type: '수유', enabled: true },
        { time: '14:00', type: '낮잠', enabled: true },
        { time: '19:30', type: '목욕', enabled: false },
    ];
    routineList.innerHTML = data.map(r => `
    <li class="card" style="padding:10px;display:flex;justify-content:space-between;align-items:center">
      <div>${r.time} · ${r.type}</div>
      <button class="btn ${r.enabled ? 'primary' : ''}" aria-pressed="${r.enabled}">
        ${r.enabled ? 'ON' : 'OFF'}
      </button>
    </li>
  `).join('');
}

function renderPlayer() {
    if (state.playing) {
        player.style.display = '';
        toggleBtn.textContent = '일시정지';
    } else {
        toggleBtn.textContent = '재생';
    }
    progressBar.style.width = state.progress + '%';
    range.value = state.progress;
}

function renderAll() {
    renderAuth();
    renderBaby();
    renderRoutines();
    renderPlayer();
}

function fakeLogin() {
    const email = prompt('이메일 입력', 'user@example.com');
    if (!email) return;
    state.user = { email };
    renderAll();
}

function fakeSignup() {
    const email = prompt('회원가입 이메일', 'new@example.com');
    if (!email) return;
    state.user = { email };
    alert('가입 완료! 아기 프로필을 등록해 보세요.');
    renderAll();
}

addBabyBtn.onclick = () => {
    const name = prompt('아기 이름', '민준');
    const birth = prompt('아기 생일 (YYYY-MM-DD)', '2025-01-01');
    if (!name || !birth) return;
    state.baby = { name, birth };
    renderAll();
};

playBtn.onclick = () => { state.playing = true; renderPlayer(); };
toggleBtn.onclick = () => { state.playing = !state.playing; renderPlayer(); };
closePlayer.onclick = () => { state.playing = false; renderPlayer(); };
range.oninput = (e) => { state.progress = Number(e.target.value); renderPlayer(); };

renderAll();