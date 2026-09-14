const {Router} = require('express');
//using the same middleware i.e authmiddleware to validate the token.

const authMiddleware = require('../middleware/auth.middleware');




const transactionRoutes = Router();

/* 
-> POST/API/TRANSACTIONS/
-> CREATE A NEW TRANSACTION
*/

transactionRoutes.post("/",authMiddleware.authMiddleware)

module.exports = transactionRoutes;