document.addEventListener('DOMContentLoaded', () => {
    const track = document.querySelector('.behavior-slider .slide-track');
    const slides = document.querySelectorAll('.behavior-card');
    const prevBtn = document.querySelector('.behavior-slider .slide-btn.prev');
    const nextBtn = document.querySelector('.behavior-slider .slide-btn.next');
    let currentIndex = 0;

    function updateSlider() {
        // 매번 카드 너비를 계산하여 창 크기 변화에 대응
        const width = slides[0].offsetWidth;
        track.style.transform = `translateX(-${currentIndex * width}px)`;
    }

    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
        } else {
            currentIndex = slides.length - 1; // 첫 카드에서 이전 → 마지막 카드
        }
        updateSlider();
    });

    nextBtn.addEventListener('click', () => {
        if (currentIndex < slides.length - 1) {
            currentIndex++;
        } else {
            currentIndex = 0; // 마지막 카드에서 다음 → 첫 카드
        }
        updateSlider();
    });

    // 창 크기 변경 시 슬라이드 위치 재계산
    window.addEventListener('resize', updateSlider);

    // 초기 위치
    updateSlider();
});
