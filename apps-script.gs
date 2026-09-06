/**
 * 반짝이는 주말 — 신청/관찰결과 수집
 *
 * 구글 시트 > 확장 프로그램 > Apps Script 에 이 코드를 통째로 붙여넣으세요.
 * 탭(신청 / 관찰결과)도, 빠진 열도 전부 자동으로 만들어집니다.
 * 시트를 손으로 고칠 일은 없습니다.
 */

const VERSION = '2026-09-06-consent3';

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

    const values = (cfg.name === '신청')
      ? {
          '신청일시':     now,
          '이메일':       data.email || '',
          '생년월일':     data.birth || '',
          '출생시각':     data.birthTime || '',
          '애칭':         data.nickname || '',
          '약관동의':     data.agreeTerms    ? 'Y' : 'N',
          '개인정보동의': data.agreePrivacy  ? 'Y' : 'N',
          '광고성동의':   data.agreeMarketing ? 'Y' : 'N'
        }
      : {
          '제출일시':   now,
          '이메일':     data.email || '',
          '장면':       data.scene || '',
          '몰입신호':   (data.signals || []).join(', '),
          '결':         data.domain || '',
          '반복패턴':   (data.schemas || []).join(', ')
        };

    appendByHeader(sheet, values);
    return json({ ok: true, version: VERSION });

  } catch (err) {
    return json({ ok: false, error: String(err), version: VERSION });
  }
}

/**
 * 배포가 살아 있는지 · 어느 버전이 올라가 있는지 브라우저로 확인용.
 * 어느 시트에 붙어 있는지도 같이 알려준다 (시트를 다시 못 찾는 일이 없도록).
 */
function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return json({
    ok: true,
    msg: 'sparkle-weekend alive',
    version: VERSION,
    sheetName: ss.getName(),
    sheetUrl: ss.getUrl(),
    tabs: ss.getSheets().map(s => s.getName())
  });
}

/**
 * 탭을 찾아오고, 없으면 만들고, 헤더에 빠진 열이 있으면 뒤에 덧붙인다.
 * 기존 데이터는 건드리지 않는다. 열 순서도 바꾸지 않는다.
 */
function getSheet(cfg) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(cfg.name);
  if (!sheet) sheet = ss.insertSheet(cfg.name);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(cfg.headers);
  } else {
    const width = Math.max(sheet.getLastColumn(), 1);
    const head = sheet.getRange(1, 1, 1, width).getValues()[0].map(String);
    const missing = cfg.headers.filter(h => head.indexOf(h) === -1);
    if (missing.length) {
      sheet.getRange(1, width + 1, 1, missing.length).setValues([missing]);
    }
  }

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold');
  return sheet;
}

/**
 * 헤더 '이름'을 보고 해당 열에 값을 넣는다.
 * 열 순서가 달라도, 중간에 손으로 만든 열이 있어도 안전하다.
 */
function appendByHeader(sheet, values) {
  const width = sheet.getLastColumn();
  const head = sheet.getRange(1, 1, 1, width).getValues()[0].map(String);
  const row = new Array(width).fill('');

  Object.keys(values).forEach(k => {
    const i = head.indexOf(k);
    if (i !== -1) row[i] = values[k];
  });

  sheet.appendRow(row);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
