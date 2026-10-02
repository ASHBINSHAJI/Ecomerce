const express=require('express')
const router =express.Router();
const path = require('path')
var productHelper = require("../helpers/product-helpers");
const productHelpers = require("../helpers/product-helpers");
const userHelpers = require('../helpers/user-helpers');
const db = require('../config/connection');
const collections = require('../config/collections');
const { ObjectId } = require('mongodb');
function toObjectId(id) {
  return id instanceof ObjectId ? id : new ObjectId(String(id));
}
const { log } = require('console');
const verifyLogin = (req, res, next) => {
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
// Works whether the router is mounted at "/mid" (app.js) or at "/":
// "/" covers the /mid mount, "/mid" covers a root mount.
router.get(["/", "/mid"],verifyLogin,async(req,res,next)=>{
    let total =await userHelpers.getTotalAmount(req.session.user._id)
    let D1total=await userHelpers.getTotalAmount(req.session.user._id)+200
    let D2total=await userHelpers.getTotalAmount(req.session.user._id)+150
    res.render("middle",{
      D2total,
D1total,
      admin:false,
      shop:true,
      total,
      user:req.session.user
    })
})
router.post('/place-order',verifyLogin,async(req,res,next)=>{
  try {
    const userid=req.session.user._id;
    const deliveryoption=req.body.deliveryOption;
    console.log(deliveryoption,":delivery");
    console.log(req.body);

    let product=await userHelpers.getCartProductList(userid)
    let total =await userHelpers.getTotalAmount(userid)

    if (deliveryoption=="express") {
      total+=150;
    } else {
      total+=200;
    }
    console.log("Final Total",total);

    const paymentMethod = req.body.paymentMethod || 'cod';
    const orderObj={
      ...req.body,
      userId:userid,
      'payment-method':paymentMethod
    }

    const orderResponse = await userHelpers.placeOrder(orderObj,product,total)
    const orderId = orderResponse.insertedId || orderResponse._id;

    // Only COD orders go straight to the success page.
    // Card / UPI orders are created as 'pending' until payment completes.
    if (paymentMethod !== 'cod') {
      return res.redirect(`/mid/payment/${orderId}`)
    }

    // COD: order is confirmed right away — empty the cart
    await db.get().collection(collections.CART_COLLECTION).deleteOne({ user: toObjectId(userid) })
    res.redirect(`/mid/order-success/${orderId}`)
  } catch (error) {
    console.log("error cart ",error);
    res.status(500).render("error")
  }
})

// Payment page for card / UPI orders (order is 'pending' until paid)
router.get('/payment/:id',verifyLogin,async(req,res,next)=>{
  try {
    const { ObjectId } = require('mongodb')
    const order = await db.get().collection(collections.ORDER_COLLECTION).findOne({
      _id: new ObjectId(req.params.id)
    })
    if (!order) {
      return res.redirect('/mid')
    }
    res.render("order-payment",{
      shop:true,
      user:req.session.user,
      order:{
        orderId:order._id,
        paymentMethod:order.PaymentMethod==='cod'?'COD':order.PaymentMethod==='card'?'Card':'UPI',
        status:order.status,
        total:order.total
      }
    })
  } catch (error) {
    console.log("error payment page ",error);
    res.status(500).render("error")
  }
})

// Mock "pay now" endpoint — marks the pending order as paid
router.post('/pay/:id',verifyLogin,async(req,res,next)=>{
  try {
    const { ObjectId } = require('mongodb')
    await userHelpers.markOrderPaid(req.params.id)
    // After payment completes, empty the cart and show the real success page
    await db.get().collection(collections.CART_COLLECTION).deleteOne({ user: toObjectId(req.session.user._id) })
    res.redirect(`/mid/order-success/${req.params.id}`)
  } catch (error) {
    console.log("error paying ",error);
    res.status(500).render("error")
  }
})

// Success page — shows the REAL order data from the database
router.get('/order-success/:id',verifyLogin,async(req,res,next)=>{
  try {
    const { ObjectId } = require('mongodb')
    const order = await db.get().collection(collections.ORDER_COLLECTION).findOne({
      _id: new ObjectId(req.params.id)
    })
    if (!order) {
      return res.redirect('/mid')
    }
    res.render("order-success",{
      shop:true,
      user:req.session.user,
      Cartcount:0,
      order:{
        orderId:order._id,
        paymentMethod:order.PaymentMethod==='cod'?'COD':order.PaymentMethod==='card'?'Card':'UPI',
        status:order.status,
        total:order.total,
        deliveryDetials:order.deliveryDetials,
        products:order.products
      }
    })
  } catch (error) {
    console.log("error paying ",error);
    res.status(500).render("error")
  }
})
module.exports=router;