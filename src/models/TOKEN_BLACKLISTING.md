# Token Blacklisting

## What is Token Blacklisting?

JWT authentication is normally **stateless**. Once a token is issued, it remains valid until it expires.

The problem:

```text
User Login
    ↓
JWT issued (valid for 3 days)
    ↓
User Logout
    ↓
JWT may still be valid
```

Token blacklisting allows the server to explicitly **revoke a JWT before its normal expiry time**.

```text
User Logout
    ↓
JWT stored in blacklist
    ↓
Future request with same JWT
    ↓
Blacklist check
    ↓
Token found → Reject request
```

## Why is it needed?

Without blacklisting, logging out does not necessarily invalidate an already-issued JWT.

If someone obtains a user's valid token, they may be able to make authenticated requests until the token expires.

With blacklisting:

```text
JWT stolen
    ↓
User logs out / token is revoked
    ↓
JWT added to blacklist
    ↓
Attacker tries using token
    ↓
Blacklist check → FOUND
    ↓
Access denied
```

Useful for:
- Logout
- Manual token revocation
- Emergency session invalidation
- Limiting the lifetime of compromised sessions

## What happens if the token is NOT blacklisted?

A token generally passes authentication when:

1. The token exists.
2. Its signature is valid.
3. It has not expired.
4. It is not blacklisted.
5. The user has permission for the requested operation.

```text
Request
  ↓
Extract JWT
  ↓
Verify JWT
  ↓
Check expiry
  ↓
Check blacklist
  ↓
Not blacklisted
  ↓
Continue request
```

**Important:** Blacklisting does not replace JWT verification. It is an additional revocation check.

## How can an attacker obtain a JWT?

A token can potentially be exposed through:

### 1. XSS
If a token is stored somewhere accessible to JavaScript, malicious JavaScript injected through an XSS vulnerability may steal it.

Using an `HttpOnly` cookie prevents normal client-side JavaScript from directly reading that cookie.

### 2. Malware or malicious browser extensions
Malware or untrusted extensions may potentially access sensitive browser/session information.

### 3. Insecure logging
Accidentally logging tokens can expose them through server logs, monitoring systems, debugging output, or log aggregation systems.

### 4. Insecure transport
Authentication data sent without HTTPS can potentially be intercepted.

Use HTTPS in production.

### 5. Accidental exposure
Tokens can accidentally be exposed through Git repositories, screenshots, error messages, URLs, or frontend console logs.

## What happens if an attacker gets the token?

A stolen valid JWT can potentially be used as the authenticated user until it expires or is revoked.

```text
Attacker gets JWT
      ↓
Sends JWT to protected API
      ↓
Server verifies JWT
      ↓
JWT is valid
      ↓
Server may treat attacker as the user
```

Depending on authorization rules, this could allow the attacker to:
- Access protected resources
- View private information
- Perform actions as the user
- Modify or delete resources
- Perform transactions if the account has transaction permissions

For a banking application, token theft is particularly serious because an authenticated session may have access to financial operations.

## TTL (Time To Live)

Blacklist records do not need to remain in MongoDB forever.

A TTL index can automatically remove old blacklist entries:

```js
tokenBlackListSchema.index(
    { createdAt: 1 },
    {
        expireAfterSeconds: 60 * 60 * 24 * 3
    }
);
```

This removes blacklist documents approximately **3 days after `createdAt`**.

This is useful when the JWT itself has a maximum lifetime of around 3 days.

## Schema Used in the Project

```js
const tokenBlackListSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [true, "Token is required to blacklist."],
        unique: true
    }
}, {
    timestamps: true
});
```

The `token` field stores the JWT that has been revoked.

`unique: true` prevents the same token from being inserted into the blacklist multiple times.

## Simple Mental Model

Think of a JWT as an entry pass:

```text
JWT
 ↓
"I am an authenticated user"
 ↓
Server verifies it
 ↓
Access granted
```

Blacklist = **cancelled entry-pass list**:

```text
JWT
 ↓
User logs out
 ↓
JWT → Blacklist
 ↓
Same JWT used again
 ↓
FOUND in blacklist
 ↓
Access denied
```

### In one line

> **JWT tells the server who you are; token blacklisting tells the server that a previously valid JWT has been revoked.**
