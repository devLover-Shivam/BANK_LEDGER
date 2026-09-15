const express = require("express");
const authMiddleware = require("../middleware/auth.middleware")
const router = express.Router();
const accountController = require("../controllers/account.controller")

/* POST/API/ACCOUNTS 
->CREATE A NEW ACCOUNT
->PROTECTED ROUTE
*/

router.post("/", authMiddleware.authMiddleware,accountController.createAccountController);


/* 
-GET/API/ACCOUNTS
-GET ALL ACCOUNTS OF THE LOGGED-IN USER
-PROTECTED ROUTE
*/

router.get("/",authMiddleware.authMiddleware, accountController.getUserAccountsController)


/* 
-GET/API/ACCOUNTS/BALANCE/:ACCOUNTID
*/
router.get("/balance/:accountId", authMiddleware.authMiddleware,accountController.getAccountBalanceController);
module.exports = router;