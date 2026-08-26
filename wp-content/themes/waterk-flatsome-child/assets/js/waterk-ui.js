(() => {
  document.documentElement.classList.add('wk-js');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const enhanceWooCards = () => {
    document.querySelectorAll('.woocommerce ul.products li.product').forEach((card) => {
      card.classList.add('wk-reveal');
    });
  };

  const initReveal = () => {
    const items = document.querySelectorAll('.wk-reveal:not(.is-visible)');
    if (!items.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    items.forEach((item) => observer.observe(item));
  };

  const initFaq = () => {
    document.querySelectorAll('.wk-faq details').forEach((item) => {
      item.addEventListener('toggle', () => {
        if (!item.open) return;
        item.parentElement.querySelectorAll('details[open]').forEach((other) => {
          if (other !== item) other.open = false;
        });
      });
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    enhanceWooCards();
    initReveal();
    initFaq();
  });
})();
