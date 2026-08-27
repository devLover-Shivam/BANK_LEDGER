const express  =require("express");

const router = express.Router();

const authController = require("../controllers/auth.controllers");
/* POST /api/auth/register */
router.post("/register", authController.userRegisterController)
//now this route wil be controlled from a different folder named controllers where we've created auth.controllers.js

module.exports = router;