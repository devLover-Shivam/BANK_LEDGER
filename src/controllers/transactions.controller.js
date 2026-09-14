/* 
CREATE A NEW TRANSACTION:-

THE 10 STEP - TRANSFER FLOE:

1. VALIDATE REQUEST

2. VALIDATE IDEMPOTENCY KEY

3. CHECK ACCOUNT STATUS

4. DERIVE SENDER BALANCE FROM LEDGER

5. CREATE TRANSACTION (PENDING)

6. CREATE DEBIT LEDGER ENTRY

7. CREATE CREDIT LEDGER ENTRY

8. MARK TRANSACTION COMPLETED

9. COMMIT MONGODB SESSION

10. SEND EMAIL NOTIFICATION

*/

const transactionModel = require("../models/transactions.model");

const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const emailService = require("../services/email.service");

async function createTransaction(req,res){

    //VALIDATE REQUEST

    const {fromAccount, toAccount, amount, idempotencyKey} = req.body;

    if(!fromAccount || !toAccount || !amount || !idempotencyKey){
        res.status(400).json({
            message: "fromAccount, toAccount, amount, idempotencyKey are required"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
    })
    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })

    if(!fromUserAccount || !toUserAccount){
        return res.status(400).json({
            message: "Invalid fromAccount ot toAccount"
        })
    }
}