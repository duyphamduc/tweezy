const mobileBtn = document.getElementById('mobile-cta')
nav = document.querySelector('nav')
mobileBtnExit = document.getElementById('mobile-exit');

mobileBtn.addEventListener('click', () => {
    nav.classList.add('menu-btn');
})

mobileBtnExit.addEventListener('click', () => {
    nav.classList.remove('menu-btn');
})

function myFunction(e) {
    var el = document.querySelector('.active');

    // Check if the element exists to avoid a null syntax error on the removal
    if (el) {
        el.classList.remove('active');
    }

    e.target.classList.add('active');
}