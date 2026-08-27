const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");


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

/* 
    USER LOGIN CONTROLLER
    ---------------------

    POST -> /api/auth/login

    Login process:

    1. Get email and password from the request body.
    2. Find the user using the provided email.
    3. If the user doesn't exist, return an error.
    4. Compare the entered password with the stored hashed password.
    5. If the password is incorrect, return an error.
    6. If both email and password are correct, generate a JWT.
    7. Store the JWT inside a cookie.
    8. Send the user details and token back to the client.
*/

async function userLoginController(req, res) {

    // Get the email and password entered by the user.

    const { email, password } = req.body;


    /*
        Find the user using the email.

        By default, the password field is excluded from
        the query because our schema contains:

        select: false

        But we need the hashed password during login so that
        bcrypt.compare() can compare the entered password
        with the stored hash.

        .select("+password") explicitly tells Mongoose:

        "Include the password field in this particular query."

        Important:
        This does NOT make the password visible to the client.
        It only includes the password field in this Mongoose
        query result so that we can perform password verification.
    */

    const user = await userModel
        .findOne({ email })
        .select("+password");


    /*
        If no user was found with the provided email,
        stop the login process.

        We use the same error message for invalid email
        and invalid password so that we don't reveal whether
        an email exists in our database.
    */

    if (!user) {

        return res.status(401).json({
            message: "Email Or Password is INVALID"
        });
    }


    /*
        The user exists.

        Now compare the password entered during login
        with the hashed password stored in the database.

        comparePassword() internally uses bcrypt.compare().
    */

    const isValidPassword = await user.comparePassword(password);


    /*
        If the entered password does not match the stored
        hashed password, stop the login process.
    */

    if (!isValidPassword) {

        return res.status(401).json({
            message: "Email Or Password is INVALID"
        });
    }


    /*
        Both email and password are valid.

        Now generate a JWT token.

        The token contains the user's ID so that we can
        identify the authenticated user in future requests.

        The token will expire after 3 days.
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

        The browser can then automatically send this cookie
        with subsequent requests to our server.
    */

    res.cookie("token", token);


    /*
        Login was successful.

        Send the user's basic information and the JWT token
        back to the client.

        We intentionally do NOT send the password.
    */

    return res.status(200).json({
        message: "LOGIN SUCCESSFUL",
        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        },

        token
    });
}

module.exports = {
    userRegisterController,
    userLoginController
};