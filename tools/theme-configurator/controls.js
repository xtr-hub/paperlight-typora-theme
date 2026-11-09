/* Native controls keep their semantics; this layer only coordinates presentation. */
(() => {
  const ranges = [...document.querySelectorAll('input[type="range"]')];
  function sync() {
    for (const input of ranges) {
      const min = Number(input.min || 0);
      const max = Number(input.max || 100);
      const progress = max === min ? 0 : (Number(input.value) - min) / (max - min) * 100;
      input.style.setProperty('--range-progress', `${progress}%`);
      const label = input.closest('.range-row');
      const caption = label?.querySelector('.range-label > span');
      if (caption) input.setAttribute('aria-label', caption.textContent.trim());
      const unit = label?.querySelector('.range-unit')?.textContent.trim() || '';
      input.setAttribute('aria-valuetext', `${input.value}${unit ? ' ' + unit : ''}`);
    }
    document.querySelectorAll('.theme-btn').forEach(button => {
      button.setAttribute('aria-pressed', String(button.classList.contains('active')));
    });
  }
  for (const input of ranges) {
    input.addEventListener('input', sync);
    input.addEventListener('pointerdown', () => input.classList.add('is-dragging'));
    input.addEventListener('change', () => input.classList.remove('is-dragging'));
  }
  const endDrag = () => ranges.forEach(input => input.classList.remove('is-dragging'));
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  window.addEventListener('blur', endDrag);
  // Prevent motion on first paint; later programmatic preset changes can animate.
  ranges.forEach(input => { input.style.transition = 'none'; });
  sync();
  requestAnimationFrame(() => requestAnimationFrame(() => ranges.forEach(input => input.style.removeProperty('transition'))));
  window.PaperlightUI = { sync };
})();
