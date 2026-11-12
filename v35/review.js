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
  activeHint?.abort();
  activeHint = null;
  document.getElementById('aiHint').textContent = '';
}

async function requestTutor(question, studentAnswer) {
  resetTutor();
  const target = document.getElementById('aiHint');
  const controller = new AbortController();
  activeHint = controller;
  const timeout = setTimeout(() => controller.abort(), 18000);
  target.textContent = 'AI 正在想怎麼提示你…';
  try {
    const response = await fetch('/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grade: question.grade, subject: question.subject, question: question.expr, studentAnswer }),
      signal: controller.signal,
      redirect: 'manual'
    });
    const answer = response.ok ? (await response.json()).answer : null;
    if (activeHint !== controller) return;
    if (typeof answer === 'string' && answer.trim()) {
      target.textContent = answer;
    } else if (response.status === 429) {
      target.textContent = 'AI 提示已達用量上限，先用上方的題庫提示。';
    } else if ([401, 403].includes(response.status) || response.type === 'opaqueredirect') {
      target.textContent = 'AI 登入已過期，請重新整理並登入。現在可用上方的題庫提示。';
    } else {
      target.textContent = 'AI 暫時無法回應，請使用上方的題庫提示。';
    }
  } catch {
    if (activeHint === controller) target.textContent = 'AI 暫時無法回應，請使用上方的題庫提示。';
  } finally {
    clearTimeout(timeout);
    if (activeHint === controller) activeHint = null;
  }
}
