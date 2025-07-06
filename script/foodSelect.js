const btns = [...document.querySelectorAll('.selector-buttons button')];
const activeBtn = document.querySelector('.action-btn-container button');
btns.forEach(btn => {
    btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const food = btn.getAttribute('data-type');
        const foodImage = document.querySelector('.food-image-container img');
        foodImage.src = `../images/${food}.png`;
        foodImage.alt = `${food} image`;
        activeBtn.innerHTML = `
            <span>${food.toUpperCase()}</span>
            <small>recommend it at ${food.toUpperCase()}</small>`;


    });
});