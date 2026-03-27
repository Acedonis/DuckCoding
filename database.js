const Datastore = require("nedb-promises");
const path = require("path");

const db = {
  users: Datastore.create({
    filename: path.join(__dirname, "data", "users.db"),
    autoload: true
  }),
  bots: Datastore.create({
    filename: path.join(__dirname, "data", "bots.db"),
    autoload: true
  })
};

module.exports = db;