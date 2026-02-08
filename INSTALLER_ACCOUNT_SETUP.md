# Installer Account Creation System

## Overview
This system allows installers to create accounts with username and password after completing their interview, enabling them to manage their own profiles.

## Features Implemented

### 1. Account Creation
- **Page**: `/create-account`
- Installers can create an account after completing their interview
- Username validation (3-20 characters, alphanumeric + underscores)
- Password validation (min 8 chars, uppercase, lowercase, number)
- Password confirmation

### 2. Installer Login
- **Page**: `/installer/login`
- Username/password authentication
- JWT token-based session management
- Redirects to profile page after login

### 3. Profile Management
- **Page**: `/installer/profile`
- View interview results and status
- Edit profile information (phone, vehicle description)
- View qualifications, skills, and insurance status
- Secure access with token verification

### 4. Interview Completion Flow
- After interview completion, installers are prompted to create an account
- If account already exists, they can go directly to login
- Seamless redirect to account creation with installer ID and email

## Database Schema Updates Required

You need to add the following fields to your `Installer` model in Prisma:

```prisma
model Installer {
  // ... existing fields ...
  username        String?  @unique
  passwordHash    String?
  // ... rest of fields ...
}
```

### Migration Steps

1. **Update Prisma Schema** (if you have one):
   ```bash
   # Add username and passwordHash fields to Installer model
   ```

2. **Create and run migration**:
   ```bash
   npx prisma migrate dev --name add_installer_account_fields
   ```

   Or if using `db push`:
   ```bash
   npx prisma db push
   ```

3. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

## Required Dependencies

Install the following packages:

```bash
npm install bcryptjs @types/bcryptjs
```

## API Endpoints

### Create Account
- **POST** `/api/installers/create-account`
- Body: `{ installerId?, email?, username, password }`
- Creates username and hashed password for installer

### Login
- **POST** `/api/installers/login`
- Body: `{ username, password }`
- Returns JWT token and installer info

### Verify Token
- **POST** `/api/installers/verify`
- Body: `{ token }`
- Verifies JWT token and returns installer info

## Security Notes

1. **Password Hashing**: Uses bcryptjs with salt rounds of 10
2. **Token Security**: JWT tokens expire after 30 days
3. **Token Secret**: Uses `JWT_SECRET` or `NEXTAUTH_SECRET` from environment variables
4. **Username Uniqueness**: Enforced at database level with unique constraint

## User Flow

1. Installer completes interview
2. Interview completion page shows results
3. If no account exists, installer sees "Create Account" button
4. Installer creates account with username and password
5. Redirected to login page
6. Installer logs in
7. Access to profile management page

## Environment Variables

Make sure you have these set:
- `JWT_SECRET` or `NEXTAUTH_SECRET` - For JWT token signing
- `DATABASE_URL` - Your database connection string

## Testing

1. Complete an interview
2. You should see the account creation prompt
3. Create an account
4. Log in with your credentials
5. View and edit your profile

## Notes

- The system uses localStorage to store the JWT token (client-side)
- For production, consider using httpOnly cookies for better security
- The token verification happens on each profile page load
- If token is invalid or expired, user is redirected to login
