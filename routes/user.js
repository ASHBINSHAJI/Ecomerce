var express = require("express");
var router = express.Router();
var productHelpers = require("../helpers/product-helpers");
var userHelpers = require("../helpers/user-helpers");
/* GET home page. */
router.get("/", async function (req, res, next) {
  try {
    let products = await productHelpers.getAllProducts();
    let Cartcount = req.session.user
      ? await userHelpers.getCartcount(req.session.user._id)
      : 0;
    res.render("index", {
      products,
      admin: false,
      shop: true,
      user: req.session.user,
      Cartcount,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/change-product-quantity", (req, res) => {
  console.log("CHANGE QUANTITY HIT");
  console.log(req.body);

  if (!req.session.user) {
    return res.status(401).json({ status: false, error: "Not logged in" });
  }

  userHelpers
    .changeProductQuantity(req.body, req.session.user._id)
    .then((result) => {
      res.json({
        status: true,
        removeProduct: Boolean(result.removeProduct),
      });
    })
    .catch((err) => {
      console.log(err);
      if (!res.headersSent) {
        res.status(500).json({
          status: false,
          error: err.message,
        });
      }
    });
});

router.post("/remove-from-cart", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ status: false, error: "Not logged in" });
  }

  userHelpers
    .removeFromCart(req.body.productId, req.session.user._id)
    .then(() => {
      res.json({ status: true });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ status: false, error: err.message });
    });
});

module.exports = router;
