const express = require("express");
const authMiddleware = require("../middleware/auth.middleware")
const router = express.Router();
const accountController = require("../controllers/account.controller")

/* POST/API/ACCOUNTS 
CREATE A NEW ACCOUNT
PROTECTED ROUTE
*/

router.post("/", authMiddleware.authMiddleware,accountController.createAccountController);
module.exports = router;