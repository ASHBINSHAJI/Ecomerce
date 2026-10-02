var express = require("express");
var Router = express.Router();
var productHelpers = require("../helpers/product-helpers");
var userHelpers = require("../helpers/user-helpers");
var db = require("../config/connection");
var collections = require("../config/collections");
const { ObjectId } = require("mongodb");
const verfyLogin = (req, res, next) => {
  console.log("Cart authentication:", {
    loggedIn: req.session.loggedIn,
    hasUser: Boolean(req.session.user),
  });
  if (req.session.loggedIn && req.session.user) {
    next();
  } else {
    console.log("Cart request rejected: user is not logged in");
    res.redirect("/home");
  }
};

Router.get("/",async function (req, res, next) {
  let user = req.session.user;
  let Cartcount = 0;
  if (req.session.user) {
    Cartcount = await userHelpers.getCartcount(req.session.user._id);
  }
  productHelpers
    .getAllProducts()
    .then((products) => {
      res.render("home", { products, user,Cartcount });
    })
    .catch(next);
});
Router.get("/home", (req, res) => {
  if (req.session.loggedIn) {
    res.redirect("/shop");
  } else {
    res.render("home", { loginErr: req.session.loginErr });
    req.session.loginErr = false;
  }
});
Router.post("/home", (req, res) => {
  console.log("Login attempt:", req.body.email);
  userHelpers
    .doLogin(req.body)
    .then((response) => {
      req.session.loggedIn = true;
      req.session.user = response.user;
      console.log("Login successful:", response.user.email);
      res.redirect("/shop");
    })
    .catch((err) => {
      console.error("Login failed:", err);
      req.session.loginErr = "Invalid email or password. Please try again.";
      res.redirect("/home");
      // console.log("Login Failed:", err);
      // res.status(401).send("Login Failed:" + err);
    });
});
Router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/home");
});
Router.get("/products", async (req, res) => {
  res.render("fullform");
});
Router.get("/cart", verfyLogin, async (req, res) => {
  try {
    let products = await userHelpers.getCartProducts(req.session.user._id);
    let Cartcount = await userHelpers.getCartcount(req.session.user._id);
    let totalValue=await userHelpers.getTotalAmount(req.session.user._id)
    const total = products.reduce(
      (sum, item) => sum + (item.lineTotal || 0),
      0,
    );
    res.render("cart", {
      totalValue,
      shop: true,
      products,
      user: req.session.user,
      Cartcount,
      total,
    });
  } catch (err) {
    console.error("Unable to load cart:", err);
    res.status(500).send("Unable to load cart");
  }
});
Router.get("/add-to-cart/:id", async (req, res) => {
  try {
    if (!req.session.loggedIn || !req.session.user) {
      return res.status(401).json({
        status: false,
        login: true,
        redirect: "/home",
      });
    }

    await userHelpers.addToCart(req.params.id, req.session.user._id);
    const count = await userHelpers.getCartcount(req.session.user._id);
    res.json({ status: true, count });
  } catch (err) {
    console.error("Unable to add to cart:", err);
    res.status(500).json({ status: false, error: "Unable to add to cart" });
  }
});
Router.get("/checkout", verfyLogin, async (req, res) => {
  try {
    const products = await userHelpers.getCartProducts(req.session.user._id);
    const Cartcount = await userHelpers.getCartcount(req.session.user._id);
    const total = products.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
    res.render("checkout", {
      shop: true,
      products,
      user: req.session.user,
      Cartcount,
      total,
    });
  } catch (err) {
    console.error("Unable to load checkout:", err);
    res.status(500).send("Unable to load checkout");
  }
});
Router.post("/place-order", verfyLogin, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const products = await userHelpers.getCartProducts(userId);
    if (!products.length) {
      return res.redirect("/cart");
    }
    const total = products.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
    const result = await db
      .get()
      .collection(collections.ORDER_COLLECTION)
      .insertOne({
      user: userId,
      deliveryDetails: {
        name: req.body.name,
        address: req.body.address,
        phone: req.body.phone,
        pincode: req.body.pincode,
      },
      products: products.map((p) => ({
        item: p._id,
        name: p.name,
        quantity: p.quantity,
        price: p.unitPrice,
      })),
      total,
      paymentMethod: req.body.paymentMethod || "COD",
      status: "placed",
      date: new Date(),
    });

    // empty the cart after order is placed
    const carts = db.get().collection(collections.CART_COLLECTION);
    await carts.updateOne({ user: new ObjectId(userId) }, { $set: { products: [] } });

    res.render("order-success", {
      shop: true,
      user: req.session.user,
      Cartcount: 0,
      order: result,
    });
  } catch (err) {
    console.error("Unable to place order:", err);
    res.status(500).send("Unable to place order");
  }
});
module.exports = Router;
