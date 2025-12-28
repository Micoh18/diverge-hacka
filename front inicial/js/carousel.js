const carouselContainer = document.querySelector('.team-grid-cards');
const leftArrow = document.querySelector('.carousel-arrow-left');
const rightArrow = document.querySelector('.carousel-arrow-right');

if (carouselContainer && leftArrow && rightArrow) {
    const updateArrows = () => {
        const scrollLeft = carouselContainer.scrollLeft;
        const scrollWidth = carouselContainer.scrollWidth;
        const clientWidth = carouselContainer.clientWidth;
        const maxScroll = scrollWidth - clientWidth;

        if (scrollLeft <= 10) {
            leftArrow.style.opacity = '0.3';
            leftArrow.disabled = true;
        } else {
            leftArrow.style.opacity = '1';
            leftArrow.disabled = false;
        }

        if (scrollLeft >= maxScroll - 10) {
            rightArrow.style.opacity = '0.3';
            rightArrow.disabled = true;
        } else {
            rightArrow.style.opacity = '1';
            rightArrow.disabled = false;
        }
    };

    leftArrow.addEventListener('click', () => {
        const firstCard = carouselContainer.querySelector('.flip-card');
        if (!firstCard) return;
        const cardWidth = firstCard.offsetWidth;
        const gap = 16;
        const scrollAmount = cardWidth + gap;

        carouselContainer.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
    });

    rightArrow.addEventListener('click', () => {
        const firstCard = carouselContainer.querySelector('.flip-card');
        if (!firstCard) return;
        const cardWidth = firstCard.offsetWidth;
        const gap = 16;
        const scrollAmount = cardWidth + gap;

        carouselContainer.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    });

    carouselContainer.addEventListener('scroll', updateArrows);

    setTimeout(updateArrows, 100);

    window.addEventListener('resize', () => {
        setTimeout(updateArrows, 100);
    });

    setTimeout(updateArrows, 2000);
}
