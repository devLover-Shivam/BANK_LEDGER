const {Router} = require('express');
//using the same middleware i.e authmiddleware to validate the token.

const authMiddleware = require('../middleware/auth.middleware');

const transactionController = require('../controllers/transactions.controller');


const transactionRoutes = Router();

/* 
-> POST/API/TRANSACTIONS/
-> CREATE A NEW TRANSACTION
*/

transactionRoutes.post("/",authMiddleware.authMiddleware,transactionController.createTransaction);

/*

- POST/API/TRANSACTIONS/SYSTEM/INITIAL-FUNDS

-CREATE INITIAL FUNDS TRANSACTION FROM SYSTEM USER
*/

transactionRoutes.post("/system/initial-funds",authMiddleware.authSystemUserMiddleware,transactionController.createInitialFundsTransaction);

module.exports = transactionRoutes;