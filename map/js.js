const $img = document.querySelector("img");
const $button = document.querySelector("button");
const $container = document.querySelector(".restaurant-info");
const $map = document.querySelector(".map");
const $menu = document.querySelector(".menu-list");
const $money = document.querySelector(".money");
const $input = document.querySelector(".type");

console.log($map);

function setImageByCategory(category) {
    const categoryMap = {
        "한식": "./img/한식.webp",
        "중식": "./img/중식.jpg",
        "일식": "./img/일식.jpg",
        "양식": "./img/양식.jpg",
        "분식": "./img/분식.webp",
        "주점": "./img/주점.jpg",
        "카페/디저트": "./img/카페.jpg",
        "치킨": "./img/치킨.jpg"
    };
    $img.src = categoryMap[category] || "";
}

function setMenu(menuItems) {
    $menu.innerHTML = "";
    if (menuItems.length !== 0) {
        menuItems.forEach(menu => {
            $menu.innerHTML += `
                <div class="menu-item">
                    <h3>${menu.name}</h3>
                    <p>${menu.price}</p>
                </div>
            `;
        });
    } else {
        $menu.innerHTML = "<h1>메뉴가 없습니다.</h1>";
    }
}

function setContainer(item) {
    $container.innerHTML = `
            <h2>${item.restaurant_name}</h2>
            <p>${item.category}</p>
            <p>${item.address}</p>
            <p>${item.phone_number == null ? "전화번호 없음" : item.phone_number}</p>
            <p><a href="${item.kakao_map_url}">가게 링크</a></p>
    `;

    $container.innerHTML += `<p>별점: ${item.overall_rating}</p>`;

    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(item.overall_rating)) {
            $container.innerHTML += `<i class="fa fa-star"></i>`;
        }
        else if (i === Math.ceil(item.overall_rating) && (item.overall_rating % 1) >= 0.5) {
            $container.innerHTML += `<i class="fa-solid fa-star-half-stroke"></i>`;
        }
        else {
            $container.innerHTML += `<i class="fa-regular fa-star"></i>`;
        }
    }




}



function setMap(item) {
    if (!item.location) return;
    navigator.geolocation.getCurrentPosition((position) => {
        $map.src = `https://map.kakao.com/link/from/내위치,${position.coords.latitude},${position.coords.longitude}/to/${item.restaurant_name},${item.location.latitude},${item.location.longitude}`;
        if (window.kakao && window.kakao.maps) {
            var mapContainer = document.getElementById('map'),
                mapOption = {
                    center: new kakao.maps.LatLng(item.location.latitude, item.location.longitude),
                    level: 3
                };
            var map = new kakao.maps.Map(mapContainer, mapOption);
            var markerPosition = new kakao.maps.LatLng(item.location.latitude, item.location.longitude);
            var marker = new kakao.maps.Marker({
                position: markerPosition
            });
            marker.setMap(map);
        }
    });
}

function random() {
    fetch("../asset/data.json")
        .then((res) => res.json())
        .then((data) => {
            let randomIdx = Math.floor(Math.random() * data.length);
            let item = data[randomIdx];
            while (item.menu_items.length === 0) {
                randomIdx = Math.floor(Math.random() * data.length);
                item = data[randomIdx];
            }
            setImageByCategory(item.category);
            setMenu(item.menu_items);
            setContainer(item);
            setMap(item);
        });
}

function select() {
    if (!$input.value || !$money.value) {
        alert("카테고리와 예산을 입력해주세요.")
        return false
    };

    fetch("../asset/data.json")
        .then((res) => res.json())
        .then((data) => {
            const filtered = data.filter(item => item.category === $input.value && item.menu_items.length > 0);
            if (filtered.length === 0) {
                $container.innerHTML = '<h2>해당 카테고리의 식당이 없습니다.</h2>';
                $menu.innerHTML = '';
                $img.src = '';
                $map.src = '';
                return;
            }

            const affordable = filtered.filter(item =>
                item.menu_items.some(e => parseInt(e.price.replace(/[^0-9]/g, "")) <= $money.value)
            );

            if (affordable.length === 0) {
                $container.innerHTML = '<h2>해당 가격에 맞는 메뉴가 없습니다.</h2>';
                $menu.innerHTML = '';
                $img.src = '';
                $map.src = '';
                return;
            }
            const item = affordable[Math.floor(Math.random() * affordable.length)];
            setImageByCategory(item.category);
            setMenu(item.menu_items.filter(e => parseInt(e.price.replace(/[^0-9]/g, "")) <= $money.value));
            setContainer(item);
            setMap(item);
        });
}
