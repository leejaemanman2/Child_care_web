// ===== 유틸 =====
const $ = (sel, parent = document) => parent.querySelector(sel);

function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function isStrongPassword(v) {
    // 8~20자, 영문/숫자/특수문자 중 2종 이상 포함 권장 규칙
    if (v.length < 8 || v.length > 20) return false;
    const hasLetter = /[A-Za-z]/.test(v);
    const hasNumber = /[0-9]/.test(v);
    const hasSpecial = /[^A-Za-z0-9]/.test(v);
    return (hasLetter && hasNumber) || (hasLetter && hasSpecial) || (hasNumber && hasSpecial);
}

// 로그인 상태 체크/설정
function getAuth() {
    try { return JSON.parse(localStorage.getItem('auth')) || null; }
    catch { return null; }
}
function setAuth(email) {
    localStorage.setItem('auth', JSON.stringify({ email, token: 'mock-' + Date.now() }));
}
function clearAuth() {
    localStorage.removeItem('auth');
}

// 네비게이션 로그인/로그아웃 버튼 상태
function initNavAuth() {
    const navLogin = $('#nav-login');
    if (!navLogin) return; // 헤더가 아직 공통화되지 않았을 수 있음

    const auth = getAuth();
    if (auth) {
        navLogin.textContent = '로그아웃';
        navLogin.href = '#';
        navLogin.addEventListener('click', (e) => {
            e.preventDefault();
            clearAuth();
            alert('로그아웃 되었습니다.');
            location.href = '/html/index.html';
        });
    } else {
        navLogin.textContent = '로그인';
        navLogin.href = '/html/login.html';
    }
}

// ===== 로그인 처리 =====
function initLogin() {
    const form = $('#loginForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = $('#loginEmail').value.trim();
        const pw = $('#loginPassword').value;

        if (!isEmail(email)) return alert('이메일 형식을 확인하세요.');
        if (pw.length < 8) return alert('비밀번호는 8자 이상이어야 합니다.');

        // (백엔드 연동 전) 단순 통과 → 토큰 저장
        setAuth(email);
        alert('로그인 성공!');
        location.href = '/html/index.html';
    });
}

// ===== 회원가입 처리 =====
function initSignup() {
    const form = $('#signupForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = $('#suEmail').value.trim();
        const pw1 = $('#suPassword').value;
        const pw2 = $('#suPassword2').value;
        const terms = $('#suTerms').checked;

        if (!isEmail(email)) return alert('이메일 형식을 확인하세요.');
        if (!isStrongPassword(pw1)) return alert('비밀번호 규칙을 확인하세요.');
        if (pw1 !== pw2) return alert('비밀번호가 일치하지 않습니다.');
        if (!terms) return alert('약관에 동의해 주세요.');

        // (백엔드 연동 전) 로컬에 유저를 저장하는 흉내
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.find(u => u.email === email)) return alert('이미 가입된 이메일입니다.');
        users.push({ email, password: pw1, createdAt: Date.now() });
        localStorage.setItem('users', JSON.stringify(users));

        alert('회원가입 완료! 로그인 해주세요.');
        location.href = '/html/login.html';
    });
}

// 보호가 필요한 페이지에서 사용 (선택)
function requireAuthOnPage(){
  const needAuth = location.pathname.includes('profile-');
  if(needAuth && !getAuth()){ alert('로그인이 필요합니다.'); location.href='/html/login.html'; }
}
document.addEventListener('DOMContentLoaded', () => {
  initNavAuth(); initLogin(); initSignup(); requireAuthOnPage(); // ← 추가
});

function showErr(input, msg){
  let el = input.nextElementSibling;
  if (!el || !el.classList.contains('error')) {
    el = document.createElement('div'); el.className = 'error'; input.after(el);
  }
  el.textContent = msg;
}
function clearErr(input){ const el=input.nextElementSibling; if(el?.classList.contains('error')) el.textContent=''; }

if (!isEmail(email)) { showErr($('#loginEmail'), '이메일 형식을 확인하세요.'); return; }
clearErr($('#loginEmail'));

const isPhone = v => /^01[016789]-?\d{3,4}-?\d{4}$/.test(v);


document.addEventListener('DOMContentLoaded', () => {
    initNavAuth();
    initLogin();
    initSignup();
});
