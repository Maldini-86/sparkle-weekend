/* ══════════════════════════════════════════
   반짝이는 주말 — 신청 폼

   ⚠️ 아래 APPS_SCRIPT_URL 한 줄만 바꾸면 됩니다.
      구글 시트 > 확장 프로그램 > Apps Script > 배포 > 웹 앱
      에서 나온 https://script.google.com/macros/s/.../exec 주소
   ══════════════════════════════════════════ */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzAyhaylNSLnfOXhyxMoMmaB8UGkap4Ak8HoBa8Fz7mFjdW4W9Mo-Y9VGIlP-ec9BGx/exec';

/* ── 유입 경로 ──
   인스타 등에 뿌린 링크의 ?utm_source=... 를 신청과 함께 시트에 남깁니다.
   폼까지 스크롤하는 사이 주소가 바뀌어도 잃지 않게 처음 들어온 값을 기억해 둡니다. */
const 유입 = (function readUtm() {
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  const q = new URLSearchParams(location.search);
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem('sw_utm') || '{}'); } catch (e) {}

  const fresh = {};
  keys.forEach(k => { if (q.get(k)) fresh[k] = q.get(k).slice(0, 100); });

  const out = Object.keys(fresh).length ? fresh : saved;
  if (!out.referrer) out.referrer = (document.referrer || '').slice(0, 200);
  try { sessionStorage.setItem('sw_utm', JSON.stringify(out)); } catch (e) {}
  return out;
})();

/* ── GA 행동 기록 ──
   어느 섹션까지 봤는지(section_view), 폼을 건드렸는지(form_start), 신청했는지(sign_up).
   과제의 "어디서 멈췄나"를 숫자로 보기 위함. 입력값은 절대 보내지 않는다. */
function ga() {
  if (typeof gtag === 'function') gtag.apply(null, arguments);
}

(function trackSections() {
  const names = ['1_hero', '2_gyeol', '3_story', '4_steps', '5_why_birth', '6_form'];
  const secs = document.querySelectorAll('body > section');
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const i = [...secs].indexOf(en.target);
      ga('event', 'section_view', { section: names[i] || `section_${i + 1}` });
      io.unobserve(en.target);
    });
  }, { threshold: 0.35 });
  secs.forEach(s => io.observe(s));
})();

(function trackFormStart() {
  const f = document.getElementById('signupForm');
  if (!f) return;
  f.addEventListener('focusin', () => ga('event', 'form_start'), { once: true });
})();

/* ── 출생 시각 = 12지시 ──
   사주는 시(時)를 두 시간 단위 12지지로 봅니다.
   지지 이름만으로는 모르는 분이 많아 시간대를 같이 보여줍니다. */
const 지시 = [
  ['자시', '23:00~01:00'], ['축시', '01:00~03:00'], ['인시', '03:00~05:00'],
  ['묘시', '05:00~07:00'], ['진시', '07:00~09:00'], ['사시', '09:00~11:00'],
  ['오시', '11:00~13:00'], ['미시', '13:00~15:00'], ['신시', '15:00~17:00'],
  ['유시', '17:00~19:00'], ['술시', '19:00~21:00'], ['해시', '21:00~23:00']
];

(function fillTimes() {
  const sel = document.querySelector('select[name=birthTime]');
  if (!sel) return;
  지시.forEach(([name, range]) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = `${name} (${range})`;
    sel.appendChild(opt);
  });
})();

/* ── 발송일 계산 ──
   리포트는 한 번만, 금요일에 묶어서 발송. 목요일 밤 12시까지 신청하면 이번 주말에 쓸 수 있다.
   금·토·일에 신청하면 이번 주말은 이미 시작됐으므로 다음 주 금요일. */
function nextSendDate() {
  const now = new Date();
  const d = now.getDay();                 // 0=일 … 6=토
  const add = (d >= 1 && d <= 4) ? (5 - d) : (d === 5 ? 7 : d === 6 ? 6 : 5);
  const send = new Date(now.getFullYear(), now.getMonth(), now.getDate() + add);
  return send;
}

function fmtDate(dt) {
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일(금)`;
}

(function showDeadline() {
  const send = nextSendDate();
  const due = new Date(send.getFullYear(), send.getMonth(), send.getDate() - 1);
  const text = `이번 주 신청 마감 — ${due.getMonth() + 1}월 ${due.getDate()}일(목) 밤 12시`;
  document.querySelectorAll('[data-deadline]').forEach(el => { el.textContent = text; });
})();

/* ── 제출 ── */
const form = document.getElementById('signupForm');
const errBox = document.getElementById('err');
const btn = document.getElementById('submitBtn');

function showErr(msg) {
  errBox.textContent = msg;
  errBox.hidden = false;
  errBox.scrollIntoView({ block: 'center' });
}

function hideErr() {
  errBox.hidden = true;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideErr();

  const fd = new FormData(form);
  const email = (fd.get('email') || '').trim();
  const birth = fd.get('birth') || '';
  const agreeTerms = fd.get('agreeTerms') === 'on';
  const agreePrivacy = fd.get('agreePrivacy') === 'on';
  const agreeMarketing = fd.get('agreeMarketing') === 'on';   /* 선택 */

  /* 검증 */
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return showErr('이메일 형식을 확인해주세요.');
  }
  if (!birth) {
    return showErr('아이 생년월일을 입력해주세요.');
  }

  const bd = new Date(birth);
  const now = new Date();
  const eightYearsAgo = new Date(now.getFullYear() - 8, now.getMonth(), now.getDate());
  if (bd > now) {
    return showErr('생년월일이 미래로 되어 있어요. 다시 확인해주세요.');
  }
  if (bd < eightYearsAgo) {
    return showErr('미취학(0~7세) 아이 대상이에요. 생년월일을 확인해주세요.');
  }
  if (!agreeTerms) {
    return showErr('서비스 이용약관에 동의해주셔야 신청할 수 있어요.');
  }
  if (!agreePrivacy) {
    return showErr('개인정보 수집·이용에 동의해주셔야 리포트를 보내드릴 수 있어요.');
  }

  /* 전송 */
  btn.disabled = true;
  btn.textContent = '보내는 중…';

  const payload = {
    type: 'signup',
    email,
    birth,
    birthTime: fd.get('birthTime') || '',
    nickname: (fd.get('nickname') || '').trim(),
    agreeTerms: true,
    agreePrivacy: true,
    agreeMarketing: agreeMarketing,
    ...유입
  };

  try {
    if (APPS_SCRIPT_URL.startsWith('http')) {
      /* text/plain 으로 보내면 preflight 없이 통과합니다 */
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
    } else {
      console.warn('APPS_SCRIPT_URL 이 아직 설정되지 않았습니다. 저장은 건너뜁니다.', payload);
    }
    done(email);
  } catch (err) {
    console.error(err);
    btn.disabled = false;
    btn.textContent = '신청하기';
    showErr('잠시 후 다시 시도해주세요. 계속 안 되면 알려주세요.');
  }
});

/* ── 완료 화면 ── */
function done(email) {
  document.getElementById('doneMail').textContent = email;
  document.getElementById('doneWhen').textContent = fmtDate(nextSendDate());
  document.getElementById('done').hidden = false;
  ga('event', 'sign_up', { method: 'landing_form' });   /* 이메일 등 입력값은 보내지 않는다 */
  document.body.style.overflow = 'hidden';
  window.scrollTo(0, 0);
}
