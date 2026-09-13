const mongoose = require("mongoose");


/*
    TRANSACTION SCHEMA
    ------------------

    - Ye schema define karta hai ki MongoDB me ek transaction ka data
      kis structure me store hoga.

    - Transaction basically ek account se doosre account me
      money transfer ko represent karta hai.

    - Is schema ke through hum define karte hain:
        1. Money kis account se aa raha hai.
        2. Money kis account me ja raha hai.
        3. Transaction ka current status kya hai.
        4. Transaction ki amount kitni hai.
        5. Idempotency key kya hai.

    PROJECT ME ROLE:

        transaction.model.js
                ↓
        Transaction Schema
                ↓
        Transaction Model
                ↓
        Controllers / Services
                ↓
        MongoDB

    - Controllers/services isi model ke through transactions ko
      create, read ya update kar sakte hain.
*/

const transactionSchema = new mongoose.Schema({


    /*
        FROM ACCOUNT
        ------------

        - fromAccount us account ki ID store karega jahan se
          paisa transfer kiya ja raha hai.

        - ObjectId MongoDB documents ko uniquely identify karta hai.

        - ref: "account" batata hai ki ye ObjectId
          "account" model/document se related hai.

        - required: true ka matlab hai ki transaction create karte waqt
          fromAccount dena compulsory hai.

        - index: true searching/querying ko faster banane me help karta hai.

        EXAMPLE:

            Account A
                ↓
            fromAccount

            Account B
                ↓
            toAccount
    */

    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,

        ref: "account",

        required: [
            true,
            "Transaction must be associated with a from account"
        ],

        index: true
    },


    /*
        TO ACCOUNT
        ----------

        - toAccount us account ki ID store karega jahan paisa
          transfer kiya ja raha hai.

        - ref: "account" ka matlab hai ki ye field
          account model ke document ko reference karti hai.

        - required: true ka matlab hai ki destination account
          ke bina transaction create nahi ho sakta.

        - index: true is field par queries ko faster banane me help karta hai.
    */

    toAccount: {
        type: mongoose.Schema.Types.ObjectId,

        ref: "account",

        required: [
            true,
            "Transaction must be associated with a to account"
        ],

        index: true
    },


    /*
        TRANSACTION STATUS
        ------------------

        - Ye field batati hai ki transaction abhi kis state me hai.

        POSSIBLE VALUES:

        PENDING
            → Transaction create ho chuka hai,
              lekin abhi complete nahi hua.

        COMPLETED
            → Transaction successfully complete ho gaya.

        FAILED
            → Transaction complete nahi ho paya.

        REVERSED
            → Pehle transaction complete hua tha,
              lekin baad me usko reverse kar diya gaya.

        - enum ensure karta hai ki status me sirf
          predefined values hi store ki ja saken.

        - default: "PENDING" ka matlab hai ki agar transaction create
          karte waqt status nahi diya gaya, to automatically
          PENDING set hoga.
    */

    status: {
        type: String,

        enum: {
            values: [
                "PENDING",
                "COMPLETED",
                "FAILED",
                "REVERSED"
            ],

            message:
                "Status can be either PENDING, COMPLETED, FAILED or REVERSED",
        },

        default: "PENDING"
    },


    /*
        TRANSACTION AMOUNT
        ------------------

        - Ye field batati hai ki transaction me kitna paisa
          transfer kiya ja raha hai.

        - type: Number ka matlab amount numeric value hogi.

        - required: true ka matlab amount ke bina transaction
          create nahi kiya ja sakta.

        - min: 0 ensure karta hai ki transaction amount
          negative nahi ho sakti.

        EXAMPLE:

            amount: 500
                → valid

            amount: -500
                → invalid
    */

    amount: {
        type: Number,

        requireed: [
            true,
            "Amount is required for creating a transaction"
        ],

        min: [
            0,
            "Transaction amount cannot be negative"
        ]
    },


    /*
        IDEMPOTENCY KEY
        ---------------

        - Idempotency key ka purpose same transaction ko
          accidentally multiple times process hone se prevent karna hai.

        - Client ek transaction request ke saath ek unique
          idempotencyKey bhej sakta hai.

        - unique: true ensure karta hai ki database me
          same idempotencyKey dobara store na ho.

        - index: true is field ko efficiently search karne me help karta hai.

        EXAMPLE:

            Request 1:
            idempotencyKey = "ABC123"
                    ↓
            Transaction created

            Same Request again:
            idempotencyKey = "ABC123"
                    ↓
            Same key already exists
                    ↓
            Duplicate transaction ko prevent kiya ja sakta hai.

        - Ye especially important hai payment/banking systems me,
          kyunki network retry ki wajah se same request multiple times
          aa sakti hai.
    */

    idempotencyKey: {
        type: String,

        required: [
            true,
            "Idempotency Key is required for creating a transaction"
        ],

        index: true,

        unique: true
    }

}, {
    /*
        TIMESTAMPS
        ----------

        - timestamps: true automatically createdAt aur updatedAt
          fields add karta hai.

        createdAt:
            → Transaction kab create hui.

        updatedAt:
            → Transaction document last time kab update hua.

        Example:

            {
                createdAt: "...",
                updatedAt: "..."
            }
    */

    timestamps: true
});


/*
    TRANSACTION MODEL
    -----------------

    - Schema sirf structure/rules define karta hai.
    - mongoose.model() us schema se actual Mongoose Model create karta hai.

    - "transaction" model ka naam hai.
    - Is model ke through hum MongoDB ke transaction collection
      ke saath interact kar sakte hain.

    FILE RELATION:

        transactionSchema
                ↓
        mongoose.model()
                ↓
        transactionModel
                ↓
        Controllers / Services
                ↓
        MongoDB
*/

const transactionModel = mongoose.model(
    "transaction",
    transactionSchema
);


/*
    EXPORT MODEL
    ------------

    - transactionModel ko export kar rahe hain.
    - Project ki doosri files is model ko import karke
      transaction-related database operations perform kar sakti hain.

    Example:

        const transactionModel =
            require("../models/transaction.model");

    - Is separation ka benefit ye hai ki database structure
      model file me defined rehta hai, jabki actual transaction
      business logic controllers/services me rakha ja sakta hai.
*/

module.exports = transactionModel;