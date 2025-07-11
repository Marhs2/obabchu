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
        if (food == "random") {
            activeBtn.innerHTML = `
                <span>Random</span>
                <small><a href="../map/map.html">recommend it at Random</a></small>`;

        } else {
            activeBtn.innerHTML = `
                <span>MENU</span>
                <small><a href="../map/mapSelect.html">recommend it at MENU</a></small>`;
        }
    })
})