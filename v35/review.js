const taipeiDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' });

function reviewState(attempts, now = new Date()) {
  const today = taipeiDate.format(now);
  let lastWrongDay = null;
  let missedToday = false;
  for (const attempt of attempts) {
    const day = taipeiDate.format(new Date(attempt.time));
    if (!attempt.correct) {
      lastWrongDay = day;
      missedToday ||= day === today;
    } else if (lastWrongDay && day > lastWrongDay && attempt.hintUsed === false) {
      lastWrongDay = null;
    }
  }
  return { missedToday, pending: !!lastWrongDay, due: !!lastWrongDay && lastWrongDay < today };
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

let activeHint;

function resetTutor() {
  activeHint?.controller.abort();
  activeHint = null;
  document.getElementById('aiHint').textContent = '';
}

async function requestTutor(question, studentAnswer) {
  const answerText = studentAnswer == null ? null : String(studentAnswer).trim() || null;
  const key = JSON.stringify([question.id, answerText]);
  if (activeHint?.key === key) return;
  resetTutor();

  const target = document.getElementById('aiHint');
  const controller = new AbortController();
  const hint = { key, controller };
  activeHint = hint;
  const timeout = setTimeout(() => controller.abort(), 22000);
  let succeeded = false;
  target.textContent = 'AI 正在想怎麼提示你…';
  try {
    const response = await fetch('/api/tutor', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grade: question.grade, subject: question.subject, question: question.expr, studentAnswer: answerText
      }),
      signal: controller.signal,
      redirect: 'manual'
    });
    const data = response.headers.get('Content-Type')?.includes('application/json') ? await response.json() : {};
    if (activeHint !== hint) return;
    if (response.ok && typeof data.answer === 'string' && data.answer.trim()) {
      target.textContent = 'AI 引導：' + data.answer;
      succeeded = true;
    } else if (response.status === 429) {
      target.textContent = 'AI 提示已達用量上限，先用上方的題庫提示。';
    } else if (response.status === 401 || response.type === 'opaqueredirect' ||
               (response.status === 403 && !data.error)) {
      target.textContent = '需要 Cloudflare Access 登入。請重新整理頁面，並依畫面指示登入。';
    } else if (['ACCESS_CONFIG', 'TUTOR_CONFIG', 'AI_CONFIG'].includes(data.code)) {
      target.textContent = `AI 家教服務設定異常，請先用上方的題庫提示。（${data.code}）`;
    } else if (response.status === 504) {
      target.textContent = 'AI 等候逾時，請稍後再試或先用題庫提示。';
    } else {
      target.textContent = 'AI 暫時無法回應，請使用上方的題庫提示。';
    }
  } catch {
    if (activeHint === hint) {
      target.textContent = controller.signal.aborted ? 'AI 等候逾時，請稍後再試或先用題庫提示。' :
        'AI 暫時無法回應，請使用上方的題庫提示。';
    }
  } finally {
    clearTimeout(timeout);
    if (activeHint === hint && !succeeded) activeHint = null;
  }
}
