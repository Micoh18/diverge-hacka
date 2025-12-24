document.querySelectorAll('.flip-card').forEach(card => {
    const closeBtn = card.querySelector('.flip-card-close');
    const backContent = card.querySelector('.flip-card-back');

    const resetAnimations = () => {
        if (backContent) {
            const animatedElements = backContent.querySelectorAll(
                '.flip-card-back-header, .flip-card-back-divider, .flip-card-description-text, .flip-card-quote, .flip-card-close'
            );
            animatedElements.forEach(el => {
                el.style.animation = 'none';
                void el.offsetHeight;
                el.style.animation = null;
            });
        }
    };

    card.addEventListener('click', (e) => {
        if (closeBtn && (e.target === closeBtn || closeBtn.contains(e.target))) {
            card.classList.remove('is-flipped');
        } else {
            const wasFlipped = card.classList.contains('is-flipped');
            card.classList.toggle('is-flipped');

            if (!wasFlipped) {
                setTimeout(resetAnimations, 50);
            }
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            card.classList.remove('is-flipped');
        });
    }
});
