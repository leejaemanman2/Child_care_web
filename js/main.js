const state = {
    user: null,
    baby: null,
    playing: false,
    progress: 25
};

const onboarding = document.getElementById('onboarding');
const babyChip = document.getElementById('babyChip');
const addBabyBtn = document.getElementById('addBaby');
const routineList = document.getElementById('routineList');
const progressBar = document.getElementById('progressBar');
const playBtn = document.getElementById('playBtn');
const player = document.getElementById('player');
const toggleBtn = document.getElementById('toggleBtn');
const closePlayer = document.getElementById('closePlayer');
const range = document.getElementById('range');

function renderAuth() {
    const authArea = document.getElementById('authArea');
    if (!authArea) return; // authArea가 로드되지 않았을 경우를 대비

    if (state.user) {
        authArea.innerHTML =
            '<span class="muted">' + state.user.email + (state.baby ? ' · ' + state.baby.name : '') + '</span>' +
            '<button class="btn" id="logoutBtn">로그아웃</button>';
        document.getElementById('logoutBtn').onclick = () => { state.user = null; state.baby = null; renderAll(); };
    } else {
        authArea.innerHTML =
            '<a href="/login" class="btn ghost" id="loginBtn">로그인</a>' +
            '<a href="/signup" class="btn" id="signupBtn">회원가입</a>';

        // 새로 생성된 요소에 이벤트를 다시 연결
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        if (loginBtn) loginBtn.onclick = fakeLogin;
        if (signupBtn) signupBtn.onclick = fakeSignup;
    }
}

function renderBaby() {
    if (!onboarding || !babyChip) return; // 요소가 로드되지 않았을 경우를 대비
    onboarding.style.display = (!state.user || state.baby) ? 'none' : '';
    babyChip.textContent = '아기: ' + (state.baby ? `${state.baby.name} · ${state.baby.birth}` : '-');
}

function renderRoutines() {
    if (!routineList) return; // 요소가 로드되지 않았을 경우를 대비
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
    if (!player || !toggleBtn || !progressBar || !range) return; // 요소가 로드되지 않았을 경우를 대비

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

if (addBabyBtn) {
    addBabyBtn.onclick = () => {
        const name = prompt('아기 이름', '민준');
        const birth = prompt('아기 생일 (YYYY-MM-DD)', '2025-01-01');
        if (!name || !birth) return;
        state.baby = { name, birth };
        renderAll();
    };
}

if (playBtn) playBtn.onclick = () => { state.playing = true; renderPlayer(); };
if (toggleBtn) toggleBtn.onclick = () => { state.playing = !state.playing; renderPlayer(); };
if (closePlayer) closePlayer.onclick = () => { state.playing = false; renderPlayer(); };
if (range) range.oninput = (e) => { state.progress = Number(e.target.value); renderPlayer(); };

// renderAll(); 함수는 index.html의 loadHTML이 끝난 후 호출되므로 주석처리