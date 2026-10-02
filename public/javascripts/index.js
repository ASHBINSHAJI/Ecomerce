document.addEventListener("DOMContentLoaded", function () {

    /* =================================================
       AUTH TABS
    ================================================= */

    const authTabs =
        document.querySelectorAll(".np-auth-tab");

    const emailForm =
        document.getElementById("npEmailForm");

    const otpForm =
        document.getElementById("npOtpForm");


    if (authTabs.length && emailForm && otpForm) {

        authTabs.forEach(function (tab) {

            tab.addEventListener("click", function () {

                authTabs.forEach(function (item) {
                    item.classList.remove("active");
                });

                tab.classList.add("active");


                const type =
                    tab.getAttribute("data-auth");


                if (type === "otp") {

                    emailForm.classList.add("np-hidden");

                    otpForm.classList.remove("np-hidden");

                } else {

                    otpForm.classList.add("np-hidden");

                    emailForm.classList.remove("np-hidden");

                }

            });

        });

    }


    /* =================================================
       PASSWORD TOGGLE
    ================================================= */

    const password =
        document.getElementById("npPassword");

    const passwordToggle =
        document.getElementById("npPasswordToggle");


    if (password && passwordToggle) {

        passwordToggle.addEventListener(
            "click",
            function () {

                const icon =
                    passwordToggle.querySelector("i");


                if (password.type === "password") {

                    password.type = "text";

                    icon.classList.remove("bi-eye");

                    icon.classList.add("bi-eye-slash");

                    passwordToggle.setAttribute(
                        "aria-label",
                        "Hide password"
                    );

                } else {

                    password.type = "password";

                    icon.classList.remove("bi-eye-slash");

                    icon.classList.add("bi-eye");

                    passwordToggle.setAttribute(
                        "aria-label",
                        "Show password"
                    );

                }

            }
        );

    }


    /* =================================================
       OTP
    ================================================= */

    const sendOtp =
        document.getElementById("npSendOtp");

    const phone =
        document.getElementById("npPhone");

    const otpVerification =
        document.getElementById("npOtpVerification");


    if (sendOtp && phone && otpVerification) {

        sendOtp.addEventListener(
            "click",
            function () {

                const phoneNumber =
                    phone.value.trim();


                if (!/^[0-9]{10}$/.test(phoneNumber)) {

                    alert(
                        "Please enter a valid 10-digit mobile number."
                    );

                    return;
                }


                /*
                 * UI demonstration only.
                 *
                 * Later connect this button to your
                 * Express OTP route.
                 */

                otpVerification.classList.remove(
                    "np-hidden"
                );

            }
        );

    }


    /* =================================================
       QUOTE TYPEWRITER
    ================================================= */

    const quoteElement =
        document.getElementById("npQuote");


    if (quoteElement) {

        const quoteText =
            quoteElement.getAttribute("data-text");


        if (quoteText) {

            let index = 0;

            let started = false;


            /*
             * Cursor
             */

            const cursor =
                document.createElement("span");

            cursor.className =
                "np-quote-cursor";


            /*
             * Type function
             */

            function typeQuote() {

                if (index < quoteText.length) {

                    quoteElement.textContent +=
                        quoteText.charAt(index);

                    index++;

                    setTimeout(typeQuote, 38);

                } else {

                    /*
                     * Keep cursor after typing finishes
                     */

                    quoteElement.appendChild(cursor);

                }

            }


            /*
             * Start animation
             */

            function startQuote() {

                if (started) {
                    return;
                }

                started = true;

                typeQuote();

            }


            /*
             * IntersectionObserver
             */

            if ("IntersectionObserver" in window) {

                const quoteObserver =
                    new IntersectionObserver(
                        function (entries) {

                            entries.forEach(function (entry) {

                                if (
                                    entry.isIntersecting
                                ) {

                                    startQuote();

                                    quoteObserver.unobserve(
                                        entry.target
                                    );

                                }

                            });

                        },
                        {
                            threshold: 0.2
                        }
                    );


                quoteObserver.observe(quoteElement);

            } else {

                /*
                 * Fallback for browsers that don't
                 * support IntersectionObserver.
                 */

                startQuote();

            }

        }

    }


    /* =================================================
       SELLER FORM
    ================================================= */

    const sellerForm =
        document.getElementById("sellerForm");


    if (sellerForm) {

        sellerForm.addEventListener(
            "submit",
            function (event) {

                /*
                 * Prevent page refresh for now.
                 *
                 * Later you can replace this with:
                 *
                 * fetch("/seller/apply", {...})
                 */

                event.preventDefault();

                console.log(
                    "Seller form submitted"
                );

            }
        );

    }

});
function togglepassword(inputId, iconspan) {
    const input = document.getElementById(inputId);
    const icon = iconspan.querySelector("i");

    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("bi-eye");
        icon.classList.add("bi-eye-slash");
    } else {
        input.type = "password";
        icon.classList.remove("bi-eye-slash");
        icon.classList.add("bi-eye");
    }
}

function addToCart(productId) {
    $.ajax({
        url: "/add-to-cart/" + productId,
        method: "GET",
        success: function (response) {
            if (response && response.status) {
                var badge = document.getElementById("cart-count");
                if (badge) {
                    badge.textContent = response.count;
                }
            } else if (response && (response.login || response.redirect)) {
                window.location.href = response.redirect || "/home";
            }
        },
        error: function (xhr) {
            if (xhr.status === 401) {
                window.location.href = "/home";
                return;
            }
            console.log("Error:", xhr.status);
            console.log(xhr.responseText);
        }
    });
}

function changeQuantity(productId, count) {
    $.ajax({
        url: "/Shop/change-product-quantity",
        method: "POST",
        data: {
            productId: productId,
            count: count
        },
        success: function (response) {
            if (response && response.removeProduct) {
                alert("Product removed from cart");
            }
            location.reload();
        },
        error: function (xhr) {
            if (xhr.status === 401) {
                window.location.href = "/home";
                return;
            }
            console.log("Error:", xhr.status);
            console.log(xhr.responseText);
        }
    });
}

function removeFromCart(productId) {
    $.ajax({
        url: "/Shop/remove-from-cart",
        method: "POST",
        data: {
            productId: productId
        },
        success: function () {
            location.reload();
        },
        error: function (xhr) {
            if (xhr.status === 401) {
                window.location.href = "/home";
                return;
            }
            console.log("Error:", xhr.status);
            console.log(xhr.responseText);
        }
    });
}
function showPayment(type) {

  document.getElementById("cardPayment").style.display = "none";

  document.getElementById("upiPayment").style.display = "none";

  document.getElementById("codPayment").style.display = "none";


  if (type === "card") {

    document.getElementById("cardPayment").style.display = "block";

  }

  if (type === "upi") {

    document.getElementById("upiPayment").style.display = "block";

  }

  if (type === "cod") {

    document.getElementById("codPayment").style.display = "block";

  }

}
async function selectDelivery(option) {
    const response =await fetch('/select-delivery',{
        method:'post',
        headers:{
            'Content-Type':'application/json'
        },
        body:JSON.stringify({
            deliveryOption:Option
        })
    })
    const data = await response.json();
    document.getElementById('total').innerText=data.total;
}
