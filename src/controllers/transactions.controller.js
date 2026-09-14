/* 
CREATE A NEW TRANSACTION:-

THE 10 STEP - TRANSFER FLOW:

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

const userModel = require("../models/user.model");

// emailService contains reusable functions like:
// sendRegistrationEmail() and sendTransactionEmail()
const emailService = require("../services/email.service");

const mongoose = require("mongoose");


async function createTransaction(req, res) {

    // ============================================================
    // 1. VALIDATE REQUEST
    // ============================================================

    // Get the required transaction details from request body.
    const {
        fromAccount,
        toAccount,
        amount,
        idempotencyKey
    } = req.body;


    // Make sure all required fields are provided.
    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "fromAccount, toAccount, amount, idempotencyKey are required"
        });
    }


    // Find the account from which money will be debited.
    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
    });


    // Find the account to which money will be credited.
    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    });


    // If either account doesn't exist, transaction cannot continue.
    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({
            message: "Invalid fromAccount or toAccount"
        });
    }


    // ============================================================
    // 2. VALIDATE IDEMPOTENCY KEY
    // ============================================================

    /*
        IDEMPOTENCY KEY prevents the same transaction from
        accidentally being processed multiple times.

        Example:

        Client sends:
        idempotencyKey = "TXN123"

        If the request is accidentally sent again with "TXN123",
        we find the existing transaction instead of creating
        another transaction.
    */

    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    });


    if (isTransactionAlreadyExists) {

        // Transaction was already successfully completed.
        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction Already Processed",
                transaction: isTransactionAlreadyExists
            });
        }


        // Transaction exists but is still being processed.
        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction Is Still Processing",
                transaction: isTransactionAlreadyExists
            });
        }


        // Previous transaction attempt failed.
        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(500).json({
                message: "Transaction Processing Failed, Please Retry",
                transaction: isTransactionAlreadyExists
            });
        }


        // Previous transaction was reversed.
        if (isTransactionAlreadyExists.status === "REVERSED") {
            return res.status(500).json({
                message: "Transaction Was Reversed, Please Retry",
                transaction: isTransactionAlreadyExists
            });
        }
    }


    // ============================================================
    // 3. ACCOUNT STATUS
    // ============================================================

    /*
        Both accounts must be ACTIVE.

        Sender cannot send money if:
        - account is FROZEN
        - account is CLOSED

        Receiver also must be ACTIVE.
    */

    if (
        fromUserAccount.status !== "ACTIVE" ||
        toUserAccount.status !== "ACTIVE"
    ) {
        return res.status(400).json({
            message: "Both fromAccount and toAccount must be ACTIVE to process transaction"
        });
    }


    // ============================================================
    // 4. DERIVE SENDER BALANCE FROM LEDGER
    // ============================================================

    /*
        We DON'T store balance directly inside Account.

        Instead:

        Balance = Total CREDIT - Total DEBIT

        getBalance() in account.model.js calculates this
        using the Ledger collection.
    */

    const balance = await fromUserAccount.getBalance();


    // Sender must have enough money.
    if (balance < amount) {
        return res.status(400).json({
            message: `Insufficient Balance!!!
            Current balance is ${balance}. Requested amount is ${amount}`
        });
    }


    // ============================================================
    // 5. CREATE TRANSACTION (PENDING)
    // ============================================================

    /*
        MongoDB SESSION / TRANSACTION starts here.

        The following operations should behave as ONE atomic operation:

        1. Create Transaction
        2. Create DEBIT Ledger Entry
        3. Create CREDIT Ledger Entry
        4. Mark Transaction COMPLETED

        If something fails before commit,
        we can rollback the database transaction.
    */

    const session = await mongoose.startSession();

    session.startTransaction();


    try {

        // Create the main transaction record first as PENDING.
        const transaction = await transactionModel.create(
            {
                fromAccount,
                toAccount,
                amount,
                idempotencyKey,
                status: "PENDING"
            },
            { session }
        );


        // ========================================================
        // 6. CREATE DEBIT LEDGER ENTRY
        // ========================================================

        /*
            Money is going OUT of sender's account.

            Therefore:

            Sender Account
                  ↓
                DEBIT
                  ↓
                ₹amount
        */

        const debitLedgerEntry = await ledgerModel.create(
            {
                account: fromAccount,
                amount: amount,
                transaction: transaction._id,
                type: "DEBIT"
            },
            { session }
        );


        // ========================================================
        // 7. CREATE CREDIT LEDGER ENTRY
        // ========================================================

        /*
            Money is coming INTO receiver's account.

            Therefore:

            Receiver Account
                  ↓
                CREDIT
                  ↓
                ₹amount
        */

        const creditLedgerEntry = await ledgerModel.create(
            {
                account: toAccount,
                amount: amount,
                transaction: transaction._id,
                type: "CREDIT"
            },
            { session }
        );


        // ========================================================
        // 8. MARK TRANSACTION COMPLETED
        // ========================================================

        /*
            At this point:

            Transaction created       ✅
            Debit ledger created      ✅
            Credit ledger created     ✅

            So we can mark the transaction as COMPLETED.
        */

        transaction.status = "COMPLETED";

        await transaction.save({ session });


        // ========================================================
        // 9. COMMIT MONGODB SESSION
        // ========================================================

        /*
            commitTransaction() permanently saves ALL operations
            performed inside this MongoDB transaction.

            If any operation had failed before this point,
            catch block would rollback everything.
        */

        await session.commitTransaction();

        session.endSession();


        // ========================================================
        // 10. SEND TRANSACTION EMAIL
        // ========================================================

    

        await emailService.sendTransactionEmail(
            req.user.email,
            req.user.name,
            amount,
            transaction._id,
            "TRANSFER",
            transaction.status
        );


        // ========================================================
        // RESPONSE
        // ========================================================

        return res.status(201).json({
            message: "Transaction Completed Successfully!",
            transaction: transaction
        });


    } catch (error) {

        /*
            Something went wrong during the transaction.

            abortTransaction() rolls back all database operations
            performed inside this session.

            Example:

            Transaction created       ✅
            Debit Ledger created      ✅
            Credit Ledger FAILED      ❌

            Without rollback:
            Transaction + Debit entry could remain in DB.

            With rollback:
            Everything gets reverted.
        */

        await session.abortTransaction();

        session.endSession();

        console.error("Transaction Failed:", error);

        return res.status(500).json({
            message: "Transaction Processing Failed",
            error: error.message
        });
    }
}

