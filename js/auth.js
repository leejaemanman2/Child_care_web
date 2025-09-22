// js/auth.js

// ========== 유틸 ==========
const $ = (sel) => document.querySelector(sel);
const isEmail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

// 비번 강도(8~20자, 영문/숫자/특수문자 중 2종 이상)
function isStrongPassword(v) {
    if (!v || v.length < 8 || v.length > 20) return false;
    const hasLetter = /[A-Za-z]/.test(v);
    const hasNumber = /[0-9]/.test(v);
    const hasSpecial = /[^A-Za-z0-9]/.test(v);
    return (hasLetter && hasNumber) || (hasLetter && hasSpecial) || (hasNumber && hasSpecial);
}

// 인라인 에러 메시지
function showErr(input, msg) {
    let el = input.nextElementSibling;
    if (!el || !el.classList.contains('error')) {
        el = document.createElement('div');
        el.className = 'error';
        el.style.color = 'red';
        el.style.fontSize = '13px';
        el.style.marginTop = '6px';
        input.after(el);
    }
    el.textContent = msg;
}
function clearErr(input) {
    const el = input.nextElementSibling;
    if (el?.classList.contains('error')) el.textContent = '';
}

// 토스트 메시지
function toast(msg, ms = 2000) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.display = 'block';
    setTimeout(() => { t.style.display = 'none'; }, ms);
}

// ========== 스토리지 ==========
function getUsers() {
    try { return JSON.parse(localStorage.getItem('users')) || []; }
    catch { return []; }
}
function setUsers(arr) {
    localStorage.setItem('users', JSON.stringify(arr));
}
function getAuth() {
    try { return JSON.parse(localStorage.getItem('auth')); }
    catch { return null; }
}
function setAuth(user) {
    localStorage.setItem('auth', JSON.stringify(user));
}
function clearAuth() {
    localStorage.removeItem('auth');
}

// ========== 네비 로그인/로그아웃 표기 ==========
function initNavAuth() {
    const navLogin = $('#nav-login');
    if (!navLogin) return;

    const me = getAuth();
    if (me) {
        navLogin.textContent = '로그아웃';
        navLogin.href = '#';
        navLogin.addEventListener('click', (e) => {
            e.preventDefault();
            clearAuth();
            toast('로그아웃 되었습니다.');
            location.href = '/html/index.html';
        });
    } else {
        navLogin.textContent = '로그인';
        navLogin.href = '/html/login.html';
    }
}

// ========== 로그인 ==========
function initLogin() {
    const form = $('#loginForm');
    if (!form) return;

    const emailInput = $('#loginEmail');
    const pwInput = $('#loginPassword');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const pw = pwInput.value.trim();

        if (!isEmail(email)) { showErr(emailInput, '이메일 형식을 확인하세요.'); return; }
        clearErr(emailInput);

        if (pw.length < 8) { showErr(pwInput, '비밀번호는 8자 이상 입력하세요.'); return; }
        clearErr(pwInput);

        const users = getUsers();
        const user = users.find(u => u.email === email && u.pw === pw);
        if (!user) {
            showErr(emailInput, '이메일 또는 비밀번호가 올바르지 않습니다.');
            return;
        }

        setAuth({ email: user.email });
        toast('로그인 성공!');
        setTimeout(() => { location.href = '/html/profile-list.html'; }, 1200);
    });
}

// ========== 회원가입 ==========
function initSignup() {
    const form = $('#signupForm');
    if (!form) return;

    const emailInput = $('#suEmail');
    const pwInput = $('#suPassword');
    const pw2Input = $('#suPassword2');
    const termsInput = $('#suTerms');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const pw = pwInput.value.trim();
        const pw2 = pw2Input.value.trim();
        const terms = !!termsInput?.checked;

        if (!isEmail(email)) { showErr(emailInput, '이메일 형식을 확인하세요.'); return; }
        clearErr(emailInput);

        if (!isStrongPassword(pw)) { showErr(pwInput, '비밀번호 규칙을 확인하세요. (8~20자, 영문·숫자·특수문자 2종 이상)'); return; }
        clearErr(pwInput);

        if (pw !== pw2) { showErr(pw2Input, '비밀번호가 일치하지 않습니다.'); return; }
        clearErr(pw2Input);

        if (!terms) { showErr(termsInput, '약관에 동의해 주세요.'); return; }
        if (termsInput) clearErr(termsInput);

        const users = getUsers();
        if (users.some(u => u.email === email)) {
            showErr(emailInput, '이미 가입된 이메일입니다.');
            return;
        }

        users.push({ email, pw });
        setUsers(users);

        toast('회원가입 완료! 로그인 해주세요.');
        setTimeout(() => { location.href = '/html/login.html'; }, 1200);
    });
}

// ========== 보호 페이지 가드 ==========
function requireAuthOnPage() {
    const needAuth = location.pathname.includes('profile-');
    if (needAuth && !getAuth()) {
        toast('로그인이 필요합니다.');
        setTimeout(() => { location.href = '/html/login.html'; }, 1200);
    }
}

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', () => {
    initNavAuth();
    initLogin();
    initSignup();
    requireAuthOnPage();
});
