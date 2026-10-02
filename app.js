var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const { engine } = require("express-handlebars");
var userRouter = require("./routes/user");
var adminRouter = require("./routes/admin");
var homeRouter = require("./routes/home");
var ReturnRouter = require("./routes/Return");
var showcaseRouter = require("./routes/showcase");
var adnot = require("./routes/adnot");
var expense = require("./routes/expense");
var create = require("./routes/create");
var midrouter=require("./routes/mid")
var fileUpload = require("express-fileupload");
var db = require("./config/connection");
var app = express();
var session =require('express-session');
const exphbs=require('express-handlebars')
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");
app.engine(
  "hbs",
  exphbs.engine({
    extname: "hbs",
    defaultLayout: "layout",
    layoutsDir: __dirname + "/views/layout/",
    partialDir: __dirname + "/views/partials",
     helpers:{
    stripCurrency:function(value){
      if(!value)return'';
      return String (value).replace(/[^0-9.]/g,'');
    }
  }
  }),
);

app.use(logger("dev"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
db.connect((err) => {
  if (err) {
    console.log("connection err" + err);
  } else {
    console.log("connected");
  }
  console.log("databse Connected");
});

app.use(session({
    secret: "something",
    resave: false,
    saveUninitialized: false
}));
app.use((req,res,next)=>{
res.locals.user =req.session.user;
console.log("MiddleWare User:",res.locals.user);

next();
})
app.use("/Shop", userRouter);
app.use("/", homeRouter);
app.use("/return", ReturnRouter);
app.use("/showcase", showcaseRouter);
app.use("/adnot", adnot);

app.use("/mid",midrouter)
app.use("/Expense", expense);
app.use("/signup", create);
// app.use("/cart", userRouter);
app.use(fileUpload());
app.use(express.static(path.join(__dirname, "public")));
app.use("/admin", adminRouter);

// catch 404 and forward to error handler
// app.use((req, res, next)=> {
// next(createError(404));
// });

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development+
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
