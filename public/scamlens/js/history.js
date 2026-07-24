// History page
(function () {
  const HIST_KEY = 'scamlens.history';
  function load() { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); }
  function save(l) { localStorage.setItem(HIST_KEY, JSON.stringify(l)); }
  function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  let q = '';
  let filter = 'all';

  function render() {
    const list = load().filter(e => {
      if (filter !== 'all' && e.result.risk_level !== filter) return false;
      if (q && !(e.input.toLowerCase().includes(q) || (e.result.scam_type||'').toLowerCase().includes(q))) return false;
      return true;
    });
    const root = document.getElementById('hist-list');
    if (!list.length) {
      root.innerHTML = `<div class="card p-10 text-center" style="color:var(--muted)">No analyses yet. <a class="link" href="analyzer.html">Analyze something</a>.</div>`;
      return;
    }
    root.innerHTML = list.map(e => {
      const c = window.ScamLens.riskColor(e.result.risk_score);
      return `
        <div class="card p-5 flex flex-col md:flex-row md:items-center gap-4 fade-in">
          <div class="flex items-center gap-4 flex-1 min-w-0">
            <div class="relative flex items-center justify-center" style="width:56px;height:56px">
              <svg viewBox="0 0 40 40" width="56" height="56" class="risk-ring">
                <circle cx="20" cy="20" r="17" stroke="rgba(255,255,255,.08)" stroke-width="4" fill="none"/>
                <circle cx="20" cy="20" r="17" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"
                  stroke-dasharray="${(2*Math.PI*17).toFixed(2)}" stroke-dashoffset="${(2*Math.PI*17*(1-e.result.risk_score/100)).toFixed(2)}"/>
              </svg>
              <div class="absolute text-sm font-bold" style="color:${c}">${e.result.risk_score}</div>
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap gap-2 mb-1">
                <span class="chip" style="color:${c}; border-color:${c}55; background:${c}18">${e.result.risk_level}</span>
                <span class="chip chip-info">${esc(e.result.scam_type)}</span>
                <span class="chip">${esc(e.kind)}</span>
              </div>
              <div class="text-sm truncate max-w-xl">${esc(e.input)}</div>
              <div class="text-xs" style="color:var(--muted)">${new Date(e.date).toLocaleString()}</div>
            </div>
          </div>
          <div class="flex gap-2">
            <button data-id="${e.id}" data-act="open" class="btn btn-ghost text-sm">Open</button>
            <button data-id="${e.id}" data-act="del" class="btn btn-ghost text-sm" style="color:#FCA5A5">Delete</button>
          </div>
        </div>`;
    }).join('');

    root.querySelectorAll('button[data-act]').forEach(b => {
      b.onclick = () => {
        const id = Number(b.dataset.id);
        if (b.dataset.act === 'del') {
          save(load().filter(x => x.id !== id));
          render();
        } else {
          const entry = load().find(x => x.id === id);
          if (entry) showModal(entry);
        }
      };
    });
  }

  function showModal(entry) {
    const r = entry.result;
    const c = window.ScamLens.riskColor(r.risk_score);
    const wrap = document.createElement('div');
    wrap.className = 'fixed inset-0 z-50 p-4 overflow-auto';
    wrap.innerHTML = `
      <div class="absolute inset-0" style="background:rgba(0,0,0,.7); backdrop-filter:blur(4px)"></div>
      <div class="relative card max-w-2xl mx-auto my-8 p-6 fade-in">
        <div class="flex justify-between items-start mb-4">
          <div>
            <span class="chip" style="color:${c}; border-color:${c}55; background:${c}18">${r.risk_level} · ${r.risk_score}/100</span>
            <span class="chip chip-info ml-1">${esc(r.scam_type)}</span>
          </div>
          <button id="__close" class="btn btn-ghost !py-1 !px-2">✕</button>
        </div>
        <h3 class="text-xl font-bold mb-2">${esc(r.summary||'')}</h3>
        <p class="text-sm mb-4" style="color:var(--muted)">${esc(r.explanation||'')}</p>
        <div class="text-xs uppercase tracking-wider mb-2" style="color:var(--muted)">Original input</div>
        <div class="p-3 rounded-lg text-sm" style="background:var(--card-2)">${esc(entry.input)}</div>
        <div class="flex justify-end gap-2 mt-4">
          <button id="__pdf" class="btn btn-primary text-sm">Download PDF</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('#__close').onclick = () => wrap.remove();
    wrap.querySelector('#__pdf').onclick = () => window.ScamLens.generatePDF(r, { summary: entry.input, kind: entry.kind });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('hist-search').addEventListener('input', e => { q = e.target.value.toLowerCase(); render(); });
    document.getElementById('hist-filter').addEventListener('change', e => { filter = e.target.value; render(); });
    document.getElementById('hist-clear').addEventListener('click', () => {
      if (confirm('Clear all history?')) { save([]); render(); }
    });
    render();
  });
})();
