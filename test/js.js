const $img = document.querySelector("img")
const $button = document.querySelector("button")
const $container = document.querySelector(".container")
const $iframe = document.querySelector("iframe")
const $menu = document.querySelector(".menu")

function random() {
    fetch("./obabchu/asset/data.json")
        .then((res) => res.json())
        .then((data) => {
            let random = Math.floor(Math.random() * data.length)
            const item = data[random]


            $container.innerHTML = ""

            if (item.menu_items.length == 0) {
                random = Math.floor(Math.random() * data.length)
            }

            if (item.category == "한식") {
                $img.src = "./img/한식.webp"
            } else if (item.category == "중식") {
                $img.src = "./img/중식.jpg"
            } else if (item.category == "일식") {
                $img.src = "./img/일식.jpg"
            } else if (item.category == "양식") {
                $img.src = "./img/양식.jpg"
            } else if (item.category == "분식") {
                $img.src = "./img/분식.webp"
            } else if (item.category == "주점") {
                $img.src = "./img/주점.jpg"
            } else if (item.category == "카페/디저트") {
                $img.src = "./img/카페.jpg"
            } else if (item.category == "치킨") {
                $img.src = "./img/치킨.jpg"
            }

            $menu.innerHTML = ""

            if (item.menu_items.length != 0) {
                item.menu_items.forEach(menu => {
                    $menu.innerHTML += `
                    <div class="menu-item">
                        <h3>${menu.name}</h3>
                        <p>${menu.price}</p>
                        </div>
                    `
                })
            } else {
                $menu.innerHTML = "<h1>메뉴가 없습니다.</h1>"
            }

            $container.innerHTML = `
                <div class="card">
                    <h2>${item.restaurant_name}</h2>
                    <p>${item.category}</p>
                    <p>${item.address}</p>
                    <p>${item.overall_rating}</p>
                    <p>${item.phone_number == null ? "전화번호 없음" : item.phone_number}</p>
                    <p><a href="${item.kakao_map_url}">${item.kakao_map_url}</a></p>
                </div>
            `



            navigator.geolocation.getCurrentPosition((position) => {

                $container.innerHTML =
                    `
                    <iframe src="https://map.kakao.com/link/from/내위치,${position.coords.latitude},${position.coords.longitude}/to/${item.restaurant_name},${item.location.latitude},${item.location.longitude}" frameborder="0" width="100%" height="500px"></iframe>
                `

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

            });


            $iframe.src = item.kakao_map_url



        })
}


