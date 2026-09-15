const accountModel = require("../models/account.model");

// we need to check first whether the request is coming from a valid logged in user or not?

//creating an account for the user and sending it back , this is the main functionality of the account controller.

async function createAccountController(req,res){
    const user = req.user;

    const account  = await accountModel.create({
        user:user._id
    })

    res.status(201).json({
        account
    })
}

async function getUserAccountsController(req, res) {

    const accounts = await accountModel.find({
        user: req.user._id
    }).populate("user", "name email");

    return res.status(200).json({
        accounts
    });
}

async function getAccountBalanceController(req,res){
    const {accountId} = req.params;

    const account =await accountModel.findOne({
        _id:accountId,
        user: req.user._id
    })

    if(!account) {
        return res.status(404).json({
            message: "Account Not Found!"
        })
    }

    const balance = await account.getBalance();

    res.status(200).json({
        accountId: account._id,
        balance:balance
    })
}

module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController
}