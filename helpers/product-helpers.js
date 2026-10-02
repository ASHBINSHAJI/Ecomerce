var db = require("../config/connection");
var collection=require('../config/collections');

var ObjectId=require('mongodb').ObjectId
module.exports = {
  addproduct: (product, callback) => {
    console.log("PRODUCT", product);
    db.get()
      .collection(collection.PRODUCT_COLLECTIONS)
      .insertOne(product)
      .then((data) => {
        console.log("Insert success");
        console.log(data);

        callback(data.insertedId);
      })
      .catch(function (err) {
        console.log("Insert success", err);
      });
  },
  getAllProducts:()=>{
    return new Promise(async(resolve,reject)=>{
        let products=await db.get().collection(collection.PRODUCT_COLLECTIONS).find().toArray()
        resolve(products.map((product) => ({
          ...product,
          _id: String(product._id)
        })))
    })
  },
  deleteProduct:(prodId)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collection.PRODUCT_COLLECTIONS).deleteOne({_id: new ObjectId(prodId)}).then((response)=>{
        console.log(response);
        
        resolve(response)
      })
    })
  },
  getProductDetails:(prodId)=>{
    return new Promise ((resolve,reject)=>{
      if(!ObjectId.isValid(prodId)){
return reject(new Error("Invaild productID:"+prodId))
      }
      db.get().collection(collection.PRODUCT_COLLECTIONS).findOne({_id: new ObjectId(prodId)}).then((product)=>{
        resolve(product) })
        .catch((err)=>reject(err));
     
    })
  },
  updateProduct:(prodId,proDetials)=>{
return new Promise((resolve,reject)=>{
  db.get().collection(collection.PRODUCT_COLLECTIONS).updateOne({_id: new ObjectId(prodId)},{
    $set:{
      name:proDetials.name,
      description:proDetials.description,
      price:proDetials.price,
      category:proDetials.category,
      stock:proDetials.stock
    }
  }).then((response)=>{
    resolve()
  })
})
  }
};
 