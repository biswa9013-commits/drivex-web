(function () {
    "use strict";

    function addBookButtons() {
        document.querySelectorAll(".car-card, .deal-card").forEach(function (card) {
            if (card.querySelector(".booking-now")) {
                return;
            }

            var title = card.querySelector("h3");
            var price = card.querySelector(".price b, p b");
            if (!title || !price) {
                return;
            }

            var dailyPrice = Number(price.textContent.replace(/[^\d]/g, ""));
            if (!Number.isFinite(dailyPrice) || dailyPrice <= 0) {
                return;
            }

            var button = document.createElement("button");
            button.type = "button";
            button.className = "booking-now";
            button.textContent = "Book Now";
            button.addEventListener("click", function () {
                window.DriveX.openBooking(title.textContent.trim(), dailyPrice);
            });
            card.appendChild(button);
        });
    }

    addBookButtons();
    window.DriveX.resumeBooking();
}());
