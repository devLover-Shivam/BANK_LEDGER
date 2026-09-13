//this is a middleware whose main purpose is to verify whether the request coming from a valid logged in user or not.
//it'll verify whether the token is valid or not
const userModel = require("../models/user.model");

const jwt  = require("jsonwebtoken");
//here we're checking where the token is stored in the cookies or in the header
async function authMiddleware(req, res, next){
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]

    if(!token){
        return res.status(401).json({
            message: "Unauthorised Access, token is missing."
        })
    }
    //using try catch to verify the token
    try{
        //verifying the token here
        const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY);
        
        const user = await userModel.findById(decoded.userID);
        req.user = user;
        return next();
    }
    catch(err){
        return res.status(401).json({
            message:"Unauthorised Access, token is invalid."
        })
    }
}

module.exports = {
    authMiddleware
}