const accountModel = require("../models/account.model");

// we need to check first whether the request is coming from a valid logged in user or not?

//creating an account for the user and sending it back , this is the main functionality of the account controller.

async function createAccountController(req,res){
    const user = req.user;

    const account  = await accountmModel.create({
        user:user._id
    })

    res.status(201).json({
        account
    })
}

module.exports = {
    createAccountController
}