const mongoose = require("mongoose");
const ledgerModel = require("./ledger.model");

/*
    ACCOUNT SCHEMA
    --------------

    An Account belongs to a particular User.

    Example:

    User
      ↓
    Account
      ↓
    Balance / Transactions / Ledger entries

    We are NOT storing the balance directly in this document.
    The balance will later be calculated/maintained using
    ledger entries.
*/

const accountSchema = new mongoose.Schema({

    /*
        USER REFERENCE
        --------------

        1. Every account must belong to a user.

        2. We store the user's MongoDB _id instead of
           storing the complete user document.

        3. mongoose.Schema.Types.ObjectId represents
           MongoDB's ObjectId data type.

        Example:

        User document:
        {
            _id: ObjectId("abc123"),
            name: "Shivam"
        }

        Account document:
        {
            user: ObjectId("abc123")
        }

        So the account stores a reference to the user.
    */

    user: {

        type: mongoose.Schema.Types.ObjectId,


        /*
            ref tells Mongoose which model this ObjectId
            refers to.

            "user" must match the model name used when
            creating the User model.

            This allows us to later use:

            .populate("user")

            to retrieve the associated user document.
        */

        ref: "user",


        /*
            Every account MUST be associated with a user.

            If user is missing, Mongoose validation will fail.
        */

        required: [
            true,
            "Account must be associated with a user."
        ],


        /*
            INDEX
            -----

            An index helps MongoDB find documents faster
            when searching/filtering using this field.

            Without an index:

                MongoDB may need to scan many documents.

            With an index:

                MongoDB can use the index structure to
                find matching documents more efficiently.

            MongoDB indexes are generally implemented using
            B-tree based structures.

            We will frequently search accounts using user,
            so indexing this field makes sense.
        */

        index: true
    },


    /*
        ACCOUNT STATUS
        --------------

        Every account can have one of three states:

            ACTIVE
            FROZEN
            CLOSED

        ACTIVE:
            Account can normally be used.

        FROZEN:
            Account temporarily cannot perform certain
            operations.

        CLOSED:
            Account has been permanently closed.
    */

    status: {

        /*
            The type must be String because our allowed
            values are strings.
        */

        type: String,


        /*
            ENUM
            ----

            enum restricts the value of a field to a
            predefined set of allowed values.

            Therefore these are valid:

                "ACTIVE"
                "FROZEN"
                "CLOSED"

            But this is NOT valid:

                "SUSPENDED"

            Mongoose will reject invalid values during
            validation.
        */

        enum: {

            values: [
                "ACTIVE",
                "FROZEN",
                "CLOSED"
            ],

            message:
                "Status can be either ACTIVE, FROZEN or CLOSED",

            
        },
        default: "ACTIVE"
    },


    /*
        CURRENCY
        --------

        Stores the currency in which this account operates.

        Example:

            INR
            USD
            EUR

        For our Bank Ledger project, INR is the default.
    */

    currency: {

        type: String,

        required: [
            true,
            "Currency is required for creating an account"
        ],

        /*
            If the user doesn't provide a currency,
            MongoDB/Mongoose will use INR automatically.
        */

        default: "INR"
    },


    /*
        BALANCE
        -------

        We intentionally DON'T store a balance directly
        inside the Account document.

        Instead, the balance will be derived/maintained
        using ledger entries.

        Example:

            Credit  +1000
            Debit   -200
            Debit   -100
            ----------------
            Balance = 700

        This gives us a proper transaction history and
        makes it possible to audit how the balance changed.
    */

}, {


    /*
        TIMESTAMPS
        ----------

        timestamps: true automatically adds:

            createdAt
            updatedAt

        createdAt:
            When the account was created.

        updatedAt:
            When the account was last modified.

        Mongoose automatically maintains these fields.
    */

    timestamps: true
});


/*
    COMPOUND INDEX
    --------------

    A compound index is an index created using
    MULTIPLE fields.

    Here we are indexing:

        user
        status

    So MongoDB creates an index based on both fields.

    This is useful for queries such as:

        "Find all ACTIVE accounts belonging to this user."

    Example query:

        Account.find({
            user: userId,
            status: "ACTIVE"
        });

    The compound index can help MongoDB perform this
    type of query efficiently.

    1 means ascending order.

        { user: 1, status: 1 }

    means:

        user  → ascending
        status → ascending

    IMPORTANT:

    A compound index is different from two separate indexes.

        index({ user: 1, status: 1 })

    is one compound index containing both fields.
*/

accountSchema.index({
    user: 1,
    status: 1
});


