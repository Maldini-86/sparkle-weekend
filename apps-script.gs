/**
 * 반짝이는 주말 — 신청/관찰결과 수집
 *
 * 구글 시트 > 확장 프로그램 > Apps Script 에 이 코드를 통째로 붙여넣으세요.
 * 탭(신청 / 관찰결과)은 자동으로 만들어집니다. 미리 만들 필요 없습니다.
 */

const SHEETS = {
  signup: {
    name: '신청',
    headers: [
      '신청일시', '이메일', '생년월일', '출생시각', '애칭',
      '약관동의', '개인정보동의', '광고성동의',
      '리포트초안', '검수', '발송일', '첫회차초대'
    ]
  },
  observation: {
    name: '관찰결과',
    headers: ['제출일시', '이메일', '장면', '몰입신호', '결', '반복패턴']
  }
};

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const cfg = SHEETS[data.type] || SHEETS.signup;
    const sheet = getSheet(cfg);
    const now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');

    let row;
    if (cfg.name === '신청') {
      row = [
        now,
        data.email || '',
        data.birth || '',
        data.birthTime || '',
        data.nickname || '',
        data.agreeTerms ? 'Y' : 'N',
        data.agreePrivacy ? 'Y' : 'N',
        data.agreeMarketing ? 'Y' : 'N',
        '', '', '', ''            // 리포트초안 · 검수 · 발송일 · 첫회차초대 (수기)
      ];
    } else {
      row = [
        now,
        data.email || '',
        data.scene || '',
        (data.signals || []).join(', '),
        data.domain || '',
        (data.schemas || []).join(', ')
      ];
    }

    sheet.appendRow(row);
    return json({ ok: true });

  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/** 배포가 살아 있는지 브라우저로 확인용 */
function doGet() {
  return json({ ok: true, msg: 'sparkle-weekend alive' });
}

function getSheet(cfg) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(cfg.name);
  if (!sheet) {
    sheet = ss.insertSheet(cfg.name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(cfg.headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, cfg.headers.length).setFontWeight('bold');
  }
  return sheet;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
