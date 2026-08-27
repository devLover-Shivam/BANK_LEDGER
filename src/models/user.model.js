const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,

            required: [true, "Email is required for creating a user."],

            trim: true,

            lowercase: true,

            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                "Please fill a valid email address"
            ],

            unique: [true, "Email Already Exists"]
        },

        name: {
            type: String,

            required: [true, "Name is required"],

            trim: true
        },

        password: {
            type: String,

            required: [true, "Password is required"],

            minlength: [6, "Password should contain at least 6 characters"],

            /*
                1. By default, Mongoose includes this field whenever
                   we query for a user.

                2. Setting select to false tells Mongoose to exclude
                   the password field from query results by default.

                3. If we explicitly need the password, we can include it
                   using:
                   
                   .select("+password")
            */
            select: false
        }
    },
    {
        /*
            1. timestamps automatically adds two fields to our documents:

               createdAt → tells us when the document was created.
               updatedAt → tells us when the document was last updated.

            2. Mongoose automatically manages these two fields for us.
        */
        timestamps: true
    }
);


/*
    PASSWORD HASHING
    ----------------

    1. We should NEVER store a user's plain-text password
       directly inside the database.

    2. Instead, we convert the plain-text password into a
       one-way hash using bcrypt.

    3. Hashing is one-way:
       
       Plain password → Hash

       We cannot simply reverse the hash back into the
       original password.

    4. bcryptjs is the package that performs this hashing.
*/


userSchema.pre("save", async function () {

    /*
        1. This middleware runs before a user document
           is saved to MongoDB.

        2. isModified("password") checks whether the password
           has been created or changed.

        3. If the password has NOT been modified, we don't
           hash it again.

        4. This is important when updating other user information.

           Example:

           User changes name
                ↓
           Password hasn't changed
                ↓
           Don't hash the already-hashed password again.
    */

    if (!this.isModified("password")) {
        return ;
    }


    /*
        1. bcrypt.hash() converts the plain-text password
           into a secure hash.

        2. The first argument is the password we want to hash.

        3. The second argument (10) is the number of salt rounds.

        4. Higher salt rounds make hashing more computationally
           expensive, which makes brute-force attacks harder.

        5. bcrypt automatically generates a random salt and
           incorporates it into the resulting hash.
    */

    const hash = await bcrypt.hash(this.password, 10);


    /*
        IMPORTANT:

        We generated the hash above, but we still need to replace
        the plain-text password with the generated hash.

        Otherwise, the plain-text password would still be stored
        in the database.
    */

    this.password = hash;

    
});


/*
    COMPARE PASSWORD
    ----------------

    1. This method is used during login to check whether the
       password entered by the user matches the hashed password
       stored in the database.

    2. bcrypt.compare() takes two values:

       password      → plain-text password entered during login.
       this.password  → hashed password stored in the database.

    3. bcrypt internally compares them and returns:
       
       true  → passwords match.
       false → passwords don't match.

    4. We don't decrypt the stored hash. bcrypt performs the
       comparison securely without reversing the hash.
*/

userSchema.methods.comparePassword = async function (password) {

    return await bcrypt.compare(password, this.password);
}
 const userModel = mongoose.model("user", userSchema);

module.exports = userModel;

// now the next step from here will be creating endpoints where a user can login as well as register. for this we will create new folder named routes.
