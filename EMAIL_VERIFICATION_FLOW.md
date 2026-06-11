# Email Verification Flow for First-Time Password Creation

## Overview
The account creation process now uses email verification for enhanced security. Installers verify their email before creating a password.

## New Flow

### 1. **Request Email Verification** (`/create-account`)
- Installer enters their email (pre-filled from interview)
- System sends verification email with unique token
- Installer sees "Check Your Email" message

### 2. **Verify Email** (`/verify-email?token=...&email=...`)
- Installer clicks link in email
- System verifies token and marks email as verified
- Redirects to password setup page

### 3. **Create Password** (`/setup-password`)
- Installer creates secure password
- System automatically generates username from email
- Account is created and installer can log in

## Database Changes

Added new fields to `Installer` model:
- `emailVerificationToken` - Token sent in verification email
- `emailVerifiedAt` - Timestamp when email was verified
- `passwordResetToken` - For future password reset functionality

## API Endpoints

### Send Verification Email
- **POST** `/api/installers/send-verification`
- Body: `{ email?, installerId? }`
- Generates token and sends verification email
- Returns verification URL in development mode

### Verify Email
- **POST** `/api/installers/verify-email`
- Body: `{ token, email }`
- Verifies token and marks email as verified
- Returns installer ID for password setup

### Create Account (Password Setup)
- **POST** `/api/installers/create-account`
- Body: `{ installerId?, email?, password }`
- Requires email to be verified first
- Auto-generates username from email
- Creates password hash

## Security Features

1. **Email Verification Required**: Password cannot be created without verified email
2. **Token Expiration**: Verification tokens expire after 24 hours
3. **Auto Username Generation**: Username generated from email (no user input needed)
4. **Password Validation**: Enforces strong password requirements
5. **Email/Username Login**: Users can log in with either email or username

## User Experience

### For New Installers:
1. Complete interview → See "Create Account" button
2. Enter email → Receive verification email
3. Click link in email → Email verified
4. Create password → Account ready
5. Log in with email or username

### For Returning Installers:
- Can log in with email or username
- Username is auto-generated from email (e.g., `john.doe` from `john.doe@example.com`)

## Email Integration

Currently, the system logs verification links in development mode. For production, you'll need to integrate an email service:

### Recommended Services:
- **Resend** (recommended for Next.js)
- **SendGrid**
- **AWS SES**
- **Nodemailer** (with SMTP)

### Example Email Template:
```
Subject: Verify your email to create your installer account

Hi [FirstName],

Click the link below to verify your email and create your password:

[Verification Link]

This link expires in 24 hours.

If you didn't request this, please ignore this email.
```

## Development Mode

In development, the verification URL is returned in the API response and displayed on the page. This allows testing without setting up email service.

## Migration Notes

- Existing installers without accounts will need to verify email
- Username field is now optional (auto-generated)
- Email verification is required before password creation
- Login accepts both email and username

## Testing

1. Complete an interview
2. Go to create account page
3. Enter email (or use pre-filled)
4. In dev mode, copy verification URL from page
5. Visit verification URL
6. Create password
7. Log in with email or username
