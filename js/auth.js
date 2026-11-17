(function () {
    "use strict";

    var USERS_KEY = "drivex_users";
    var BOOKINGS_KEY = "drivex_bookings";
    var SESSION_KEY = "drivex_session";
    var ADMIN_EMAIL = "biswa129564@gmail.com";
    var ADMIN_PASSWORD = "123456";
    var currentUser = readData(SESSION_KEY, null);
    var modal;
    var toastTimer;

    function readData(key, fallback) {
        try {
            var value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            console.error("Could not read DriveX data:", error);
            return fallback;
        }
    }

    function writeData(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function createAccountButton(label, action, primary) {
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        if (primary) {
            button.className = "account-primary";
        }
        button.addEventListener("click", function (event) {
            event.stopPropagation();
            action();
        });
        return button;
    }

    function updateHeader() {
        var accountLinks = document.getElementById("account-links");
        if (!accountLinks) {
            return;
        }

        accountLinks.textContent = "";
        if (currentUser) {
            if (currentUser.role === "user") {
                var cartLink = document.createElement("a");
                cartLink.href = "dashboard.html#cart";
                cartLink.textContent = "My Cart";
                accountLinks.appendChild(cartLink);
            } else {
                var dashboardLink = document.createElement("a");
                dashboardLink.href = "dashboard.html";
                dashboardLink.textContent = "Admin Dashboard";
                accountLinks.appendChild(dashboardLink);
            }

            accountLinks.appendChild(createAccountButton("Log out", logout, false));
        } else {
            accountLinks.appendChild(createAccountButton("Login", function () {
                openAuthModal("login");
            }, false));
            accountLinks.appendChild(createAccountButton("Register", function () {
                openAuthModal("register");
            }, true));
        }
    }

    function createModal() {
        if (modal) {
            return modal;
        }

        modal = document.createElement("div");
        modal.className = "drivex-modal-backdrop";
        modal.id = "drivex-modal-backdrop";
        modal.hidden = true;
        modal.innerHTML =
            '<section class="drivex-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
                '<button class="drivex-modal-close" type="button" aria-label="Close dialog">&times;</button>' +
                '<div id="auth-forms">' +
                    '<div id="login-panel">' +
                        '<h2 id="modal-title">Welcome back</h2>' +
                        '<p>Log in to book a car and manage your rentals.</p>' +
                        '<form id="login-form">' +
                            '<label>Email address<input name="email" type="email" autocomplete="username" required></label>' +
                            '<label>Password<input name="password" type="password" autocomplete="current-password" required></label>' +
                            '<button class="account-submit" type="submit">Login</button>' +
                        '</form>' +
                        '<p class="account-switch">New to DriveX? <button type="button" data-mode="register">Create an account</button></p>' +
                    '</div>' +
                    '<div id="register-panel" hidden>' +
                        '<h2>Create your account</h2>' +
                        '<p>Register to start booking with DriveX.</p>' +
                        '<form id="register-form">' +
                            '<label>Full name<input name="name" type="text" autocomplete="name" required></label>' +
                            '<label>Email address<input name="email" type="email" autocomplete="email" required></label>' +
                            '<label>Password<input name="password" type="password" minlength="6" autocomplete="new-password" required></label>' +
                            '<button class="account-submit" type="submit">Register</button>' +
                        '</form>' +
                        '<p class="account-switch">Already registered? <button type="button" data-mode="login">Login</button></p>' +
                    '</div>' +
                '</div>' +
                '<div id="booking-panel" hidden>' +
                    '<h2 id="booking-title">Book your car</h2>' +
                    '<p id="booking-price"></p>' +
                    '<form id="booking-form">' +
                        '<label>Pickup date<input name="startDate" type="date" required></label>' +
                        '<label>Return date<input name="endDate" type="date" required></label>' +
                        '<button class="account-submit" type="submit">Add booking to My Cart</button>' +
                    '</form>' +
                '</div>' +
                '<p class="account-error" id="account-error" role="alert"></p>' +
            '</section>';
        document.body.appendChild(modal);

        modal.querySelector(".drivex-modal-close").addEventListener("click", closeModal);
        modal.addEventListener("click", function (event) {
            if (event.target === modal) {
                closeModal();
            }
        });
        modal.querySelectorAll("[data-mode]").forEach(function (button) {
            button.addEventListener("click", function () {
                setAuthMode(button.getAttribute("data-mode"));
            });
        });
        modal.querySelector("#login-form").addEventListener("submit", login);
        modal.querySelector("#register-form").addEventListener("submit", register);
        modal.querySelector("#booking-form").addEventListener("submit", saveBooking);
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && !modal.hidden) {
                closeModal();
            }
        });
        return modal;
    }

    function showModal() {
        createModal();
        modal.hidden = false;
        document.body.style.overflow = "hidden";
    }

    function closeModal(preservePendingBooking) {
        if (!modal) {
            return;
        }
        modal.hidden = true;
        document.body.style.overflow = "";
        var pending = sessionStorage.getItem("drivex_pending_booking");
        if (pending && !preservePendingBooking) {
            sessionStorage.removeItem("drivex_pending_booking");
        }
        if (!preservePendingBooking) {
            sessionStorage.removeItem("drivex_return_to");
        }
    }

    function setError(message) {
        if (modal) {
            modal.querySelector("#account-error").textContent = message || "";
        }
    }

    function setAuthMode(mode) {
        createModal();
        modal.querySelector("#auth-forms").hidden = false;
        modal.querySelector("#booking-panel").hidden = true;
        modal.querySelector("#login-panel").hidden = mode !== "login";
        modal.querySelector("#register-panel").hidden = mode !== "register";
        setError("");
        showModal();
        var input = modal.querySelector(mode === "login" ? '#login-form input[name="email"]' : '#register-form input[name="name"]');
        input.focus();
    }

    function openAuthModal(mode) {
        setAuthMode(mode || "login");
    }

    function completeLogin(user) {
        try {
            writeData(SESSION_KEY, user);
        } catch (error) {
            console.error("Could not save your DriveX login:", error);
            setError("Could not sign you in using this browser. Check browser storage and try again.");
            return;
        }
        currentUser = user;
        updateHeader();
        closeModal(true);

        var pendingBooking = sessionStorage.getItem("drivex_pending_booking");
        var currentPage = window.location.pathname.split("/").pop() || "home.html";
        var returnTo = sessionStorage.getItem("drivex_return_to");
        if (user.role === "admin") {
            sessionStorage.removeItem("drivex_pending_booking");
            sessionStorage.removeItem("drivex_return_to");
            window.location.href = "dashboard.html";
            return;
        }
        if (pendingBooking) {
            sessionStorage.removeItem("drivex_return_to");
            if (currentPage !== "home.html") {
                window.location.href = "home.html";
                return;
            }
        } else if (returnTo) {
            sessionStorage.removeItem("drivex_return_to");
            window.location.href = returnTo;
            return;
        } else if (currentPage !== "home.html") {
            window.location.href = "home.html";
            return;
        }
        if (pendingBooking && window.DriveX && window.DriveX.resumeBooking) {
            window.DriveX.resumeBooking();
        }
    }

    function login(event) {
        event.preventDefault();
        setError("");
        var form = event.currentTarget;
        var email = form.elements.email.value.trim().toLowerCase();
        var password = form.elements.password.value;

        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            completeLogin({ name: "DriveX Admin", email: ADMIN_EMAIL, role: "admin" });
            return;
        }

        var users = readData(USERS_KEY, []);
        var user = users.find(function (item) {
            return item.email === email && item.password === password;
        });
        if (!user) {
            setError("Email or password is incorrect.");
            return;
        }
        completeLogin({ name: user.name, email: user.email, role: "user" });
    }

    function register(event) {
        event.preventDefault();
        setError("");
        var form = event.currentTarget;
        var name = form.elements.name.value.trim();
        var email = form.elements.email.value.trim().toLowerCase();
        var password = form.elements.password.value;

        if (email === ADMIN_EMAIL) {
            setError("This email is reserved for the administrator.");
            return;
        }
        var users = readData(USERS_KEY, []);
        if (users.some(function (user) { return user.email === email; })) {
            setError("An account with this email already exists.");
            return;
        }

        users.push({ name: name, email: email, password: password });
        try {
            writeData(USERS_KEY, users);
        } catch (error) {
            console.error("Could not save your DriveX account:", error);
            setError("Your account could not be saved in this browser.");
            return;
        }
        completeLogin({ name: name, email: email, role: "user" });
    }

    function logout() {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem("drivex_pending_booking");
        sessionStorage.removeItem("drivex_return_to");
        sessionStorage.removeItem("drivex_show_login");
        currentUser = null;
        updateHeader();
        window.location.href = "home.html";
    }

    function currentPage() {
        return window.location.pathname.split("/").pop() || "home.html";
    }

    function enforceRoleAccess() {
        if (currentUser && currentUser.role === "admin" && currentPage() !== "dashboard.html") {
            document.body.style.display = "none";
            window.location.replace("dashboard.html");
        }
    }

    function gatePageActions() {
        document.addEventListener("click", function (event) {
            if (currentUser) {
                return;
            }
            var target = event.target.closest("a, button");
            if (!target || target.closest("#account-links, #drivex-modal-backdrop") ||
                target.classList.contains("booking-now")) {
                return;
            }

            if (target.tagName === "A") {
                var destination = new URL(target.href, window.location.href);
                if (destination.origin !== window.location.origin) {
                    return;
                }
                event.preventDefault();
                try {
                    sessionStorage.setItem("drivex_return_to", destination.href);
                } catch (error) {
                    console.error("Could not save the requested page:", error);
                }
            } else if (target.type === "submit") {
                event.preventDefault();
                try {
                    sessionStorage.setItem("drivex_return_to", window.location.href);
                } catch (error) {
                    console.error("Could not save the requested page:", error);
                }
            }
            openAuthModal("login");
        });

        document.addEventListener("submit", function (event) {
            if (currentUser || event.target.closest("#drivex-modal-backdrop")) {
                return;
            }
            event.preventDefault();
            try {
                sessionStorage.setItem("drivex_return_to", window.location.href);
            } catch (error) {
                console.error("Could not save the requested page:", error);
            }
            openAuthModal("login");
        });
    }

    function showNotice(message) {
        var notice = document.getElementById("drivex-toast");
        if (!notice) {
            notice = document.createElement("div");
            notice.className = "account-notice";
            notice.id = "drivex-toast";
            notice.setAttribute("role", "status");
            notice.setAttribute("aria-live", "polite");
            document.body.appendChild(notice);
        }
        notice.textContent = message;
        notice.hidden = false;
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () {
            notice.hidden = true;
        }, 4000);
    }

    function openBooking(carName, dailyPrice) {
        if (!currentUser) {
            try {
                sessionStorage.setItem("drivex_pending_booking", JSON.stringify({
                    car: carName,
                    price: Number(dailyPrice)
                }));
            } catch (error) {
                console.error("Could not save the pending booking:", error);
                showNotice("Could not start booking. Please allow browser storage and try again.");
            }
            openAuthModal("login");
            return;
        }
        if (currentUser.role !== "user") {
            showNotice("Admin accounts cannot create customer bookings.");
            return;
        }

        createModal();
        modal.querySelector("#auth-forms").hidden = true;
        modal.querySelector("#booking-panel").hidden = false;
        modal.querySelector("#booking-title").textContent = "Book " + carName;
        modal.querySelector("#booking-price").textContent = "₹" + Number(dailyPrice).toLocaleString("en-IN") + " per day";
        modal.querySelector("#account-error").textContent = "";
        modal.dataset.car = carName;
        modal.dataset.price = String(Number(dailyPrice));

        var today = new Date();
        var tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        var dayAfter = new Date(today);
        dayAfter.setDate(today.getDate() + 2);
        var toDate = function (date) {
            return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
        };
        var startInput = modal.querySelector('[name="startDate"]');
        var endInput = modal.querySelector('[name="endDate"]');
        startInput.min = toDate(today);
        startInput.value = toDate(tomorrow);
        endInput.min = toDate(tomorrow);
        endInput.value = toDate(dayAfter);
        startInput.onchange = function () {
            var nextDate = new Date(startInput.value + "T00:00:00");
            nextDate.setDate(nextDate.getDate() + 1);
            endInput.min = toDate(nextDate);
            if (endInput.value < endInput.min) {
                endInput.value = endInput.min;
            }
        };
        showModal();
    }

    function saveBooking(event) {
        event.preventDefault();
        setError("");
        var form = event.currentTarget;
        var startDate = form.elements.startDate.value;
        var endDate = form.elements.endDate.value;
        var days = Math.round((new Date(endDate + "T00:00:00") - new Date(startDate + "T00:00:00")) / 86400000);
        if (days < 1) {
            setError("Return date must be after the pickup date.");
            return;
        }

        var bookings = readData(BOOKINGS_KEY, []);
        var dailyPrice = Number(modal.dataset.price);
        bookings.push({
            id: "DX" + Date.now(),
            userEmail: currentUser.email,
            userName: currentUser.name,
            car: modal.dataset.car,
            dailyPrice: dailyPrice,
            startDate: startDate,
            endDate: endDate,
            days: days,
            total: dailyPrice * days,
            status: "Pending",
            createdAt: new Date().toISOString()
        });
        try {
            writeData(BOOKINGS_KEY, bookings);
        } catch (error) {
            console.error("Could not save the DriveX booking:", error);
            setError("Your booking could not be saved. Please try again.");
            return;
        }
        closeModal();
        showNotice("Booking added to My Cart. Total: ₹" + (dailyPrice * days).toLocaleString("en-IN"));
    }

    function resumeBooking() {
        var pendingBooking = sessionStorage.getItem("drivex_pending_booking");
        if (!pendingBooking || !currentUser || currentUser.role !== "user") {
            return;
        }
        sessionStorage.removeItem("drivex_pending_booking");
        try {
            var booking = JSON.parse(pendingBooking);
            openBooking(booking.car, booking.price);
        } catch (error) {
            console.error("Could not resume the pending booking:", error);
            showNotice("Could not resume your booking. Please select the car again.");
        }
    }

    window.DriveX = {
        currentUser: function () { return currentUser; },
        openAuthModal: openAuthModal,
        openBooking: openBooking,
        showNotice: showNotice,
        resumeBooking: resumeBooking,
        readBookings: function () { return readData(BOOKINGS_KEY, []); },
        saveBookings: function (bookings) { writeData(BOOKINGS_KEY, bookings); }
    };

    window.addEventListener("storage", function (event) {
        if (event.key === SESSION_KEY) {
            currentUser = readData(SESSION_KEY, null);
            updateHeader();
            enforceRoleAccess();
        }
    });

    enforceRoleAccess();
    updateHeader();
    gatePageActions();
    if (sessionStorage.getItem("drivex_show_login") === "true") {
        sessionStorage.removeItem("drivex_show_login");
        window.setTimeout(function () {
            openAuthModal("login");
        }, 0);
    }
}());
