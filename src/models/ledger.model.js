const mongoose = require('mongoose');


/*
    LEDGER SCHEMA
    -------------

    Ledger ka main purpose account ke transactions ka
    permanent record maintain karna hai.

    IMPORTANT:
    Ledger entry create hone ke baad modify/delete nahi honi chahiye.

    Example:

        Account A
            ↓
        Transaction
            ↓
        Ledger Entry

    Agar Account A se ₹500 debit hua,
    to ledger me uska DEBIT entry permanently store hogi.
*/


const ledgerSchema = new mongoose.Schema({

    /*
        ACCOUNT

        - Ye ledger entry kis account se associated hai,
          us account ka MongoDB ObjectId store karega.

        - ref:"account" ka matlab hai ki ye ObjectId
          Account model/document ko refer karta hai.

        - required: Account ke bina ledger entry create nahi ho sakti.

        - index: Account ke basis par ledger entries ko
          efficiently search karne ke liye index create hoga.

        - immutable: true ka matlab create hone ke baad
          account ko change nahi kar sakte.

        Example:

            account: 123abc...
                ↓
            Account document
    */

    account: {

        type: mongoose.Schema.Types.ObjectId,

        ref:"account",

        required:[true,"Ledger must be associated with an account"],

        index: true,

        immutable: true

    },


    /*
        AMOUNT

        - Ye ledger entry me involved amount ko store karega.

        - Number type use kiya hai kyunki amount numerical value hai.

        - required: Ledger entry create karne ke liye amount mandatory hai.

        - immutable: Amount ko ledger entry create hone ke baad
          change nahi kar sakte.

        IMPORTANT:
        Ledger ek historical record hai, isliye amount ko
        baad me modify nahi karna chahiye.
    */

    amount:{

        type: Number,

        required:[true, "Amount is required for creating a ledger entry"],

        immutable: true

    },


    /*
        TRANSACTION

        - Ye ledger entry kis transaction ki wajah se create hui,
          us transaction ka ObjectId store karega.

        - ref:"transaction" ka matlab hai ki ye ObjectId
          Transaction model/document ko refer karta hai.

        - required: Har ledger entry ka kisi transaction se
          associated hona mandatory hai.

        - index: Transaction ke basis par ledger entry ko
          quickly search karne ke liye index use hoga.

        - immutable: Ek ledger entry ko create hone ke baad
          kisi doosre transaction ke saath associate nahi kar sakte.
    */

    transaction:{

        type:mongoose.Schema.Types.ObjectId,

        ref:"transaction",

        required:[true,"Ledger must be assosciated with a transaction"],

        index:true,

        immutable:true

    },


    /*
        TYPE

        - Ye batata hai ki transaction ka effect account par kya tha.

        CREDIT:
            Account me money add hui.

        DEBIT:
            Account se money deduct hui.

        - enum ensure karta hai ki sirf CREDIT ya DEBIT value
          store ho sake.

        - required: Har ledger entry ka type hona mandatory hai.

        - immutable: Entry create hone ke baad CREDIT ko DEBIT
          ya DEBIT ko CREDIT me change nahi kar sakte.

        Example:

            Money added    → CREDIT
            Money deducted → DEBIT
    */

    type: {

        type: String,

        enum: {

            values: ["CREDIT","DEBIT"],

            message: "Type can be either CREDIT or DEBIT",

        },

        required: [true, "Ledger type is required"],

        immutable: true

    }

})


/*
    PREVENT LEDGER MODIFICATION
    ---------------------------

    Ledger entries ko immutable rakhna important hai because
    ledger financial history ka permanent record hota hai.

    Is function ko kisi modification/delete operation ke
    before middleware ke through call kiya jayega.

    Agar koi ledger entry ko modify/delete karne ki koshish karega,
    to ye error throw karega aur operation stop ho jayega.
*/

function preventLedgerModification(){

    throw new Error("Ledger entries are immutable and cannot be modified or deleted");

}


/*
    MONGOOSE MIDDLEWARES
    --------------------

    Yahan hum different Mongoose operations ko intercept kar rahe hain.

    In operations ke execute hone se pehle
    preventLedgerModification() call hoga.

    Result:

        Modify/Delete Ledger
                ↓
        Middleware trigger
                ↓
        Error throw
                ↓
        Operation STOP
*/


/*
    findOneAndUpdate

    - findOneAndUpdate() ke through ledger update karne se rokega.
*/

ledgerSchema.pre('findOneAndUpdate',preventLedgerModification);


/*
    findOneAndReplace

    - Existing ledger document ko replace karne se rokega.
*/

ledgerSchema.pre('findOneAndReplace',preventLedgerModification);


/*
    findOneAndDelete

    - findOneAndDelete() ke through ledger delete karne se rokega.
*/

ledgerSchema.pre('findOneAndDelete',preventLedgerModification);


/*
    remove

    - remove() ke through ledger delete karne ki attempt
      ko block karega.

    NOTE:
    Modern Mongoose versions me remove() deprecated/removed
    ho sakta hai, depending on the version.
*/

ledgerSchema.pre('remove',preventLedgerModification);


/*
    deleteOne

    - deleteOne() ke through ledger delete karne se rokega.

    TYPO CHECK:
    Neeche original code me "ledeerSchema" likha hua tha.
    Correct variable "ledgerSchema" hona chahiye.
*/

ledgerSchema.pre('deleteOne',preventLedgerModification);


/*
    deleteMany

    - deleteMany() ke through multiple ledger entries
      delete karne se rokega.
*/

ledgerSchema.pre('deleteMany',preventLedgerModification);


/*
    updateOne

    - updateOne() ke through ledger modify karne se rokega.
*/

ledgerSchema.pre('updateOne',preventLedgerModification);
ledgerSchema.pre('updateMany',preventLedgerModification);


/*
    CREATE LEDGER MODEL
    -------------------

    Mongoose schema ko "ledger" model me convert kar rahe hain.

    Ye model MongoDB ke "ledgers" collection ke saath
    interact karne ke liye use hoga.
*/

const ledgerModel = mongoose.model('ledger',ledgerSchema);


/*
    EXPORT MODEL

    - ledgerModel ko export kar rahe hain taaki
      controllers/services me ise import karke
      ledger entries create/read kar saken.
*/

module.exports = ledgerModel;