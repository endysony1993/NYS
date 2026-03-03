(function () {
  // Reveal on scroll
  var observer;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('.reveal').forEach(function (el) {
      if (!el.classList.contains('reveal-visible')) {
        observer.observe(el);
      }
    });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.add('reveal-visible');
    });
  }

  // Navbar scroll behavior
  var navbar = document.getElementById('navbar');
  var hero = document.querySelector('.hero');
  var heroHeight = hero ? hero.offsetHeight : 0;

  function updateNavbarState() {
    if (!navbar || !hero) return;
    if (window.scrollY > heroHeight - 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  function recalcHeroHeight() {
    if (!hero) return;
    heroHeight = hero.offsetHeight;
    updateNavbarState();
  }

  recalcHeroHeight();
  window.addEventListener('scroll', updateNavbarState);
  window.addEventListener('resize', recalcHeroHeight);

  // Mobile nav & submenu toggles
  if (navbar) {
    var navToggle = navbar.querySelector('.nav-toggle');
    var navList = navbar.querySelector('.nav-list');
    var submenuToggles = navbar.querySelectorAll('.submenu-toggle');

    if (navToggle && navList) {
      navToggle.addEventListener('click', function () {
        var isOpen = navbar.classList.toggle('nav-open');
        navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      // Close menu after clicking a link (useful on mobile)
      navList.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          navbar.classList.remove('nav-open');
          navToggle.setAttribute('aria-expanded', 'false');

          navbar.querySelectorAll('.nav-item-has-submenu.open').forEach(function (item) {
            item.classList.remove('open');
            var btn = item.querySelector('.submenu-toggle');
            if (btn) {
              btn.setAttribute('aria-expanded', 'false');
            }
          });
        });
      });
    }

    submenuToggles.forEach(function (btn) {
      btn.addEventListener('click', function (event) {
        // Only toggle via JS on small screens; on desktop hover handles it
        if (window.innerWidth > 768) {
          return;
        }

        event.preventDefault();
        var item = btn.closest('.nav-item-has-submenu');
        if (!item) return;

        var isOpen = item.classList.toggle('open');
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    });
  }
})();
