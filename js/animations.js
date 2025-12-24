// Animate cards when section enters viewport
const teamSection = document.querySelector('.team-grid-section');
if (teamSection) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    observer.observe(teamSection);
}

