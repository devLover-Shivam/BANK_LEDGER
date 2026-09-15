require("dotenv").config();
const express = require("express");

const cookieParser = require("cookie-parser");


const authRouter = require("./routes/auth.routes")

const accountRouter = require("./routes/account.routes")

const transactionsRoutes = require("./routes/transactions.route");

const app = express();

app.use(express.json());

app.use(cookieParser());
app.get("/",(req,res) =>{
    res.send("Ledger Service Is Up And RUNNING BUDDY !!!")
})
app.use("/api/auth", authRouter);
app.use("/api/accounts",accountRouter);
app.use("/api/transactions", transactionsRoutes)  
module.exports =app;