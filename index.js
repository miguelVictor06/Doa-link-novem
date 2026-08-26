
window.addEventListener('scroll', () => {
    const elementoCabecalho = document.getElementById('main-header');
    
    if (window.scrollY > 10) {
        elementoCabecalho.classList.add('shadow-[0_2px_8px_rgba(0,0,0,0.05)]');
    } else {
        elementoCabecalho.classList.remove('shadow-[0_2px_8px_rgba(0,0,0,0.05)]');
    }
});