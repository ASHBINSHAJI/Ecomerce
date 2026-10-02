var express = require("express");
var router = express.Router();
const path = require("path");
var productHelper = require("../helpers/product-helpers");
const productHelpers = require("../helpers/product-helpers");
const { log } = require("console");
/* GET users listing. */
router.get("/", function (req, res, next) {
  productHelpers.getAllProducts().then((products)=>{
 res.render("admin/view-products", { admin: true, products })
  })

});
router.get("/add-products", function (req, res) {
  console.log("router is next ");
  console.log("working");

  res.render("admin/add-products", { admin: true });
});


router.post("/add-products", (req, res) => {
  console.log("Router connected");

  console.log(req.body);
  console.log(req.files.image);
  productHelper.addproduct(req.body, (id) => {
    // console.log("Callback received:", result);
    let image = req.files.image;
 
    var uploadpath = path.join(
      __dirname,
      "..",
      "public",
      "product-images",
      id + ".jpg",
    );
    image.mv(uploadpath, (err, done) => {
      if (!err) {
        res.render("admin/add-products");
      } else {
        console.log(err);
        res.status(500).send("Image Upload Failed");
      }
    });
  });
});
router.get("/delete-product/:id", (req, res) => {
  let prodId=req.params.id
  console.log(prodId);
productHelpers.deleteProduct(prodId).then((response)=>{
    res.redirect('/admin/')
  })
  
})
router.get("/edit-product/:id",async(req,res)=>{
  let product=await productHelpers.getProductDetails(req.params.id)
  console.log(product);
  
  res.render("admin/edit-product",{product,admin:true})

})
router.post('/edit-product/:id',(req,res)=>{
  console.log(req.params);
  let id=req.params.id
  productHelpers.updateProduct(req.params.id, req.body).then(()=>{
    // res.redirect('/admin')
    if(req.files && req.files.image){
          let image=req.files.image;
          let uploadpath=path.join(
            __dirname,
            "..",
            "public",
            "product-images",
            id+".jpg"
          )
      image.mv(uploadpath, (err) => {
    if(err){
      console.log(err);
      
    }
    res.redirect('/admin')
     
    });
    }else{
      res.redirect('/admin')
    }
  })
})
module.exports = router;
