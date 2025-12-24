const nav = document.getElementById('main-nav');
const header = document.querySelector('header');

// Navigation scroll effect
if (nav && header) {
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        const headerHeight = header.offsetHeight;

        if (currentScroll > headerHeight * 0.5) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });
}

// Mobile menu toggle
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuToggle && navLinks && nav) {
    const toggleMenu = (isOpen) => {
        if (isOpen) {
            navLinks.classList.add('active');
            document.body.classList.add('nav-open');
            mobileMenuToggle.textContent = '✕';
        } else {
            navLinks.classList.remove('active');
            document.body.classList.remove('nav-open');
            mobileMenuToggle.textContent = '☰';
        }
    };

    mobileMenuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = navLinks.classList.contains('active');
        toggleMenu(!isActive);
    });

    // Close menu when clicking a link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            toggleMenu(false);
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!nav.contains(e.target) && navLinks.classList.contains('active')) {
            toggleMenu(false);
        }
    });

    // Prevent body scroll when menu is open
    navLinks.addEventListener('touchmove', (e) => {
        if (navLinks.classList.contains('active')) {
            e.stopPropagation();
        }
    }, { passive: false });
}
