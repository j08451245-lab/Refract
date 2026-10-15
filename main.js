// Refract — Apple Luxury Interaction Script

document.addEventListener('DOMContentLoaded', () => {
  // 1. Scroll Reveal com Intersection Observer
  const revealElements = document.querySelectorAll('[data-reveal]');
  
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        // Once revealed, unobserve for performance
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach((el) => revealObserver.observe(el));

  // 2. Nav Glass Dinâmica ao Rolar
  const nav = document.querySelector('.nav-container');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }, { passive: true });

  // 3. Efeito Parallax Suave e Tilt 3D sutil na Janela Mockup
  const windowMock = document.querySelector('.apple-glass-window');
  if (windowMock) {
    windowMock.addEventListener('mousemove', (e) => {
      const rect = windowMock.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      const rotateX = -(y / rect.height) * 6;
      const rotateY = (x / rect.width) * 6;

      windowMock.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    });

    windowMock.addEventListener('mouseleave', () => {
      windowMock.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  }

  // 4. Aurora Background Dinâmico com o cursor
  const glow1 = document.querySelector('.glow-1');
  if (glow1) {
    window.addEventListener('mousemove', (e) => {
      const xRatio = (e.clientX / window.innerWidth) - 0.5;
      const yRatio = (e.clientY / window.innerHeight) - 0.5;
      glow1.style.transform = 'translateX(calc(-50% + ' + (xRatio * 40) + 'px)) translateY(' + (yRatio * 40) + 'px)';
    }, { passive: true });
  }

  // 5. Terminal Quick-Start: troca de comando + copiar
  const termTabs = document.querySelectorAll('.term-tab');
  const installCmd = document.getElementById('install-cmd');
  const installHint = document.getElementById('install-hint');
  termTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      termTabs.forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      if (installCmd) installCmd.textContent = tab.dataset.cmd || '';
      if (installHint) installHint.textContent = tab.dataset.hint || '';
    });
  });

  const copyBtn = document.getElementById('copy-install');
  const copyLabel = document.getElementById('copy-install-label');
  if (copyBtn && installCmd) {
    copyBtn.addEventListener('click', async () => {
      const text = installCmd.textContent.trim();
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      copyBtn.classList.add('copied');
      if (copyLabel) copyLabel.textContent = 'Copiado!';
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        if (copyLabel) copyLabel.textContent = 'Copiar';
      }, 1800);
    });
  }

  // 6. Cenários interativos do mockup (dados + render)
  const scenarios = {
    eng: {
      speaker: 'Entrevistador / Lead Tech',
      time: '14:02:19',
      quote: '"Como você arquitetaria consistência eventual sem travar requisições de checkout quando a fila de eventos do Kafka atinge throttling?"',
      tag: '✦ Resposta Recomendada (Modo Engenharia)',
      latency: '380ms latência',
      lead: 'Padrão Transactional Outbox + Buffer In-Memory Assíncrono:',
      bullets: [
        'Persistir o evento na mesma transação ACID do banco relacional (tabela de <code>outbox_events</code>).',
        'Worker CDC (Debezium ou Streams) faz o streaming desacoplado para o Kafka fora do caminho síncrono do checkout.',
        'Para backpressure severo, aplicar fallback com chave de idempotência no Redis e re-tentativa exponencial.'
      ]
    },
    exec: {
      speaker: 'VP de Vendas / QBR Trimestral',
      time: '09:41:07',
      quote: '"O churn subiu 3 pontos no enterprise. Qual é a sua leitura — preço, onboarding ou concorrência?"',
      tag: '✦ Resposta Recomendada (Modo Executivo)',
      latency: '410ms latência',
      lead: 'Framework de resposta em 3 camadas — dado, causa, ação:',
      bullets: [
        'Dado: isolar o churn por coorte — <code>enterprise &gt; 500 seats</code> concentra 78% da alta.',
        'Causa: correlacionar com tempo de onboarding — contas sem SSO ativo churnam 2,4x mais.',
        'Ação: propor piloto de onboarding assistido + desconto de retenção atrelado a métrica de ativação.'
      ]
    },
    design: {
      speaker: 'Staff Engineer / System Design',
      time: '16:15:52',
      quote: '"Desenhe um encurtador de URLs para 100M de escritas/dia. Como você evita colisão e hot partition?"',
      tag: '✦ Resposta Recomendada (Modo System Design)',
      latency: '395ms latência',
      lead: 'Arquitetura: hash distribuído + KGS pré-gerado:',
      bullets: [
        'Geração de IDs via <code>Key Generation Service</code> com range pré-alocado por nó (sem coordenação no hot path).',
        'Base62 de 7 chars (~3,5T combinações) + tabela de lookup com TTL e cache LRU no edge.',
        'Sharding por hash do short-key + réplicas de leitura; rate limit por IP para conter abuso.'
      ]
    }
  };

  const flow = document.getElementById('dialogue-flow');
  const scenarioTabs = document.querySelectorAll('.scenario-tab');

  function renderScenario(key) {
    const s = scenarios[key];
    if (!s || !flow) return;
    const bullets = s.bullets.map((b) => '<li>' + b + '</li>').join('');
    flow.style.animation = 'none';
    void flow.offsetWidth;
    flow.style.animation = '';
    flow.innerHTML =
      '<div class="dialogue-card interviewer">' +
        '<div class="card-meta">' +
          '<span class="speaker-tag">' + s.speaker + '</span>' +
          '<span class="timestamp">' + s.time + '</span>' +
        '</div>' +
        '<p class="dialogue-text">' + s.quote + '</p>' +
      '</div>' +
      '<div class="dialogue-card refract-suggestion">' +
        '<div class="card-meta">' +
          '<span class="copilot-tag">' + s.tag + '</span>' +
          '<span class="latency-tag">' + s.latency + '</span>' +
        '</div>' +
        '<div class="suggestion-content">' +
          '<p class="answer-lead"><strong>' + s.lead + '</strong></p>' +
          '<ul class="bullet-points">' + bullets + '</ul>' +
        '</div>' +
        '<div class="suggestion-actions">' +
          '<span class="pill-shortcut">Copiar resposta: <strong>Ctrl + Shift + C</strong></span>' +
          '<span class="pill-shortcut">Aprofundar contexto: <strong>Tab</strong></span>' +
        '</div>' +
      '</div>';
  }

  scenarioTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      scenarioTabs.forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      renderScenario(tab.dataset.scenario);
    });
  });
  renderScenario('eng');

  // 7. GitHub API: stars + última release (com fallback silencioso)
  const starsEl = document.getElementById('gh-stars');
  const releaseEl = document.getElementById('latest-release');
  fetch('https://api.github.com/repos/davifisica671-afk/Refract', { headers: { 'Accept': 'application/vnd.github+json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data && typeof data.stargazers_count === 'number' && starsEl) {
        starsEl.textContent = data.stargazers_count.toLocaleString('pt-BR');
      }
    })
    .catch(() => {});
  fetch('https://api.github.com/repos/davifisica671-afk/Refract/releases/latest', { headers: { 'Accept': 'application/vnd.github+json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data && data.tag_name && releaseEl) {
        releaseEl.textContent = String(data.tag_name).replace(/^v/i, '');
      }
    })
    .catch(() => {});
});
