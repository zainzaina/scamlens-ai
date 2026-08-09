// Analyzer page logic
(function () {
  const HIST_KEY = 'scamlens.history';
  const NOTICE_KEY = 'scamlens.noticeAcknowledged';

  function hasAcknowledgedNotice() {
    try {
      return sessionStorage.getItem(NOTICE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  function acknowledgeNotice() {
    try {
      sessionStorage.setItem(NOTICE_KEY, 'true');
    } catch {
      // Keep the notice active if session storage is unavailable.
      return false;
    }
    return true;
  }

  function initializeNotice() {
    const modal = document.getElementById('notice-modal');
    const countdown = document.getElementById('notice-countdown');
    const accept = document.getElementById('notice-accept');
    if (!modal || !countdown || !accept) return;

    if (hasAcknowledgedNotice()) {
      modal.remove();
      return;
    }

    const protectedControls = document.querySelectorAll('main button, main input, main textarea');
    protectedControls.forEach(control => { control.disabled = true; });
    document.body.classList.add('notice-locked');
    let remaining = 8;
    const timer = window.setInterval(() => {
      remaining -= 1;
      countdown.textContent = String(remaining);
      if (remaining <= 0) {
        window.clearInterval(timer);
        countdown.textContent = '✓';
        accept.disabled = false;
        accept.focus();
      }
    }, 1000);

    accept.addEventListener('click', () => {
      if (accept.disabled || !acknowledgeNotice()) return;
      window.clearInterval(timer);
      modal.remove();
      document.body.classList.remove('notice-locked');
      protectedControls.forEach(control => { control.disabled = false; });
      document.getElementById('btn-analyze')?.focus();
    });
  }

  function saveHistory(entry) {
    const list = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
    list.unshift(entry);
    localStorage.setItem(HIST_KEY, JSON.stringify(list.slice(0, 100)));
  }

  let activeTab = 'text';
  let selectedFile = null;

  function getOcrPreviewElements() {
    return {
      container: document.getElementById('ocr-preview'),
      status: document.getElementById('ocr-status'),
      text: document.getElementById('ocr-text'),
      meta: document.getElementById('ocr-meta'),
    };
  }

  function setOcrLoadingState(message) {
    const { container, status, text, meta } = getOcrPreviewElements();
    container.classList.remove('hidden');
    status.textContent = 'Processing';
    text.textContent = message;
    meta.textContent = 'OCR is extracting visible text from the selected image.';
  }

  function setOcrEmptyState() {
    const { container, status, text, meta } = getOcrPreviewElements();
    container.classList.remove('hidden');
    status.textContent = 'No readable text';
    text.textContent = 'No readable text detected in this image.';
    meta.textContent = 'No visible text was detected with OCR.';
  }

  function setOcrResultState(extractedText, confidence) {
    const { container, status, text, meta } = getOcrPreviewElements();
    container.classList.remove('hidden');
    status.textContent = confidence !== null ? `OCR confidence ${confidence}%` : 'OCR ready';
    text.textContent = extractedText;
    meta.textContent = confidence !== null ? `OCR confidence: ${confidence}% (English + Arabic detection)` : 'OCR completed.';
  }

  async function extractTextFromImage(file) {
    if (!window.Tesseract) {
      throw new Error('OCR library failed to load.');
    }

    const ocrPreview = getOcrPreviewElements();
    if (ocrPreview.container) ocrPreview.container.classList.remove('hidden');

    setOcrLoadingState('Extracting text from image...');

    try {
      const result = await window.Tesseract.recognize(file, 'eng+ara', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pct = Math.max(0, Math.min(100, Math.round(m.progress * 100)));
            if (ocrPreview.status) ocrPreview.status.textContent = `Processing ${pct}%`;
          }
        },
      });

      const extractedText = String(result?.data?.text || '').replace(/\r/g, '').trim();
      const confidence = typeof result?.data?.confidence === 'number'
        ? Math.max(0, Math.min(100, Math.round(result.data.confidence)))
        : null;

      if (!extractedText) {
        setOcrEmptyState();
        return { text: '', confidence };
      }

      setOcrResultState(extractedText, confidence);
      return { text: extractedText, confidence };
    } catch (error) {
      setOcrEmptyState();
      throw error;
    }
  }

  function switchTab(t) {
    activeTab = t;
    document.querySelectorAll('[data-tab]').forEach(el => el.classList.toggle('active', el.dataset.tab === t));
    document.querySelectorAll('[data-panel]').forEach(el => el.classList.toggle('hidden', el.dataset.panel !== t));
  }

  function skeleton() {
    return `
      <div class="card p-6 space-y-4 fade-in">
        <div class="flex items-center gap-4">
          <div class="skeleton" style="width:120px;height:120px;border-radius:999px"></div>
          <div class="flex-1 space-y-2">
            <div class="skeleton h-5 w-40"></div>
            <div class="skeleton h-4 w-64"></div>
            <div class="skeleton h-4 w-52"></div>
          </div>
        </div>
        <div class="grid md:grid-cols-3 gap-3">
          <div class="skeleton h-24"></div><div class="skeleton h-24"></div><div class="skeleton h-24"></div>
        </div>
        <div class="skeleton h-40"></div>
      </div>`;
  }

  function ring(score, color) {
    const c = 2 * Math.PI * 52;
    const off = c * (1 - score / 100);
    return `
      <div class="relative" style="width:160px;height:160px">
        <svg class="risk-ring" viewBox="0 0 120 120" width="160" height="160">
          <circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,.08)" stroke-width="10" fill="none"/>
          <circle cx="60" cy="60" r="52" stroke="${color}" stroke-width="10" fill="none" stroke-linecap="round"
            stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"/>
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <div class="text-4xl font-bold" style="color:${color}">${score}</div>
          <div class="text-xs uppercase tracking-wider" style="color:var(--muted)">Risk Score</div>
        </div>
      </div>`;
  }

  function chipList(items, cls) {
    if (!items || !items.length) return `<span class="text-sm" style="color:var(--muted)">None detected</span>`;
    return items.map(i => `<span class="chip ${cls||''}">${escapeHtml(i)}</span>`).join(' ');
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function explanationFindings(explanation) {
    const findings = String(explanation || '').match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
    return findings.map(item => item.trim()).filter(Boolean);
  }

  function dnaIndicators(r) {
    const indicators = [];
    (r.manipulation_techniques || []).forEach(item => indicators.push({ label: item, source: 'Technique' }));
    (r.red_flags || []).forEach(item => indicators.push({ label: item, source: 'Red flag' }));
    (r.scam_dna || []).forEach(item => indicators.push({ label: item, source: 'Behavior' }));
    return indicators.slice(0, 12);
  }

  function attackPath(r) {
    const techniques = (r.manipulation_techniques || []).filter(Boolean);
    return techniques.length >= 2 ? techniques.slice(0, 5) : [];
  }

  function renderResult(r, input) {
    const color = window.ScamLens.riskColor(r.risk_score);
    const findings = explanationFindings(r.explanation);
    const indicators = dnaIndicators(r);
    const path = attackPath(r);
    const html = `
      <div id="result-root" class="space-y-6 fade-in">
        <div class="card threat-profile p-6 md:p-8 relative overflow-hidden">
          <div class="hero-glow"></div>
          <div class="relative">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div><div class="console-label">ScamLens threat profile</div><div class="text-xs mt-1" style="color:var(--muted)">Classification and evidence summary</div></div>
              <span class="chip result-status" style="color:${color}; border-color:${color}55; background:${color}18">${escapeHtml(r.risk_level || 'Unknown')}</span>
            </div>
            <div class="threat-profile-grid">
            ${ring(r.risk_score, color)}
            <div class="min-w-0">
              <div class="flex flex-wrap gap-2 mb-3"><span class="chip chip-info">${escapeHtml(r.scam_type || 'Unknown')}</span><span class="chip">Confidence ${r.confidence}%</span></div>
              <h2 class="text-2xl md:text-3xl font-bold mb-4">${escapeHtml(r.summary || '')}</h2>
              <div class="profile-metrics">
                <div><span>Threat level</span><strong style="color:${color}">${escapeHtml(r.risk_level || 'Unknown')}</strong></div>
                <div><span>Confidence</span><strong>${r.confidence}%</strong></div>
                <div><span>Recommendation</span><strong>${escapeHtml(r.recommendation || 'Review')}</strong></div>
              </div>
            </div>
            </div>
            <div class="result-why mt-7 p-4 md:p-5">
              <div class="console-label mb-3" style="color:var(--warning)">Why this was flagged / intelligence findings</div>
              <div class="finding-list">${findings.length ? findings.map((finding, index) => `<div class="finding-row"><span>${String(index + 1).padStart(2, '0')}</span><p>${escapeHtml(finding)}</p></div>`).join('') : '<p class="text-sm" style="color:var(--muted)">No explanation was returned.</p>'}</div>
            </div>
              <div class="mt-4 flex flex-wrap gap-2">
                <button id="btn-pdf" class="btn btn-primary text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path d="M5.625 1.5H9v3.75A2.25 2.25 0 0 0 11.25 7.5H15v9.75a2.25 2.25 0 0 1-2.25 2.25h-7.125A2.25 2.25 0 0 1 3.375 17.25V3.75A2.25 2.25 0 0 1 5.625 1.5z"/><path d="M10.5 1.5V5.25c0 .414.336.75.75.75H15L10.5 1.5z"/><path d="M18.375 12.75h-1.5A2.625 2.625 0 0 0 14.25 15.375v6H15.75V19.5h1.125a2.625 2.625 0 0 0 0-5.25.75.75 0 0 0 0-1.5z"/></svg>
                  Download PDF
                </button>
                <button id="btn-copy" class="btn btn-ghost text-sm">Copy Summary</button>
                <button id="btn-share" class="btn btn-ghost text-sm">Share</button>
              </div>
            </div>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-6">
          <div class="card p-6 threat-dna-card">
            <div class="flex items-center justify-between gap-3 mb-2"><div><div class="console-label">Behavior signature</div><h3 class="font-bold text-xl">Scam DNA™</h3></div><span class="chip chip-info">${indicators.length} signals</span></div>
            <p class="text-xs mb-5" style="color:var(--muted)">Characteristics derived from detected techniques, flags, and behaviors</p>
            <div class="dna-bars">${indicators.length ? indicators.map((item, index) => `<div class="dna-bar-row"><div class="flex justify-between gap-3 text-xs"><span>${escapeHtml(item.label)}</span><span class="dna-source">${item.source}</span></div><div class="dna-track"><i style="width:${Math.max(34, Math.min(96, r.risk_score - index * 4 + 20))}%;background:${color}"></i></div></div>`).join('') : '<span class="text-sm" style="color:var(--muted)">No behavior signals detected.</span>'}</div>
            <div class="dna-summary"><div><span>Awareness</span><strong>${r.awareness_score}/100</strong></div><div><span>Confidence</span><strong>${r.confidence}/100</strong></div></div>
            ${path.length ? `<div class="attack-path"><div class="console-label mb-2">Observed technique sequence</div><div class="path-flow">${path.map((step, index) => `<span>${escapeHtml(step)}</span>${index < path.length - 1 ? '<b>→</b>' : ''}`).join('')}</div></div>` : ''}
          </div>

          <div class="card p-6">
            <div class="flex items-center gap-2 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#F59E0B" class="w-5 h-5"><path d="M11.983 1.907a.75.75 0 0 0-1.292-.657l-8.5 9.5A.75.75 0 0 0 2.75 12h6.572l-1.305 6.093a.75.75 0 0 0 1.292.657l8.5-9.5A.75.75 0 0 0 17.25 8h-6.572l1.305-6.093Z"/></svg>
              <h3 class="font-bold">Future Impact</h3>
            </div>
            <p class="text-xs mb-3" style="color:var(--muted)">What may happen if the victim follows this message</p>
            <div class="flex flex-wrap gap-2">${chipList(r.future_impact, 'chip-danger')}</div>
          </div>

          <div class="card p-6">
            <h3 class="font-bold mb-3">Psychological Manipulation</h3>
            <div class="flex flex-wrap gap-2">${chipList(r.manipulation_techniques, 'chip-warn')}</div>
          </div>

          <div class="card p-6">
            <h3 class="font-bold mb-3">Red Flags</h3>
            <div class="flex flex-wrap gap-2">${chipList(r.red_flags, 'chip-danger')}</div>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-6">
          <div class="card p-6">
            <h3 class="font-bold mb-4">Victim Simulator</h3>
            <div class="relative">
              ${(r.victim_timeline||[]).map((t,i,arr) => `
                <div class="tl-item pb-4">
                  ${i<arr.length-1?'<div class="tl-line"></div>':''}
                  <div class="text-xs font-semibold" style="color:var(--muted)">${escapeHtml(t.when||'')}</div>
                  <div class="text-sm">${escapeHtml(t.event||'')}</div>
                </div>`).join('')}
            </div>
            <p class="text-xs mt-2" style="color:var(--muted)">Educational simulation only.</p>
          </div>

          <div class="card p-6">
            <h3 class="font-bold mb-3">Scam Shield Score</h3>
            <div class="flex items-center gap-4 mb-4">
              <div class="text-5xl font-bold grad-text">${r.awareness_score}</div>
              <div class="text-sm" style="color:var(--muted)">Security Awareness / 100</div>
            </div>
            <ul class="space-y-2 text-sm">
              ${(r.awareness_notes||[]).map(n => `<li class="flex items-start gap-2"><span class="mt-1 w-1.5 h-1.5 rounded-full" style="background:#22C55E"></span><span>${escapeHtml(n)}</span></li>`).join('')}
            </ul>
            <div class="mt-4 p-3 rounded-lg" style="background: color-mix(in oklab, var(--primary) 12%, transparent); border:1px solid rgba(59,130,246,.25)">
              <div class="text-xs font-semibold text-blue-300 mb-1">Educational Tip</div>
              <div class="text-sm">${escapeHtml(r.educational_tip||'')}</div>
            </div>
          </div>
        </div>

        <div class="card p-6">
          <h3 class="font-bold mb-3">Risk Breakdown</h3>
          <canvas id="risk-chart" height="120"></canvas>
        </div>
      </div>`;
    document.getElementById('result').innerHTML = html;

    // Chart
    if (window.Chart) {
      const ctx = document.getElementById('risk-chart');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Risk','Confidence','Awareness','Red Flags','Manipulation'],
          datasets: [{
            label: 'Score',
            data: [r.risk_score, r.confidence, r.awareness_score, (r.red_flags?.length||0)*10, (r.manipulation_techniques?.length||0)*14],
            backgroundColor: ['#EF4444','#3B82F6','#22C55E','#F59E0B','#A78BFA'],
            borderRadius: 8
          }]
        },
        options: {
          plugins: { legend: { display:false } },
          scales: {
            y: { beginAtZero:true, max:100, grid:{ color:'rgba(255,255,255,.06)' }, ticks:{ color:'#94A3B8' } },
            x: { grid:{ display:false }, ticks:{ color:'#94A3B8' } }
          }
        }
      });
    }

    document.getElementById('btn-pdf').onclick = () => window.ScamLens.generatePDF(r, input);
    document.getElementById('btn-copy').onclick = async () => {
      const text = `ScamLens AI: ${r.risk_level} (${r.risk_score}/100) — ${r.scam_type}\n${r.summary}\nRecommendation: ${r.recommendation}`;
      await navigator.clipboard.writeText(text);
      toast('Summary copied');
    };
    document.getElementById('btn-share').onclick = async () => {
      const text = `ScamLens AI: ${r.risk_level} (${r.risk_score}/100) — ${r.scam_type}\n${r.summary}`;
      if (navigator.share) { try { await navigator.share({ title:'ScamLens AI Report', text }); } catch{} }
      else { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
    };
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm fade-in';
    t.style.background = 'rgba(17,24,39,.95)';
    t.style.border = '1px solid var(--border)';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  }

  async function runAnalysis() {
    const resultEl = document.getElementById('result');
    const piiNotice = document.getElementById('pii-notice');
    resultEl.innerHTML = skeleton();
    piiNotice?.classList.add('hidden');

    const payload = {};
    let inputSummary = '';
    try {
      if (activeTab === 'text') {
        const originalText = document.getElementById('in-text').value.trim();
        if (!originalText) throw new Error('Please paste a message to analyze.');
        const sanitized = window.ScamLens.redactPII(originalText);
        payload.text = sanitized.text;
        inputSummary = sanitized.text.slice(0, 200);
        if (sanitized.changed) piiNotice?.classList.remove('hidden');
      } else if (activeTab === 'url') {
        const originalUrl = document.getElementById('in-url').value.trim();
        if (!originalUrl) throw new Error('Please paste a URL to analyze.');
        const sanitized = window.ScamLens.redactPII(originalUrl);
        payload.url = sanitized.text;
        inputSummary = sanitized.text;
        if (sanitized.changed) piiNotice?.classList.remove('hidden');
      } else {
        if (!selectedFile) throw new Error('Please select a screenshot.');
        const { text: extractedText } = await extractTextFromImage(selectedFile);
        if (!extractedText) throw new Error('No readable text detected in this image.');
        const sanitized = window.ScamLens.redactPII(extractedText);
        payload.text = sanitized.text;
        inputSummary = `[Screenshot] ${selectedFile.name}`;
        if (sanitized.changed) piiNotice?.classList.remove('hidden');
      }

      const result = await window.ScamLens.analyze(payload);
      renderResult(result, { summary: inputSummary, kind: activeTab });
      saveHistory({
        id: Date.now(),
        date: new Date().toISOString(),
        input: inputSummary,
        kind: activeTab,
        result
      });
    } catch (e) {
      resultEl.innerHTML = `
        <div class="card p-6 border" style="border-color: rgba(239,68,68,.4)">
          <div class="flex items-center gap-2 mb-2 text-red-400 font-semibold">Analysis failed</div>
          <p class="text-sm" style="color:var(--muted)">${escapeHtml(e.message)}</p>
        </div>`;
    }
  }

  function loadDemo() {
    switchTab('text');
    document.getElementById('in-text').value = `URGENT: Your bank account has been LOCKED due to suspicious activity!
To restore access immediately, verify your identity within 24 hours or your funds will be frozen.
Click here: http://secure-bank-verify.co/login?ref=8821
Enter your username, password and OTP code to confirm your identity.
- Bank Security Team`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    initializeNotice();
    document.querySelectorAll('[data-tab]').forEach(el => el.addEventListener('click', () => switchTab(el.dataset.tab)));
    document.getElementById('btn-analyze').addEventListener('click', runAnalysis);
    document.getElementById('btn-demo').addEventListener('click', loadDemo);

    const fileIn = document.getElementById('in-file');
    const drop = document.getElementById('drop-zone');
    const preview = document.getElementById('file-preview');
    function handleFile(f) {
      if (!f) return;
      selectedFile = f;
      const url = URL.createObjectURL(f);
      preview.innerHTML = `<img src="${url}" alt="preview" class="max-h-64 rounded-lg mx-auto"/><div class="text-xs mt-2" style="color:var(--muted)">${escapeHtml(f.name)}</div>`;
      const { container, status, text, meta } = getOcrPreviewElements();
      if (container) container.classList.add('hidden');
      if (status) status.textContent = 'OCR ready';
      if (text) text.textContent = '';
      if (meta) meta.textContent = '';
    }
    fileIn.addEventListener('change', e => handleFile(e.target.files[0]));
    ['dragover','dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('ring-2','ring-blue-500'); }));
    ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('ring-2','ring-blue-500'); }));
    drop.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));

    // Prefill from ?demo=1
    if (new URLSearchParams(location.search).get('demo') === '1') loadDemo();
  });
})();
