const mongoose = require("mongoose");
const config = require("./env");

async function connectDatabase() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 10000
  });
  console.log("MongoDB connected");
}

module.exports = { connectDatabase };