/*
    GET ACCOUNT BALANCE
    -------------------

    - Ye custom Mongoose instance method hai.
    - Is method ko kisi particular account document par call
      karke uska current balance calculate kar sakte hain.

    Example:

        const account = await accountModel.findById(accountId);

        const balance = await account.getBalance();

    - Balance Account document ke andar directly stored nahi hai.
    - Instead, hum us account ki ledger entries ko calculate karke
      current balance nikal rahe hain.

    BASIC FORMULA:

        Balance = Total CREDIT - Total DEBIT

    Example:

        CREDIT = 5000
        DEBIT  = 1500

        Balance = 5000 - 1500
                = 3500

    PROJECT RELATION:

        Account Model
             ↓
        getBalance()
             ↓
        Ledger Model
             ↓
        Ledger Entries
             ↓
        MongoDB Aggregation
             ↓
        Current Balance
*/


accountSchema.methods.getBalance = async function () {

    /*
        AGGREGATION PIPELINE
        --------------------

        - MongoDB aggregation pipeline ka use karke
          ledger entries se balance calculate kar rahe hain.

        - "this" current Account document ko represent karta hai.

        - Therefore:

            this._id

          current account ki MongoDB ID hai.
    */

    const balanceData = await ledgerModel.aggregate([


        /*
            $MATCH
            ------

            - Sirf current account ki ledger entries ko select karenge.

            Example:

                Account ID = ABC123

            To sirf:

                { account: ABC123 }

            wali ledger entries pipeline me aayengi.

            Isse doosre accounts ke transactions balance calculation
            me include nahi honge.
        */

        {
            $match: {
                account: this._id
            }
        },


        /*
            $GROUP
            ------

            - Ab filtered ledger entries ko ek group me combine kar rahe hain.

            - _id: null ka matlab hai ki hume individual groups nahi chahiye.
            - Hume current account ka ek combined result chahiye.

            Yahan hum do totals calculate kar rahe hain:

                1. totalDebit
                2. totalCredit
        */

        {
            $group: {

                _id: null,


                /*
                    TOTAL DEBIT

                    - Har ledger entry ka type check kar rahe hain.

                    - Agar type "DEBIT" hai:
                        amount ko totalDebit me add karo.

                    - Agar type "DEBIT" nahi hai:
                        0 add karo.

                    Example:

                        DEBIT  500 → +500
                        CREDIT 200 → +0
                        DEBIT  300 → +300

                        totalDebit = 800
                */

                totalDebit: {

                    $sum: {

                        $cond: [
                            {
                                $eq: [
                                    "$type",
                                    "DEBIT"
                                ]
                            },

                            "$amount",

                            0
                        ]
                    }
                },


                /*
                    TOTAL CREDIT

                    - Agar ledger entry ka type "CREDIT" hai,
                      uski amount ko totalCredit me add karenge.

                    - Agar type CREDIT nahi hai,
                      to 0 add hoga.

                    Example:

                        CREDIT 1000 → +1000
                        DEBIT  200  → +0
                        CREDIT 500  → +500

                        totalCredit = 1500
                */

                totalCredit: {

                    $sum: {

                        $cond: [
                            {
                                $eq: [
                                    "$type",
                                    "CREDIT"
                                ]
                            },

                            "$amount",

                            0
                        ]
                    }
                }
            }
        },


        /*
            $PROJECT
            --------

            - Ab hume final balance calculate karna hai.

            Formula:

                Balance = Total Credit - Total Debit

            IMPORTANT:

            MongoDB aggregation me kisi existing field ko reference
            karne ke liye field name ke beginning me "$" lagana padta hai.

            Therefore:

                "$totalCredit"
                "$totalDebit"

            ka matlab hai aggregation ke previous stage ke
            totalCredit aur totalDebit fields.

            Result example:

                totalCredit = 5000
                totalDebit  = 1500

                balance = 5000 - 1500
                        = 3500
        */

        {
            $project: {

                _id: 0,

                balance: {
                    $subtract: [
                        "$totalCredit",
                        "$totalDebit"
                    ]
                }
            }
        }
    ]);


    /*
        NO LEDGER ENTRIES
        -----------------

        - Agar account ki koi ledger entry nahi hai,
          aggregation empty array return karegi.

        - Is case me account ka balance logically 0 hai.

        Example:

            balanceData = []

            return 0
    */

    if (balanceData.length === 0) {
        return 0;
    }


    /*
        RETURN BALANCE
        --------------

        - Aggregation ke result me balance field available hai.

        Example:

            balanceData = [
                {
                    balance: 3500
                }
            ]

        - Isliye:

            balanceData[0].balance

          se calculated balance return kar rahe hain.
    */

    return balanceData[0].balance;
};


/*
    CREATE ACCOUNT MODEL
    --------------------

    mongoose.model() converts our schema into a Mongoose Model.

    The model provides methods such as:

        Account.create()
        Account.find()
        Account.findOne()
        Account.findById()
        Account.updateOne()
        Account.deleteOne()

    The model will interact with the MongoDB collection
    associated with this model.
*/

const accountModel = mongoose.model(
    "account",
    accountSchema
);


/*
    Export the Account model so that controllers/services
    can use it.
*/

module.exports = accountModel;