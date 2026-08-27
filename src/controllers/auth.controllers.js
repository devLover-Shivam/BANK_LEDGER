const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
console.log("USER MODEL:", userModel);
console.log("TYPE:", typeof userModel);
console.log("FIND ONE:", typeof userModel.findOne);

/*
    USER REGISTER CONTROLLER
    ------------------------

    POST -> /api/auth/register

    This controller performs the following operations:

    1. Gets email, password and name from the request body.

    2. Checks whether a user already exists with the
       provided email.

    3. If the email already exists, registration is stopped.

    4. If the email doesn't exist, a new user is created.

    5. A JWT token is generated for the newly registered user.

    6. The JWT token is stored inside a cookie.

    7. User information and the token are sent back
       as the response.
*/

async function userRegisterController(req, res) {

    const { email, password, name } = req.body;


    /*
        Check whether a user with the given email
        already exists in the database.
    */

    const ifEmailExists = await userModel.findOne({
        email: email
    });


    /*
        If a user already exists with this email,
        stop the registration process.
    */

    if (ifEmailExists) {

        return res.status(422).json({
            message: "User Already Exists With This Email.",
            status: "failed"
        });

    }


    /*
        Create a new user.

        The password will be hashed by the
        userSchema.pre("save") middleware before
        the document is actually saved to MongoDB.
    */

    const user = await userModel.create({
        email,
        password,
        name
    });


    /*
        Generate a JWT token for the newly created user.

        The token contains the user's MongoDB _id.

        expiresIn: "3d" means the token will become
        invalid after 3 days.
    */

    const token = jwt.sign(
        {
            userID: user._id
        },

        process.env.JWT_PRIVATE_KEY,

        {
            expiresIn: "3d"
        }
    );


    /*
        Store the JWT token inside a cookie.

        cookie-parser is NOT required to set a cookie
        using res.cookie().

        cookie-parser is mainly used to read cookies
        from incoming requests using req.cookies.
    */

    res.cookie("token", token);


    /*
        Send the newly registered user's information
        back to the client.

        We intentionally do NOT send the password
        in the response.
    */

    return res.status(201).json({

        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        },

        token
    });
}


module.exports = {
    userRegisterController
};