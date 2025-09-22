// js/auth.js
// (모듈 import 없이도 동작하도록 동적 import 시도)
let Store;
(async () => {
    try {
        Store = (await import('/js/storage.js')).Store;
    } catch {
        // fallback (store.js를 못 찾을 때만)
        Store = {
            get: (k, f = null) => {
                try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; }
            },
            set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
            remove: (k) => localStorage.removeItem(k),
        };
    }
})();

// ========== 유틸 ==========
const $ = (sel) => document.querySelector(sel);
const isEmail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
function isStrongPassword(v) {
    if (!v || v.length < 8 || v.length > 20) return false;
    const a = /[A-Za-z]/.test(v), n = /\d/.test(v), s = /[^A-Za-z0-9]/.test(v);
    return (a && n) || (a && s) || (n && s);
}
function showErr(input, msg) {
    let el = input?.nextElementSibling;
    if (!el || !el.classList.contains('error')) {
        el = document.createElement('div');
        el.className = 'error';
        el.setAttribute('role', 'alert');
        el.style.cssText = 'color:red;font-size:13px;margin-top:6px;';
        input?.after(el);
    }
    el.textContent = msg;
    input?.setAttribute('aria-invalid', 'true');
}
function clearErr(input) {
    const el = input?.nextElementSibling;
    if (el?.classList.contains('error')) el.textContent = '';
    input?.removeAttribute('aria-invalid');
}
// Toast
function toast(msg, ms = 1800) {
    const t = document.getElementById('toast');
    if (!t) return alert(msg);
    t.textContent = msg;
    t.style.display = 'block';
    setTimeout(() => { t.style.display = 'none'; }, ms);
}

// ========== 스토리지 래퍼 ==========
const Users = {
    all() { return Store.get('users', []) || []; },
    save(list) { Store.set('users', list); }
};
const Auth = {
    get() { return Store.get('auth', null); },
    set(user) { Store.set('auth', user); },
    clear() { Store.remove('auth'); }
};

// ========== 네비 로그인/로그아웃 표기 ==========
function initNavAuth() {
    const navLogin = $('#nav-login');
    if (!navLogin) return;
    const me = Auth.get();
    if (me) {
        navLogin.textContent = '로그아웃';
        navLogin.href = '#';
        navLogin.onclick = (e) => {
            e.preventDefault();
            Auth.clear();
            toast('로그아웃 되었습니다.');
            setTimeout(() => location.href = '/html/index.html', 800);
        };
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

        const user = Users.all().find(u => u.email === email && u.pw === pw);
        if (!user) { showErr(emailInput, '이메일 또는 비밀번호가 올바르지 않습니다.'); return; }

        Auth.set({ email: user.email });
        toast('로그인 성공!');
        setTimeout(() => location.href = '/html/profile-list.html', 800);
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
        if (!isStrongPassword(pw)) { showErr(pwInput, '8~20자, 영문·숫자·특수문자 2종 이상'); return; }
        clearErr(pwInput);
        if (pw !== pw2) { showErr(pw2Input, '비밀번호가 일치하지 않습니다.'); return; }
        clearErr(pw2Input);
        if (!terms) { showErr(termsInput, '약관에 동의해 주세요.'); return; }
        clearErr(termsInput);

        const list = Users.all();
        if (list.some(u => u.email === email)) {
            showErr(emailInput, '이미 가입된 이메일입니다.');
            return;
        }
        list.push({ email, pw });
        Users.save(list);

        toast('회원가입 완료! 로그인 해주세요.');
        setTimeout(() => location.href = '/html/login.html', 800);
    });
}

// ========== 보호 페이지 가드 ==========
function requireAuthOnPage() {
    const needAuth = location.pathname.includes('profile-');
    if (needAuth && !Auth.get()) {
        toast('로그인이 필요합니다.');
        setTimeout(() => location.href = '/html/login.html', 800);
    }
}

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', () => {
    initNavAuth();
    initLogin();
    initSignup();
    requireAuthOnPage();
});
