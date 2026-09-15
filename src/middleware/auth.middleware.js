// Middleware to verify whether the request comes from a valid logged-in user.
// It checks the JWT before allowing access to protected routes.

const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const tokenBlackListModel = require("../models/blackList.model");


async function authMiddleware(req, res, next) {

    // Get JWT from cookie or Authorization header.
    const token =
        req.cookies.token ||
        req.headers.authorization?.split(" ")[1];


    // Token is required for protected routes.
    if (!token) {
        return res.status(401).json({
            message: "Unauthorised Access, token is missing."
        });
    }


    // Check whether the token was revoked during logout.
    const isBlacklisted = await tokenBlackListModel.findOne({ token });

    if (isBlacklisted) {
        return res.status(401).json({
            message: "Unauthorised Access, token is invalid"
        });
    }


    // Verify JWT signature and expiry.
    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_PRIVATE_KEY
        );

        // Find the user associated with the token.
        const user = await userModel.findById(decoded.userID);

        // Store user data in req so controllers can access it.
        req.user = user;

        return next();

    } catch (err) {

        // Token is invalid or expired.
        return res.status(401).json({
            message: "Unauthorised Access, token is invalid."
        });
    }
}


async function authSystemUserMiddleware(req, res, next) {

    // Get JWT from cookie or Authorization header.
    const token =
        req.cookies.token ||
        req.headers.authorization?.split(" ")[1];


    // Token is required for protected routes.
    if (!token) {
        return res.status(401).json({
            message: "Unauthorised Access, token is missing."
        });
    }


    // Reject tokens that were revoked during logout.
    const isBlacklisted = await tokenBlackListModel.findOne({ token });

    if (isBlacklisted) {
        return res.status(401).json({
            message: "Unauthorised Access, token is invalid"
        });
    }


    try {

        // Verify JWT signature and expiry.
        const decoded = jwt.verify(
            token,
            process.env.JWT_PRIVATE_KEY
        );

        // Find user and include the systemUser field.
        const user = await userModel
            .findById(decoded.userID)
            .select("+systemUser");


        // Only users marked as system users can access this route.
        if (!user.systemUser) {
            return res.status(403).json({
                message: "Forbidden Access, not a system user"
            });
        }


        // Store authenticated system user in req.
        req.user = user;

        return next();

    } catch (err) {

        // Token is invalid or expired.
        return res.status(401).json({
            message: "Unauthorized Access, token is invalid."
        });
    }
}


module.exports = {
    authMiddleware,
    authSystemUserMiddleware
};