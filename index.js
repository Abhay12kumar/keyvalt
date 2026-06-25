const { register } = require("azfn-express");
const { createApp } = require("./app");

const app = createApp();

register(app, "Api", {
  methods: ["GET", "POST", "DELETE"],
  authLevel: "anonymous",
});
