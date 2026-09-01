(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  // Header and full-screen menu
  const header = qs('#siteHeader');
  const menuToggle = qs('#menuToggle');
  const menuOverlay = qs('#menuOverlay');

  const setMenu = (open) => {
    body.classList.toggle('menu-open', open);
    menuToggle?.setAttribute('aria-expanded', String(open));
    menuOverlay?.setAttribute('aria-hidden', String(!open));
  };

  menuToggle?.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  qs('.menu-backdrop')?.addEventListener('click', () => setMenu(false));
  qsa('.menu-panel a').forEach((link) => link.addEventListener('click', () => setMenu(false)));

  // Theme
  const themeToggle = qs('#themeToggle');
  themeToggle?.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    localStorage.setItem('duyuxi-theme', next);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'light' ? '#f3f3f6' : '#050507');
  });

  // Pointer glow and magnetic controls
  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;
  let glowX = pointerX;
  let glowY = pointerY;
  let glowFrame = 0;

  const renderGlow = () => {
    glowX += (pointerX - glowX) * 0.12;
    glowY += (pointerY - glowY) * 0.12;
    root.style.setProperty('--cursor-x', `${glowX}px`);
    root.style.setProperty('--cursor-y', `${glowY}px`);
    if (Math.abs(pointerX - glowX) > .2 || Math.abs(pointerY - glowY) > .2) {
      glowFrame = requestAnimationFrame(renderGlow);
    } else {
      glowFrame = 0;
    }
  };

  if (finePointer && !reduceMotion) {
    document.addEventListener('pointermove', (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!glowFrame) glowFrame = requestAnimationFrame(renderGlow);
    }, { passive: true });

    qsa('.magnetic').forEach((element) => {
      element.addEventListener('pointermove', (event) => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * .14;
        const y = (event.clientY - rect.top - rect.height / 2) * .18;
        element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
      element.addEventListener('pointerleave', () => {
        element.style.transform = '';
      });
    });
  }

  // Ability voice canvas
  const canvas = qs('#voiceCanvas');
  const voiceLabel = qs('#voiceLabel');
  const voiceButton = qs('#voiceButton');
  const capabilityItems = qsa('.capability-item');
  const rail = qs('#capabilityRail');

  const palette = {
    content: ['#f43fce', '#7c3aed', '#38bdf8'],
    ai: ['#38bdf8', '#7c3aed', '#53f7b0'],
    visual: ['#ff6bdc', '#f43fce', '#ff9b62'],
    law: ['#a78bfa', '#e9d5ff', '#38bdf8']
  };

  let activeMode = 'content';
  let modeIndex = 0;
  let ctx;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let deviceScale = 1;
  let canvasPointer = { x: 0, y: 0, active: false };
  let autoCycle;

  const resizeCanvas = () => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    deviceScale = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = Math.max(1, rect.width);
    canvasHeight = Math.max(1, rect.height);
    canvas.width = Math.round(canvasWidth * deviceScale);
    canvas.height = Math.round(canvasHeight * deviceScale);
    ctx = canvas.getContext('2d');
    ctx.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
  };

  const setMode = (mode, item) => {
    if (!palette[mode]) return;
    activeMode = mode;
    const colors = palette[mode];
    root.style.setProperty('--voice-a', colors[0]);
    root.style.setProperty('--voice-b', colors[1]);
    root.style.setProperty('--voice-c', colors[2]);
    capabilityItems.forEach((button) => button.classList.toggle('is-active', button === item || button.dataset.mode === mode));
    if (voiceLabel) voiceLabel.textContent = item?.dataset.label || capabilityItems.find((button) => button.dataset.mode === mode)?.dataset.label || mode;
    modeIndex = Math.max(0, capabilityItems.findIndex((button) => button.dataset.mode === mode));
  };

  const cycleMode = () => {
    if (!capabilityItems.length) return;
    modeIndex = (modeIndex + 1) % capabilityItems.length;
    const item = capabilityItems[modeIndex];
    setMode(item.dataset.mode, item);
  };

  const restartCycle = () => {
    clearInterval(autoCycle);
    if (!reduceMotion) autoCycle = window.setInterval(cycleMode, 4400);
  };

  capabilityItems.forEach((item) => {
    const activate = () => {
      setMode(item.dataset.mode, item);
      restartCycle();
    };
    item.addEventListener('pointerenter', activate);
    item.addEventListener('focus', activate);
    item.addEventListener('click', activate);
  });

  rail?.addEventListener('pointerenter', () => clearInterval(autoCycle));
  rail?.addEventListener('pointerleave', restartCycle);
  voiceButton?.addEventListener('click', () => {
    cycleMode();
    restartCycle();
  });

  if (canvas) {
    canvas.addEventListener('pointermove', (event) => {
      const rect = canvas.getBoundingClientRect();
      canvasPointer.x = event.clientX - rect.left;
      canvasPointer.y = event.clientY - rect.top;
      canvasPointer.active = true;
    });
    canvas.addEventListener('pointerleave', () => { canvasPointer.active = false; });
  }

  const drawVoice = (time = 0) => {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    const colors = palette[activeMode];
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const base = Math.min(canvasWidth, canvasHeight) * .27;
    const dx = canvasPointer.active ? (canvasPointer.x - cx) / Math.max(canvasWidth, 1) : 0;
    const dy = canvasPointer.active ? (canvasPointer.y - cy) / Math.max(canvasHeight, 1) : 0;
    const t = time * .001;

    const glow = ctx.createRadialGradient(cx, cy, base * .1, cx, cy, base * 1.4);
    glow.addColorStop(0, `${colors[1]}2f`);
    glow.addColorStop(.55, `${colors[0]}12`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, base * 1.55, 0, Math.PI * 2);
    ctx.fill();

    for (let ring = 0; ring < 15; ring += 1) {
      const points = 180;
      const radius = base * (.72 + ring * .028);
      const amplitude = 8 + ring * .7 + (canvasPointer.active ? 11 : 0);
      ctx.beginPath();
      for (let i = 0; i <= points; i += 1) {
        const angle = (i / points) * Math.PI * 2;
        const pointerPull = canvasPointer.active ? Math.cos(angle - Math.atan2(dy, dx)) * Math.hypot(dx, dy) * 34 : 0;
        const wave = Math.sin(angle * (3 + ring % 4) + t * (1.1 + ring * .03) + ring * .62) * amplitude;
        const micro = Math.sin(angle * 11 - t * .72 + ring) * 3;
        const r = radius + wave + micro + pointerPull;
        const x = cx + Math.cos(angle) * r + dx * (ring + 2) * 2;
        const y = cy + Math.sin(angle) * r + dy * (ring + 2) * 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const gradient = ctx.createLinearGradient(cx - base, cy, cx + base, cy);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(.5, colors[1]);
      gradient.addColorStop(1, colors[2]);
      ctx.strokeStyle = gradient;
      ctx.globalAlpha = .25 + ring * .022;
      ctx.lineWidth = ring % 5 === 0 ? 1.3 : .72;
      ctx.stroke();
    }

    ctx.globalAlpha = .75;
    ctx.strokeStyle = colors[0];
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = cx - base * 1.35; x <= cx + base * 1.35; x += 3) {
      const normalized = (x - cx) / base;
      const envelope = Math.max(0, 1 - Math.abs(normalized) / 1.35);
      const y = cy + Math.sin(normalized * 12 + t * 2.1) * 12 * envelope + Math.sin(normalized * 31 - t) * 4 * envelope;
      if (x === cx - base * 1.35) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (!reduceMotion) requestAnimationFrame(drawVoice);
  };

  resizeCanvas();
  setMode('content', capabilityItems[0]);
  restartCycle();
  if (reduceMotion) drawVoice(400); else requestAnimationFrame(drawVoice);
  window.addEventListener('resize', resizeCanvas, { passive: true });

  // Scroll reveals, counters and section navigation
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .13, rootMargin: '0px 0px -5% 0px' });

  qsa('.reveal').forEach((element) => revealObserver.observe(element));

  const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const element = entry.target;
      const target = Number(element.dataset.count || 0);
      const suffix = element.dataset.suffix || '';
      const duration = reduceMotion ? 0 : 1500;
      const started = performance.now();
      const tick = (now) => {
        const progress = duration ? Math.min(1, (now - started) / duration) : 1;
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = `${Math.round(target * eased)}${suffix}`;
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      observer.unobserve(element);
    });
  }, { threshold: .7 });

  qsa('[data-count]').forEach((element) => counterObserver.observe(element));

  const dotLinks = qsa('.section-dots a');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      dotLinks.forEach((link) => link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`));
    });
  }, { threshold: .2, rootMargin: '-30% 0px -55% 0px' });

  qsa('[data-section]').forEach((section) => sectionObserver.observe(section));

  const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 28);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Project scroll story
  const projectVisual = qs('#projectVisual');
  const visualTitle = qs('#visualTitle');
  const visualNumber = qs('.visual-number');
  const projectChapters = qsa('.project-chapter');

  const activateProject = (chapter) => {
    projectChapters.forEach((item) => item.classList.toggle('is-active', item === chapter));
    if (projectVisual) projectVisual.dataset.project = chapter.dataset.project;
    if (visualTitle) visualTitle.textContent = chapter.dataset.visualTitle;
    if (visualNumber) visualNumber.textContent = chapter.dataset.number;
  };

  const projectObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) activateProject(visible.target);
  }, { threshold: [.35, .55, .7], rootMargin: '-16% 0px -28% 0px' });

  projectChapters.forEach((chapter) => projectObserver.observe(chapter));

  // Skill accordion
  qsa('.skill-item > button').forEach((button) => {
    button.addEventListener('click', () => {
      const item = button.closest('.skill-item');
      const shouldOpen = !item.classList.contains('is-open');
      qsa('.skill-item').forEach((other) => {
        const open = other === item && shouldOpen;
        other.classList.toggle('is-open', open);
        const otherButton = qs(':scope > button', other);
        otherButton?.setAttribute('aria-expanded', String(open));
        const icon = qs('i', otherButton);
        if (icon) icon.textContent = open ? '−' : '+';
      });
    });
  });

  // Draggable work gallery
  const gallery = qs('#workGallery');
  let dragging = false;
  let dragStartX = 0;
  let dragStartScroll = 0;
  let dragMoved = false;

  const scrollGallery = (direction) => {
    if (!gallery) return;
    const card = qs('.gallery-card', gallery);
    const amount = card ? card.getBoundingClientRect().width + 18 : gallery.clientWidth * .75;
    gallery.scrollBy({ left: direction * amount, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  qs('[data-gallery-prev]')?.addEventListener('click', () => scrollGallery(-1));
  qs('[data-gallery-next]')?.addEventListener('click', () => scrollGallery(1));

  if (gallery && finePointer) {
    gallery.addEventListener('pointerdown', (event) => {
      dragging = true;
      dragMoved = false;
      dragStartX = event.clientX;
      dragStartScroll = gallery.scrollLeft;
      gallery.classList.add('is-dragging');
      gallery.setPointerCapture(event.pointerId);
    });
    gallery.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const delta = event.clientX - dragStartX;
      if (Math.abs(delta) > 5) dragMoved = true;
      gallery.scrollLeft = dragStartScroll - delta;
    });
    const stopDrag = (event) => {
      if (!dragging) return;
      dragging = false;
      gallery.classList.remove('is-dragging');
      if (gallery.hasPointerCapture(event.pointerId)) gallery.releasePointerCapture(event.pointerId);
    };
    gallery.addEventListener('pointerup', stopDrag);
    gallery.addEventListener('pointercancel', stopDrag);
  }

  // Lightbox
  const lightbox = qs('#lightbox');
  const lightboxImage = qs('figure img', lightbox);
  const lightboxCaption = qs('figcaption', lightbox);
  const imageButtons = qsa('[data-image]');
  let currentImageIndex = 0;
  let lastFocused;

  const showImage = (index) => {
    if (!imageButtons.length || !lightboxImage) return;
    currentImageIndex = (index + imageButtons.length) % imageButtons.length;
    const source = imageButtons[currentImageIndex];
    lightboxImage.src = source.dataset.image;
    lightboxImage.alt = source.dataset.caption || '作品图片';
    if (lightboxCaption) lightboxCaption.textContent = source.dataset.caption || '';
  };

  const openLightbox = (source) => {
    if (!lightbox || dragMoved) return;
    lastFocused = source;
    const index = imageButtons.indexOf(source);
    showImage(index);
    lightbox.setAttribute('aria-hidden', 'false');
    body.classList.add('lightbox-open');
    qs('.lightbox-close', lightbox)?.focus();
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.setAttribute('aria-hidden', 'true');
    body.classList.remove('lightbox-open');
    if (lightboxImage) lightboxImage.src = '';
    lastFocused?.focus();
  };

  imageButtons.forEach((button) => button.addEventListener('click', () => openLightbox(button)));
  qs('.lightbox-close', lightbox)?.addEventListener('click', closeLightbox);
  qs('.lightbox-prev', lightbox)?.addEventListener('click', () => showImage(currentImageIndex - 1));
  qs('.lightbox-next', lightbox)?.addEventListener('click', () => showImage(currentImageIndex + 1));
  lightbox?.addEventListener('click', (event) => { if (event.target === lightbox) closeLightbox(); });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (body.classList.contains('lightbox-open')) closeLightbox();
      else if (body.classList.contains('menu-open')) setMenu(false);
    }
    if (!body.classList.contains('lightbox-open')) return;
    if (event.key === 'ArrowLeft') showImage(currentImageIndex - 1);
    if (event.key === 'ArrowRight') showImage(currentImageIndex + 1);
  });
})();
