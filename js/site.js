const menuButton = document.querySelector('.menu-button');
const siteNav = document.querySelector('#site-nav');

if (menuButton && siteNav) {
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    siteNav.classList.toggle('is-open', !isOpen);
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menuButton.setAttribute('aria-expanded', 'false');
      siteNav.classList.remove('is-open');
    });
  });
}

const filterButtons = document.querySelectorAll('[data-publication-filter]');
const publicationItems = document.querySelectorAll('[data-publication-period]');

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const selectedFilter = button.dataset.publicationFilter;

    filterButtons.forEach((candidate) => {
      const isSelected = candidate === button;
      candidate.classList.toggle('is-active', isSelected);
      candidate.setAttribute('aria-pressed', String(isSelected));
    });

    publicationItems.forEach((item) => {
      item.hidden = selectedFilter !== 'all' && item.dataset.publicationPeriod !== selectedFilter;
    });
  });
});

const currentYear = document.querySelector('#current-year');
if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}
