require("dotenv").config();

const nodemailer = require("nodemailer");


/*
    TRANSPORTER
    -----------

    1. Transporter is responsible for connecting our
       application with the email server.

    2. In our case, Gmail's SMTP service is being used.

    3. SMTP stands for Simple Mail Transfer Protocol.

    4. It is the protocol used for sending emails
       between email servers.
*/

const transporter = nodemailer.createTransport({

    service: "gmail",

    auth: {
        type: "OAuth2",

        user: process.env.EMAIL_USER,

        clientId: process.env.CLIENT_ID,

        clientSecret: process.env.CLIENT_SECRET,

        refreshToken: process.env.REFRESH_TOKEN
    }
});


/*
    VERIFY EMAIL SERVER CONNECTION
    ------------------------------

    1. transporter.verify() checks whether the transporter
       is correctly configured and can connect to the
       email server.

    2. This does NOT send an email.

    3. It only verifies the email configuration.
*/

transporter.verify((error, success) => {

    if (error) {

        console.error(
            "Error connecting to email server:",
            error
        );

    } else {

        console.log(
            "Email server is ready to send messages"
        );
    }
});


/*
    SEND EMAIL
    ----------

    This is a reusable function responsible for actually
    sending an email.

    Parameters:

    to      → receiver's email address
    subject → email subject
    text    → plain-text version of email
    html    → HTML version of email
*/

const sendEmail = async (to, subject, text, html) => {

    try {

        const info = await transporter.sendMail({

            from: `"BANK LEDGER" <${process.env.EMAIL_USER}>`,

            to,

            subject,

            text,

            html
        });


        console.log(
            "Message sent:",
            info.messageId
        );


    } catch (error) {

        console.error(
            "Error sending email:",
            error
        );

        throw error;
    }
};


/*
    REGISTRATION EMAIL
    ------------------

    This function creates the email content specifically
    for a newly registered user and then uses sendEmail()
    to actually send it.
*/

async function sendRegistrationEmail(userEmail, name) {

    const subject = "Welcome to Bank Ledger!";


    /*
        Plain-text version of the email.

        This is useful for email clients that don't
        support HTML emails.
    */

    const text = `
Hello ${name},

Thank you for registering at Bank Ledger.

Your account has been successfully created.

Registered Email: ${userEmail}

Regards,
Bank Ledger Team
`;


    /*
        HTML version of the email.

        This provides formatting such as headings,
        paragraphs and line breaks.
    */

    const html = `
        <h2>Welcome to Bank Ledger, ${name}!</h2>

        <p>
            Your account has been successfully created.
        </p>

        <p>
            You can now log in and start using your
            Bank Ledger account.
        </p>

        <p>
            Registered Email: ${userEmail}
        </p>

        <br>

        <p>
            Thank you for choosing Bank Ledger.
        </p>

        <p>
            Regards,<br>
            Bank Ledger Team
        </p>
    `;


    /*
        Now actually send the registration email.

        sendRegistrationEmail() is responsible for preparing
        the content, while sendEmail() is responsible for
        sending it.

        This keeps the responsibilities separated.
    */

    await sendEmail(
        userEmail,
        subject,
        text,
        html
    );
}

async function sendTransactionEmail(
    userEmail,
    name,
    amount,
    transactionId,
    transactionType,
    status
) {

    const subject = "Bank Ledger - Transaction Update";


    /*
        Plain-text version of the email.

        - Ye email ka simple text version hai.
        - Agar email client HTML support nahi karta,
          to ye version display hoga.
    */

    const text = `
Hello ${name},

Your transaction has been processed on Bank Ledger.

Transaction Details:

Transaction ID: ${transactionId}
Transaction Type: ${transactionType}
Amount: ₹${amount}
Status: ${status}

Thank you for using Bank Ledger.

Regards,
Bank Ledger Team
`;


    /*
        HTML version of the email.

        - Ye email ka formatted version hai.
        - HTML ki help se transaction details ko
          clearly present kar sakte hain.
    */

    const html = `
        <h2>Bank Ledger - Transaction Update</h2>

        <p>
            Hello ${name},
        </p>

        <p>
            Your transaction has been processed successfully
            on Bank Ledger.
        </p>

        <h3>Transaction Details</h3>

        <p>
            <strong>Transaction ID:</strong> ${transactionId}
        </p>

        <p>
            <strong>Transaction Type:</strong> ${transactionType}
        </p>

        <p>
            <strong>Amount:</strong> ₹${amount}
        </p>

        <p>
            <strong>Status:</strong> ${status}
        </p>

        <br>

        <p>
            Thank you for using Bank Ledger.
        </p>

        <p>
            Regards,<br>
            Bank Ledger Team
        </p>
    `;


    /*
        SEND TRANSACTION EMAIL

        - sendTransactionEmail() transaction-specific email
          ka content prepare karta hai.
        - sendEmail() actual email send karne ki responsibility
          handle karta hai.
        - Isse email preparation aur email sending ki
          responsibilities separate rehti hain.
    */




    await sendEmail(
        userEmail,
        subject,
        text,
        html
    );
}

// ============================================================
// SEND TRANSACTION FAILURE EMAIL
// ============================================================

/*
    This function sends an email to the user when a transaction
    could not be completed successfully.

    It follows the same structure as sendTransactionEmail():

    userEmail       → User's email address
    name            → User's name
    amount          → Transaction amount
    transactionId   → ID of the failed transaction
    transactionType → Type of transaction
    status          → FAILED / REVERSED etc.
*/

async function sendTransactionFailureEmail(
    userEmail,
    name,
    amount,
    transactionId,
    transactionType,
    status
) {

    const subject = "Bank Ledger - Transaction Failed";


    // Plain-text version of the email.
    const text = `
Hello ${name},

Unfortunately, your transaction could not be completed on Bank Ledger.

Transaction Details:

Transaction ID: ${transactionId}
Transaction Type: ${transactionType}
Amount: ₹${amount}
Status: ${status}

Please check your account or try again later.

Thank you for using Bank Ledger.

Regards,
Bank Ledger Team
`;


    // HTML version of the same email.
    const html = `
        <h2>Bank Ledger - Transaction Failed</h2>

        <p>Hello ${name},</p>

        <p>
            Unfortunately, your transaction could not be
            completed successfully on Bank Ledger.
        </p>

        <h3>Transaction Details</h3>

        <p>
            <strong>Transaction ID:</strong> ${transactionId}
        </p>

        <p>
            <strong>Transaction Type:</strong> ${transactionType}
        </p>

        <p>
            <strong>Amount:</strong> ₹${amount}
        </p>

        <p>
            <strong>Status:</strong> ${status}
        </p>

        <br>

        <p>
            Please check your account or try again later.
        </p>

        <p>
            Thank you for using Bank Ledger.
        </p>

        <p>
            Regards,<br>
            Bank Ledger Team
        </p>
    `;


    // Reuse the common sendEmail() function
    // instead of creating a new Nodemailer transporter.
    await sendEmail(
        userEmail,
        subject,
        text,
        html
    );
}

module.exports = {
    sendEmail,
    sendRegistrationEmail,
    sendTransactionEmail,
    sendTransactionFailureEmail,
    transporter
};