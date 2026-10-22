(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector('[data-theme-toggle]');
  const storedTheme = localStorage.getItem('versant-theme');
  if (storedTheme === 'light' || storedTheme === 'dark') root.dataset.theme = storedTheme;
  const updateThemeButton = () => {
    if (!themeButton) return;
    const light = root.dataset.theme === 'light';
    themeButton.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    themeButton.querySelector('span:first-child').textContent = light ? '☾' : '☼';
    const label = themeButton.querySelector('.theme-label');
    if (label) label.textContent = light ? 'Dark mode' : 'Light mode';
  };
  updateThemeButton();
  themeButton?.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('versant-theme', root.dataset.theme);
    updateThemeButton();
    if (typeof window.drawProgressChart === 'function') window.drawProgressChart();
  });

  const readData = () => {
    try { return JSON.parse(localStorage.getItem('versant') || '{"xp":0,"streak":0,"history":[]}'); }
    catch (_) { return { xp: 0, streak: 0, history: [] }; }
  };
  const writeData = data => localStorage.setItem('versant', JSON.stringify(data));
  const setStatus = (message, type = '') => { const el = document.getElementById('status'); if (el) { el.textContent = message; el.className = `status ${type}`; } };

  let currentQuestion = '';
  let startedAt = 0;
  window.generateQuestion = async () => {
    const topic = document.getElementById('topic')?.value;
    const difficulty = document.getElementById('difficulty')?.value;
    const question = document.getElementById('question');
    const button = document.querySelector('[data-generate]');
    if (!question || !topic || !difficulty) return;
    question.textContent = 'Creating a focused practice prompt…';
    setStatus(''); if (button) button.disabled = true;
    try {
      const response = await fetch('api/generate.php', { method: 'POST', headers: {'Content-Type':'application/x-www-form-urlencoded', 'X-Requested-With':'XMLHttpRequest'}, body: new URLSearchParams({topic, difficulty, csrf_token: document.querySelector('meta[name="csrf-token"]')?.content || ''}) });
      const data = await response.json();
      if (!response.ok || !data.question) throw new Error(data.error || 'The question service is unavailable.');
      currentQuestion = data.question.trim(); question.textContent = currentQuestion; startedAt = Date.now();
      setStatus('Prompt ready. Type your answer, then submit it.', 'success');
      document.getElementById('answer')?.focus();
    } catch (error) { question.textContent = 'Unable to create a prompt right now.'; setStatus(error.message, 'error'); }
    finally { if (button) button.disabled = false; }
  };

  window.submitAnswer = () => {
    const answer = document.getElementById('answer')?.value.trim();
    if (!answer) { setStatus('Write an answer before submitting.', 'error'); return; }
    if (!currentQuestion || !startedAt) { setStatus('Generate a practice question first.', 'error'); return; }
    const minutes = Math.max((Date.now() - startedAt) / 60000, 1 / 60);
    const words = answer.split(/\s+/).length;
    const wpm = Math.max(1, Math.round(words / minutes));
    const accuracy = Math.min(100, Math.max(0, Math.round((answer.length / Math.max(currentQuestion.length, 1)) * 100)));
    const data = readData();
    data.history = Array.isArray(data.history) ? data.history : [];
    data.history.push({wpm, accuracy, date: new Date().toLocaleDateString()});
    data.history = data.history.slice(-30); data.xp = (Number(data.xp) || 0) + wpm; data.streak = (Number(data.streak) || 0) + 1; writeData(data);
    setStatus(`Saved. ${wpm} WPM · ${accuracy}% response coverage.`, 'success');
  };

  window.drawProgressChart = () => {
    const canvas = document.getElementById('chart'); if (!canvas) return;
    const data = readData(); const items = data.history.slice(-12); const rect = canvas.getBoundingClientRect(); const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(320, rect.width * ratio); canvas.height = Math.max(220, rect.height * ratio); const ctx = canvas.getContext('2d'); ctx.scale(ratio, ratio);
    const w = rect.width, h = rect.height; const color = getComputedStyle(root).getPropertyValue('--muted'); const accent = getComputedStyle(root).getPropertyValue('--accent');
    ctx.clearRect(0,0,w,h); ctx.strokeStyle = color; ctx.globalAlpha = .18; ctx.lineWidth = 1; for (let i=1;i<5;i++){const y=(h-30)*i/5+10;ctx.beginPath();ctx.moveTo(34,y);ctx.lineTo(w-10,y);ctx.stroke();} ctx.globalAlpha=1;
    if (!items.length) { ctx.fillStyle=color; ctx.font='15px system-ui'; ctx.fillText('Complete your first practice to see progress here.', 34, h/2); return; }
    const max = Math.max(...items.map(x=>Number(x.wpm)||0), 10), step=(w-54)/Math.max(items.length-1,1); ctx.strokeStyle=accent; ctx.lineWidth=3; ctx.beginPath();
    items.forEach((item,i)=>{const x=34+i*step, y=h-24-((Number(item.wpm)||0)/max)*(h-52); i?ctx.lineTo(x,y):ctx.moveTo(x,y);}); ctx.stroke(); ctx.fillStyle=accent; items.forEach((item,i)=>{const x=34+i*step,y=h-24-((Number(item.wpm)||0)/max)*(h-52);ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();});
  };
  const data = readData(); const xp = document.getElementById('xp'), streak = document.getElementById('streak'), sessions = document.getElementById('sessions');
  if (xp) xp.textContent = Number(data.xp)||0; if (streak) streak.textContent = Number(data.streak)||0; if (sessions) sessions.textContent = Array.isArray(data.history) ? data.history.length : 0;
  window.addEventListener('resize', window.drawProgressChart); window.drawProgressChart();
})();
