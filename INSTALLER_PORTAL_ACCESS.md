# Installer Portal Access Guide

## Where Installers Can Access Their Portal

Installers can access their login portal from multiple locations:

### 1. **Home Page Navigation** 🏠
- **Location**: Top navigation bar on the home page (`/`)
- **Button**: "Installer Portal" link
- **Direct URL**: `/installer/login`

### 2. **Dedicated Installer Portal Page** 🚪
- **URL**: `/installer`
- **Features**:
  - Clear portal landing page
  - Login button
  - Information about portal features
  - Link to create account if needed

### 3. **After Interview Completion** ✅
- If installer has an account: "View My Profile" button appears
- If installer doesn't have an account: "Create Account" button appears
- After account creation: Redirects to login page

### 4. **Account Creation Page** 📝
- Link at bottom: "Already have an account? Sign in here"
- After successful account creation: "Go to Login" button

### 5. **Footer Links** 🔗
- Footer on home page includes "Installer Portal" link
- Accessible from any page with the footer

## Direct Access URLs

- **Portal Landing**: `https://your-domain.com/installer`
- **Login Page**: `https://your-domain.com/installer/login`
- **Profile Page**: `https://your-domain.com/installer/profile` (requires login)
- **Create Account**: `https://your-domain.com/create-account`

## User Flow

1. **New Installer**:
   - Completes interview → Sees "Create Account" button
   - Creates account → Redirected to login
   - Logs in → Accesses profile

2. **Returning Installer**:
   - Visits home page → Clicks "Installer Portal"
   - Or visits `/installer` directly
   - Logs in with username/password
   - Accesses profile

3. **Forgot Login**:
   - Can access portal at `/installer`
   - Can create new account if needed (if email matches)

## Features Available in Portal

Once logged in, installers can:
- ✅ View interview results and scores
- ✅ See qualification status
- ✅ Update profile information (phone, vehicle)
- ✅ View qualifications and skills
- ✅ Check insurance and licensing status

## Navigation Structure

```
Home Page (/)
├── Navigation Bar
│   ├── Sign In (Admin)
│   ├── Installer Portal → /installer/login
│   └── Start Interview
└── Footer
    └── Installer Portal → /installer

Installer Portal (/installer)
├── Login Button → /installer/login
└── Create Account Link → /create-account

Login Page (/installer/login)
└── After Login → /installer/profile

Profile Page (/installer/profile)
└── Logout → /installer/login
```

## Making It Easy to Find

The installer portal is now easily accessible from:
1. ✅ Main navigation (home page)
2. ✅ Dedicated portal landing page
3. ✅ Footer links
4. ✅ Interview completion flow
5. ✅ Account creation flow

Installers should have no trouble finding their login portal!
