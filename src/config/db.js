const mongoose = require("mongoose");

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("Server Connected To Database Successfully!");
    } catch (err) {
        console.log("Error Connecting To Database:", err.message);

        /* If the server cannot connect to the database, there is no point in keeping the server running because database operations will fail.
        -> Therefore, we terminate the process to avoid wasting server resources. */
        process.exit(1);
    }
}

module.exports = connectDB;