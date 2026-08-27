const userModel= require("../models/user.model");
const jwt = require("jsonwebtoken");
/* user register controller and POST -> /api/auth/register*/
async function userRegisterController(req,res){
    const {email, password, name} = req.body;

    const ifEmailExists = await userModel.findOne({
        email: email
    })

    if(ifEmailExists){
        return res.status(422).json({
            message: "User Already Exists With This Email.",
            status: "failed"
        })
    }

    //now we're creating a new user

    const user = await userModel.create({
        email, password, name
    })
    //now we need to send a token to the user after its registration.

    const token = jwt.sign(
        {userID: user._id}
    ,
        process.env.JWT_PRIVATE_KEY
    )
}   

module.exports = {
    userRegisterController
}