async function createInitialFundsTransaction(req,res){
    const {toAccount, amount, idempotencyKey} = req.body;

    if(!toAccount || !amount || !idempotencyKey){
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        })
    }

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })
    if(!toUserAccount){
        return res.status(400).json({
            message: "Invalid toAccount."
        })
    }

    // Find the SYSTEM user
    const systemUser = await userModel.findOne({
        systemUser: true
    });

    if (!systemUser) {
    return res.status(400).json({
        message: "System User Not Found"
    });
}

    // Find the account belonging to the SYSTEM user
    const fromUserAccount = await accountModel.findOne({
        user: systemUser._id
    });

    if(!fromUserAccount){
        return res.status(400).json({
            message: "System User Account Not Found"
        })
    }

    const session = await mongoose.startSession()
    session.startTransaction()

    const transaction = new transactionModel({
    fromAccount: fromUserAccount._id,
    toAccount,
    amount,
    idempotencyKey,
    status: "PENDING"
    });

    await transaction.save({ session });

    const debitLedgerEntry = await ledgerModel.create([{
        account: fromUserAccount._id,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT"
    }],{session})

    const creditLedgerEntry = await ledgerModel.create([{
        account: toAccount,
        amount: amount,
        transaction: transaction._id,
        type:"CREDIT"
    }],{session})

    transaction.status = "COMPLETED"
    await transaction.save({session})

    await session.commitTransaction()
    session.endSession()

    // SEND TRANSACTION EMAIL
    await emailService.sendTransactionEmail(
        req.user.email,
        req.user.name,
        amount,
        transaction._id,
        "INITIAL_FUNDS",
        transaction.status
    );

    return res.status(201).json({
        message:"Initial Funds completed successfully.",
        transaction: transaction
    })
}


module.exports = {
    createTransaction,
    createInitialFundsTransaction
};