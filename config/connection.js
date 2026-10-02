
const { MongoClient } = require("mongodb");

const state = {
  db: null,
};

module.exports.connect = function (done) {
  const url = "mongodb://127.0.0.1:27017";
  const dbname = "shopping";

  console.log("Trying MongoDB connection...");

  MongoClient.connect(url)
    .then((client) => {
      console.log("MONGO CONNECTED!");

      state.db = client.db(dbname);

      done();
    })
    .catch((err) => {
      console.log("MONGO ERROR:");
      console.log(err);

      done(err);
    });
};

module.exports.get = function () {
  return state.db;
};
