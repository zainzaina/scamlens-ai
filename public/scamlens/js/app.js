// Shared app logic: theme, nav injection, utilities
(function () {
  const THEME_KEY = 'scamlens.theme';

  function applyTheme(mode) {
    const html = document.documentElement;
    if (mode === 'light') html.classList.add('light');
    else html.classList.remove('light');
  }
  function getTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  function toggleTheme() {
    const next = document.documentElement.classList.contains('light') ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }
  applyTheme(getTheme());

  window.ScamLens = window.ScamLens || {};
  window.ScamLens.toggleTheme = toggleTheme;

  const NAV = [
    { href: 'index.html', label: 'Home' },
    { href: 'analyzer.html', label: 'Analyzer' },
    { href: 'history.html', label: 'History' },
    { href: 'about.html', label: 'About' },
    { href: 'faq.html', label: 'FAQ' },
  ];

  function currentPage() {
    const p = location.pathname.split('/').pop() || 'index.html';
    return p;
  }

  function renderHeader() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const cur = currentPage();
    el.innerHTML = `
      <header class="glass sticky top-0 z-40 border-b" style="border-color: var(--border)">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="index.html" class="flex items-center gap-2">
            <img src="logo.svg" alt="ScamLens AI" class="w-9 h-9 object-contain" />
            <span><span class="font-bold tracking-tight text-lg">ScamLens <span class="grad-text">AI</span></span><span class="block console-label" style="font-size:.55rem;letter-spacing:.12em">Threat intelligence</span></span>
          </a>
          <nav class="hidden md:flex items-center gap-1">
            ${NAV.map(n => `<a href="${n.href}" class="px-3 py-2 rounded-lg text-sm font-medium ${cur===n.href?'text-white bg-white/5':'text-[color:var(--muted)] hover:text-white hover:bg-white/5'}">${n.label}</a>`).join('')}
          </nav>
          <div class="flex items-center gap-2">
            <button onclick="ScamLens.toggleTheme()" aria-label="Toggle theme" class="btn btn-ghost !py-2 !px-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 15.5A9.75 9.75 0 1 1 8.5 2.25 7.5 7.5 0 0 0 21.75 15.5z"/></svg>
            </button>
            <a href="analyzer.html" class="btn btn-primary !py-2 !px-3 text-sm hidden sm:inline-flex">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path d="M11.983 1.907a.75.75 0 0 0-1.292-.657l-8.5 9.5A.75.75 0 0 0 2.75 12h6.572l-1.305 6.093a.75.75 0 0 0 1.292.657l8.5-9.5A.75.75 0 0 0 17.25 8h-6.572l1.305-6.093Z"/></svg>
              Analyze
            </a>
            <button id="nav-toggle" class="md:hidden btn btn-ghost !py-2 !px-3" aria-label="Menu">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"/></svg>
            </button>
          </div>
        </div>
        <div id="mobile-nav" class="md:hidden hidden border-t" style="border-color: var(--border)">
          <div class="px-4 py-3 flex flex-col gap-1">
            ${NAV.map(n => `<a href="${n.href}" class="px-3 py-2 rounded-lg text-sm ${cur===n.href?'text-white bg-white/5':'text-[color:var(--muted)]'}">${n.label}</a>`).join('')}
          </div>
        </div>
      </header>
    `;
    const t = document.getElementById('nav-toggle');
    const m = document.getElementById('mobile-nav');
    if (t && m) t.addEventListener('click', () => m.classList.toggle('hidden'));
  }

  function renderFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = `
      <footer class="mt-24 border-t" style="border-color: var(--border); background: color-mix(in oklab, var(--surface) 75%, transparent)">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid md:grid-cols-4 gap-8">
          <div>
            <div class="flex items-center gap-2 mb-3">
              <img src="logo.svg" alt="ScamLens AI" class="w-8 h-8 object-contain" />
              <span class="font-bold">ScamLens <span class="grad-text">AI</span></span>
            </div>
            <p class="text-sm" style="color:var(--muted)">AI-assisted scam & phishing risk analysis.</p>
          </div>
          <div>
            <div class="font-semibold mb-2 text-sm">Product</div>
            <ul class="space-y-1 text-sm" style="color:var(--muted)">
              <li><a class="hover:text-white" href="analyzer.html">Analyzer</a></li>
              <li><a class="hover:text-white" href="history.html">History</a></li>
              <li><a class="hover:text-white" href="faq.html">FAQ</a></li>
            </ul>
          </div>
          <div>
            <div class="font-semibold mb-2 text-sm">Company</div>
            <ul class="space-y-1 text-sm" style="color:var(--muted)">
              <li><a class="hover:text-white" href="about.html">About</a></li>
              <li><a class="hover:text-white" href="privacy.html">Privacy</a></li>
              <li><a class="hover:text-white" href="terms.html">Terms</a></li>
            </ul>
          </div>
          <div>
            <div class="font-semibold mb-2 text-sm">Notice</div>
            <p class="text-xs" style="color:var(--muted)">ScamLens AI provides AI-assisted analysis and should be used as a decision support tool. It does not replace professional cybersecurity investigation.</p>
          </div>
        </div>
        <div class="text-center text-xs py-4 border-t" style="color:var(--muted); border-color: var(--border)">
          <div>© 2026 Zain Nofan Abuzaid. All rights reserved.</div>
          <div class="mt-1">ScamLens AI · Developed by Zain Nofan Abuzaid · زين نوفان ابوزيد</div>
          <div class="mt-1">This project should not be presented as the work of another individual or organization without appropriate attribution.</div>
        </div>
      </footer>
    `;
  }

  window.ScamLens.renderChrome = function () {
    renderHeader();
    renderFooter();
  };

  // API key is stored server-side; no client prompt needed.
  window.ScamLens.promptForApiKey = function () { return Promise.resolve('server'); };


  window.ScamLens.riskColor = function (score) {
    if (score >= 80) return '#EF4444';
    if (score >= 60) return '#F97316';
    if (score >= 40) return '#F59E0B';
    if (score >= 20) return '#EAB308';
    return '#22C55E';
  };
  window.ScamLens.riskLevel = function (score) {
    if (score >= 85) return 'Critical';
    if (score >= 65) return 'High Risk';
    if (score >= 40) return 'Suspicious';
    if (score >= 20) return 'Low Risk';
    return 'Safe';
  };

  document.addEventListener('DOMContentLoaded', () => {
    window.ScamLens.renderChrome();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(()=>{});
    }
  });
})();
