# App Flow

## User Journeys

### New User Flow
```
Landing → Sign Up → Email Verification → Onboarding → Home (filtered by specialty)
```

### Returning User Flow
```
Landing → Sign In → Home (with saved filters)
```

### Admin Flow
```
Sign In → Admin Toggle → Admin Dashboard → [Analytics | Roles | Messaging | Resources]
```

## Screen Map

### Public Screens
- **Landing/Login** - Sign in or sign up

### User Screens
- **Home** - Resource browser with filters
- **Resource Detail** - Full resource view with actions (favorite, note)
- **Favorites** - Saved resources
- **Upcoming Cases** - Case tracker
- **Profile** - User settings, specialty preferences
- **Legal Pages** - Privacy, Terms, Disclaimers, About, Contact

### Admin Screens
- **Admin Dashboard** - Overview and navigation
- **Analytics** - Usage charts and metrics
- **Role Management** - Assign/revoke admin roles
- **Messaging** - Contact list and conversations
- **Resource Management** - CRUD for resources
- **Reported Resources** - Review flagged content
- **Sponsorship Inquiries** - Manage sponsor requests

## Navigation

### User Navigation
- Header: Logo, dark mode toggle, profile menu
- Sidebar: Specialty/subspecialty filters
- Footer: Legal links

### Admin Navigation
- Toggle between User/Admin views
- Admin sidebar with section links
- Breadcrumb for context

## State Transitions

### Authentication States
```
LOGGED_OUT → LOGGING_IN → LOGGED_IN
LOGGED_IN → LOGGING_OUT → LOGGED_OUT
```

### View States
```
USER_VIEW ↔ ADMIN_VIEW (for admin users only)
```

### Resource States
```
LOADING → LOADED → FILTERED → SEARCHED
```
