var express = require("express");
var router = express.Router();
var userHelpers = require("../helpers/user-helpers");
router.get("/", (req, res, next) => {
  res.render("create", { shop: true });
});
router.post("/", (req, res) => {
 if(req.body.password !== req.body.confirmPassword){
    return res.render('create',{shop:true,
    error:"passord do not match"
  })
  }
console.log("signup body:", req.body);
  userHelpers
    .doSignup(req.body)
    .then((response) => {
      console.log("Signup response:", response);
      res.send("Signup success");
    })
    .catch((err) => {
      res.status(500).send("Error durning Signup:" + err);
    });
});

module.exports = router;
