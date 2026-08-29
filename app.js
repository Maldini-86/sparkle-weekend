/* ══════════════════════════════════════════
   반짝이는 주말 — 신청 폼

   ⚠️ 아래 APPS_SCRIPT_URL 한 줄만 바꾸면 됩니다.
      구글 시트 > 확장 프로그램 > Apps Script > 배포 > 웹 앱
      에서 나온 https://script.google.com/macros/s/.../exec 주소
   ══════════════════════════════════════════ */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzAyhaylNSLnfOXhyxMoMmaB8UGkap4Ak8HoBa8Fz7mFjdW4W9Mo-Y9VGIlP-ec9BGx/exec';

/* ── 출생 시각 드롭다운 채우기 ── */
(function fillTimes() {
  const sel = document.querySelector('select[name=birthTime]');
  if (!sel) return;
  for (let h = 0; h < 24; h++) {
    const opt = document.createElement('option');
    opt.value = String(h).padStart(2, '0');
    const label = h === 0 ? '밤 12시' : h < 12 ? `오전 ${h}시` : h === 12 ? '낮 12시' : `오후 ${h - 12}시`;
    opt.textContent = `${label}  (${String(h).padStart(2, '0')}시)`;
    sel.appendChild(opt);
  }
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
  const consent = fd.get('consent') === 'on';

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
  if (!consent) {
    return showErr('수신동의를 해주셔야 리포트를 보내드릴 수 있어요.');
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
    consent: true
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
  document.getElementById('done').hidden = false;
  document.body.style.overflow = 'hidden';
  window.scrollTo(0, 0);
}
