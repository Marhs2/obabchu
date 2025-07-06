fetch("./asset/data.json")
    .then((res) => res.json())
    .then((data) => {
        data.forEach((e) => {
            if (e.category == "한식") {
                console.log(e);
            }
        })
    })
    .catch((err) => {
        console.log(err);
    });