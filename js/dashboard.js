(function () {
    "use strict";

    var view = document.getElementById("dashboard-view");
    var user = window.DriveX.currentUser();
    var statuses = ["Pending", "Confirmed", "In progress", "Completed", "Cancelled"];

    if (!user) {
        try {
            sessionStorage.setItem("drivex_show_login", "true");
        } catch (error) {
            console.error("Could not remember the login request:", error);
        }
        window.location.href = "home.html";
        return;
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, function (character) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[character];
        });
    }

    function money(value) {
        return "₹" + Number(value).toLocaleString("en-IN");
    }

    function createStatusOptions(selected) {
        return statuses.map(function (status) {
            return '<option value="' + status + '"' + (status === selected ? " selected" : "") + ">" + status + "</option>";
        }).join("");
    }

    function render() {
        var bookings = window.DriveX.readBookings();
        if (!Array.isArray(bookings)) {
            bookings = [];
        }

        if (user.role === "admin") {
            renderAdmin(bookings);
        } else {
            renderUser(bookings.filter(function (booking) {
                return booking.userEmail === user.email;
            }));
        }
    }

    function renderAdmin(bookings) {
        document.getElementById("dashboard-back-link").hidden = true;
        var activeBookings = bookings.filter(function (booking) {
            return booking.status !== "Cancelled";
        });
        var totalPrice = activeBookings.reduce(function (sum, booking) {
            return sum + Number(booking.total || 0);
        }, 0);
        var rows = bookings.map(function (booking) {
            return "<tr>" +
                "<td>" + escapeHtml(booking.id) + "</td>" +
                "<td>" + escapeHtml(booking.userName) + "<br>" + escapeHtml(booking.userEmail) + "</td>" +
                "<td>" + escapeHtml(booking.car) + "</td>" +
                "<td>" + escapeHtml(booking.startDate) + " to " + escapeHtml(booking.endDate) + "</td>" +
                "<td>" + money(booking.total) + "</td>" +
                '<td><select class="booking-status" data-booking-id="' + escapeHtml(booking.id) + '">' +
                    createStatusOptions(booking.status || "Pending") +
                "</select></td></tr>";
        }).join("");

        view.innerHTML =
            "<h2>Admin Dashboard</h2>" +
            "<p>Review customer bookings and update their status.</p>" +
            '<section class="dashboard-summary">' +
                "<article>Total bookings<strong>" + bookings.length + "</strong></article>" +
                "<article>Active booking value<strong>" + money(totalPrice) + "</strong></article>" +
                "<article>Pending bookings<strong>" + bookings.filter(function (booking) { return booking.status === "Pending"; }).length + "</strong></article>" +
            "</section>" +
            (bookings.length ? '<div class="dashboard-table-wrap"><table class="dashboard-table"><thead><tr>' +
                "<th>Booking ID</th><th>Customer</th><th>Car</th><th>Dates</th><th>Total price</th><th>Status</th>" +
                "</tr></thead><tbody>" + rows + "</tbody></table></div>" :
                '<p class="dashboard-empty">No bookings have been made yet.</p>');

        view.querySelectorAll(".booking-status").forEach(function (select) {
            select.addEventListener("change", function () {
                var latestBookings = window.DriveX.readBookings();
                var booking = latestBookings.find(function (item) {
                    return item.id === select.getAttribute("data-booking-id");
                });
                if (!booking) {
                    window.DriveX.showNotice("This booking could not be found. Refresh and try again.");
                    render();
                    return;
                }
                booking.status = select.value;
                try {
                    window.DriveX.saveBookings(latestBookings);
                    render();
                } catch (error) {
                    console.error("Could not update booking status:", error);
                    window.DriveX.showNotice("Could not save the status. Please try again.");
                }
            });
        });
    }

    function renderUser(bookings) {
        var rows = bookings.map(function (booking) {
            var cancelAction = booking.status === "Pending" ?
                '<button type="button" class="cancel-booking" data-booking-id="' + escapeHtml(booking.id) + '">Cancel</button>' :
                "—";
            return "<tr>" +
                "<td>" + escapeHtml(booking.id) + "</td>" +
                "<td>" + escapeHtml(booking.car) + "</td>" +
                "<td>" + escapeHtml(booking.startDate) + " to " + escapeHtml(booking.endDate) + "</td>" +
                "<td>" + booking.days + "</td>" +
                "<td>" + money(booking.total) + "</td>" +
                "<td>" + escapeHtml(booking.status || "Pending") + "</td>" +
                "<td>" + cancelAction + "</td></tr>";
        }).join("");

        view.innerHTML =
            '<h2 id="cart">My Cart &amp; Bookings</h2>' +
            "<p>Hi " + escapeHtml(user.name) + ", check your car bookings and their latest status here.</p>" +
            (bookings.length ? '<div class="dashboard-table-wrap"><table class="dashboard-table"><thead><tr>' +
                "<th>Booking ID</th><th>Car</th><th>Dates</th><th>Days</th><th>Total price</th><th>Status</th><th>Action</th>" +
                "</tr></thead><tbody>" + rows + "</tbody></table></div>" :
                '<p class="dashboard-empty">Your cart is empty. Choose a car and select Book Now to get started.</p><br><a class="dashboard-back" href="service.html">Browse cars →</a>');

        view.querySelectorAll(".cancel-booking").forEach(function (button) {
            button.addEventListener("click", function () {
                var latestBookings = window.DriveX.readBookings();
                var booking = latestBookings.find(function (item) {
                    return item.id === button.getAttribute("data-booking-id") &&
                        item.userEmail === user.email;
                });
                if (!booking || booking.status !== "Pending") {
                    window.DriveX.showNotice("Only pending bookings can be cancelled by you.");
                    render();
                    return;
                }
                booking.status = "Cancelled";
                try {
                    window.DriveX.saveBookings(latestBookings);
                    render();
                } catch (error) {
                    console.error("Could not cancel booking:", error);
                    window.DriveX.showNotice("Could not cancel the booking. Please try again.");
                }
            });
        });
    }

    window.addEventListener("storage", function (event) {
        if (event.key === "drivex_bookings") {
            render();
        } else if (event.key === "drivex_session") {
            user = window.DriveX.currentUser();
            if (!user) {
                sessionStorage.setItem("drivex_show_login", "true");
                window.location.href = "home.html";
                return;
            }
            render();
        }
    });

    render();
}());
