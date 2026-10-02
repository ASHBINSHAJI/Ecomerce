var db = require("../config/connection");
var collection = require("../config/collections");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const { response } = require("../app");

function toObjectId(id) {
  if (id instanceof ObjectId) {
    return id;
  }
  return new ObjectId(String(id));
}

function parsePrice(value) {
  if (typeof value === "number") {
    return value;
  }
  const numeric = parseFloat(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

async function getOrNormalizeCart(userId) {
  const carts = db.get().collection(collection.CART_COLLECTION);
  const cart = await carts.findOne({ user: toObjectId(userId) });
  if (!cart) {
    return null;
  }

  const products = Array.isArray(cart.products) ? cart.products : [];
  const needsNormalize = products.some(
    (entry) => !entry || typeof entry !== "object" || !entry.item,
  );

  if (!needsNormalize) {
    return cart;
  }

  const counts = new Map();
  for (const entry of products) {
    if (!entry) {
      continue;
    }
    const id = String(entry.item || entry);
    counts.set(id, (counts.get(id) || 0) + 1);
  }

  cart.products = Array.from(counts.entries()).map(([id, quantity]) => ({
    item: toObjectId(id),
    quantity,
  }));

  await carts.updateOne(
    { _id: cart._id },
    { $set: { products: cart.products } },
  );

  return cart;
}

module.exports = {
  doSignup: async (userData) => {
    try {
      userData.password = await bcrypt.hash(userData.password, 10);

      const data = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .insertOne(userData);
      return data;
    } catch (err) {
      console.log("Error in doSignup:", err);
      throw err;
    }
  },
  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ email: userData.email });
      if (user) {
        bcrypt.compare(userData.password, user.password).then((result) => {
          if (result) {
            resolve({
              user: user,
              status: true,
            });
          } else {
            reject("Wrong password");
          }
        });
      } else {
        reject("User not found");
      }
    });
  },
  addToCart: (prodId, userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const productId = toObjectId(prodId);
        const carts = db.get().collection(collection.CART_COLLECTION);
        const userCart = await getOrNormalizeCart(userId);

        if (userCart) {
          const exists = userCart.products.some(
            (product) => String(product.item) === String(productId),
          );

          if (exists) {
            await carts.updateOne(
              {
                user: toObjectId(userId),
                "products.item": productId,
              },
              { $inc: { "products.$.quantity": 1 } },
            );
          } else {
            await carts.updateOne(
              { user: toObjectId(userId) },
              {
                $push: {
                  products: { item: productId, quantity: 1 },
                },
              },
            );
          }
        } else {
          await carts.insertOne({
            user: toObjectId(userId),
            products: [{ item: productId, quantity: 1 }],
          });
        }

        resolve();
      } catch (err) {
        reject(err);
      }
    });
  },
  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        await getOrNormalizeCart(userId);
        const data = await db
          .get()
          .collection(collection.CART_COLLECTION)
          .aggregate([
            {
              $match: {
                user: toObjectId(userId),
              },
            },
            { $unwind: "$products" },
            {
              $lookup: {
                from: collection.PRODUCT_COLLECTIONS,
                localField: "products.item",
                foreignField: "_id",
                as: "productDetails",
              },
            },
            { $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: { $toString: "$products.item" },
                name: "$productDetails.name",
                description: "$productDetails.description",
                stock: "$productDetails.stock",
                price: "$productDetails.price",
                category: "$productDetails.category",
                quantity: "$products.quantity",
                cartId: { $toString: "$_id" },
              },
            },
          ])
          .toArray();

        resolve(
          data.map((item) => {
            const unitPrice = parsePrice(item.price);
            return {
              ...item,
              unitPrice,
              lineTotal: unitPrice * (item.quantity || 0),
            };
          }),
        );
      } catch (err) {
        reject(err);
      }
    });
  },
  getCartcount: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let count = 0;
        const cart = await getOrNormalizeCart(userId);
        if (cart && Array.isArray(cart.products)) {
          count = cart.products.reduce(
            (sum, product) => sum + (product.quantity || 0),
            0,
          );
        }
        resolve(count);
      } catch (err) {
        reject(err);
      }
    });
  },
  changeProductQuantity: (details, userId) => {
    const count = parseInt(details.count, 10);

    return new Promise(async (resolve, reject) => {
      try {
        if (count !== 1 && count !== -1) {
          return reject(new Error("Invalid count value"));
        }

        const prodId = toObjectId(details.productId);
        const carts = db.get().collection(collection.CART_COLLECTION);
        const cart = await getOrNormalizeCart(userId);

        if (!cart) {
          return resolve({ modifiedCount: 0, removeProduct: false });
        }

        const line = cart.products.find(
          (product) => String(product.item) === String(prodId),
        );

        if (!line) {
          return resolve({ modifiedCount: 0, removeProduct: false });
        }

        if (count === -1 && line.quantity <= 1) {
          await carts.updateOne(
            { user: toObjectId(userId) },
            { $pull: { products: { item: prodId } } },
          );

          const updated = await carts.findOne({ user: toObjectId(userId) });
          if (updated && updated.products.length === 0) {
            await carts.deleteOne({ _id: updated._id });
          }

          return resolve({ modifiedCount: 1, removeProduct: true });
        }

        await carts.updateOne(
          {
            user: toObjectId(userId),
            "products.item": prodId,
          },
          { $inc: { "products.$.quantity": count } },
        );

        resolve({ modifiedCount: 1, removeProduct: false });
      } catch (err) {
        console.log("change product error:", err);
        reject(err);
      }
    });
  },
  removeFromCart: (prodId, userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const carts = db.get().collection(collection.CART_COLLECTION);
        await getOrNormalizeCart(userId);

        await carts.updateOne(
          { user: toObjectId(userId) },
          { $pull: { products: { item: toObjectId(prodId) } } },
        );

        const cart = await carts.findOne({ user: toObjectId(userId) });
        if (cart && cart.products.length === 0) {
          await carts.deleteOne({ _id: cart._id });
        }

        resolve({ status: true });
      } catch (err) {
        reject(err);
      }
    });
  },

  getTotalAmount:(userId)=>{

         
        return new Promise(async (resolve, reject) => {
      try {
        await getOrNormalizeCart(userId);
        const total = await db
          .get()
          .collection(collection.CART_COLLECTION)
          .aggregate([
            {
              $match: {
                user: toObjectId(userId),
              },
            },
            { $unwind: "$products" },
            {
              $lookup: {
                from: collection.PRODUCT_COLLECTIONS,
                localField: "products.item",
                foreignField: "_id",
                as: "productDetails",
              },
            },
            { $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: { $toString: "$products.item" },
                name: "$productDetails.name",
                description: "$productDetails.description",
                stock: "$productDetails.stock",
                price: "$productDetails.price",
                category: "$productDetails.category",
                quantity: "$products.quantity",
                cartId: { $toString: "$_id" },
              },
            },

          ])
          .toArray();

      // Sum in JS: price may be stored as a number or a string (e.g. "₹250.50"),
      // and $multiply in the aggregation would crash on non-numeric types.
      const grandTotal = total.reduce(
        (sum, row) => sum + parsePrice(row.price) * (row.quantity || 0),
        0,
      );
      console.log("Cart total:", grandTotal);
      resolve(grandTotal);
      } catch (err) {
    console.log("system have error",err);
    reject(err);
      }
    });
  },
  placeOrder:(order,products,total)=>{
    let status=order['payment-method']==='cod'?'placed':'pending'

    let orderObj={
      deliveryDetials:{
        mobile:order.mobile,
        address:order.address,
        pincode:order.pincode
      },
      userId:toObjectId(order.userId),
      PaymentMethod:order['payment-method'],
      products:products,
      total:total,
      status:status,
      date:new Date()
    }
    return db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj)
  },
  getOrderById:(orderId)=>{
    return db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: toObjectId(orderId) })
  },
  markOrderPaid:(orderId)=>{
    return db.get().collection(collection.ORDER_COLLECTION).updateOne(
      { _id: toObjectId(orderId) },
      { $set: { status: 'placed' } }
    )
  },
  getCartProductList:(userId)=>{
    return new Promise (async(resolve,reject)=>{
      try{
      let cart =await db.get().collection(collection.CART_COLLECTION).findOne({user: toObjectId(userId)})
      resolve(cart ? cart.products : [])
      }catch(err){
        reject(err)
      }
    }

  )
  },
  getOrderDetials:(userId)=>{
    return new Promise (async (resolve,reject)=>{
      try{
        let order=await db.get().collection(collection.ORDER_COLLECTION).findOne({ userId: toObjectId(userId) })
        resolve(order)
      }catch(err){
        reject(err)
      }
    })
  }
};
