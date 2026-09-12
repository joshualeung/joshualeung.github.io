(() => {
  'use strict';
  const dialog = document.querySelector('.search-dialog');
  const input = document.querySelector('#search-input');
  const results = document.querySelector('.search-results');
  const status = document.querySelector('.search-status');
  let searchIndex;
  let indexRequest;
  let debounce;
  let searchTrigger;

  async function search() {
    const query = input.value.trim().toLocaleLowerCase();
    results.replaceChildren();
    if (!query) {
      status.textContent = '让好奇心，找到下一篇好文章。';
      return;
    }
    status.textContent = '正在查找…';
    try {
      if (!searchIndex) {
        if (!indexRequest) indexRequest = fetch(dialog.dataset.searchUrl).then(response => {
          if (!response.ok) throw new Error('Search unavailable');
          return response.json();
        }).catch(error => { indexRequest = undefined; throw error; });
        searchIndex = await indexRequest;
      }
      if (input.value.trim().toLocaleLowerCase() !== query) return;
      const terms = query.split(/\s+/);
      const matches = searchIndex.filter(post => terms.every(term => `${post.title} ${post.tags} ${post.text}`.toLocaleLowerCase().includes(term)));
      status.textContent = matches.length ? `找到 ${matches.length} 篇文章${matches.length > 30 ? '，显示前 30 篇' : ''}` : '暂时没有找到相关文章，试试其他关键词。';
      results.replaceChildren();
      for (const post of matches.slice(0, 30)) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = post.path;
        const title = document.createElement('strong');
        title.textContent = post.title;
        const excerpt = document.createElement('p');
        const position = post.text.toLocaleLowerCase().indexOf(terms[0]);
        const start = Math.max(0, position - 35);
        excerpt.textContent = (start ? '…' : '') + post.text.slice(start, start + 120) + '…';
        a.append(title, excerpt);
        li.append(a);
        results.append(li);
      }
    } catch {
      status.textContent = '搜索暂时无法加载，请稍后重试，也可以通过主题索引查找文章。';
    }
  }
  if (dialog && typeof dialog.showModal === 'function') {
    document.querySelectorAll('[data-open-search]').forEach(button => {
      button.hidden = false;
      button.addEventListener('click', () => {
        searchTrigger = button;
        dialog.showModal();
        input.focus();
      });
    });
    document.querySelector('[data-close-search]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dialog.close();
      }
    });
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => searchTrigger?.focus());
    input.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(search, 150); });
  }

  const sizeSelect = document.querySelector('#reading-size');
  if (sizeSelect) {
    const settings = document.querySelector('.reading-tools');
    const sizes = ['standard', 'large', 'larger'];
    settings.hidden = false;
    sizeSelect.value = sizes.includes(document.documentElement.dataset.readingSize) ? document.documentElement.dataset.readingSize : 'standard';
    sizeSelect.addEventListener('change', () => {
      document.documentElement.dataset.readingSize = sizeSelect.value;
      try { localStorage.setItem('gazette-font-size', sizeSelect.value); } catch {}
    });
    settings.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        settings.open = false;
        settings.querySelector('summary').focus();
      }
    });
    document.addEventListener('click', event => {
      if (!settings.contains(event.target)) settings.open = false;
    });
  }

  const prose = document.querySelector('.article-body .prose');
  const progress = document.querySelector('.reading-progress span');
  if (prose && progress) {
    const links = Array.from(document.querySelectorAll('.article-toc a'));
    const entries = links.map(link => {
      try { return {link, heading: document.getElementById(decodeURIComponent(link.hash.slice(1)))}; } catch { return {link}; }
    }).filter(entry => entry.heading);
    let scheduled = false;
    function updateProgress() {
      scheduled = false;
      const rect = prose.getBoundingClientRect();
      const distance = rect.height - window.innerHeight;
      const fraction = distance > 0 ? Math.min(1, Math.max(0, -rect.top / distance)) : (rect.bottom <= window.innerHeight ? 1 : 0);
      progress.style.transform = `scaleX(${fraction})`;
      let active;
      for (const entry of entries) if (entry.heading.getBoundingClientRect().top <= 120) active = entry;
      for (const entry of entries) {
        if (entry === active) entry.link.setAttribute('aria-current', 'true');
        else entry.link.removeAttribute('aria-current');
      }
    }
    function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(updateProgress); } }
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule, {passive: true});
    if (typeof ResizeObserver === 'function') new ResizeObserver(schedule).observe(prose);
    updateProgress();
  }
  if (navigator.clipboard && window.isSecureContext) {
    document.querySelectorAll('.prose figure.highlight').forEach(figure => {
      const code = figure.querySelector('.code pre');
      if (!code) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'copy-code';
      button.textContent = '复制';
      button.setAttribute('aria-label', '复制代码');
      button.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(code.innerText); button.textContent = '已复制'; }
        catch { button.textContent = '请手动复制'; }
        setTimeout(() => { button.textContent = '复制'; }, 1800);
      });
      figure.append(button);
    });
  }
})();
