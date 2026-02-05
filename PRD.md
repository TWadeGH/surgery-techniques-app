# Product Requirements Document (PRD)

## Product Overview

**Surgical Techniques** is a mobile-first web application that provides surgeons and surgical residents/fellows with quick access to curated surgical technique resources, organized by specialty and subspecialty.

## Target Users

1. **Surgeons** - Practicing surgeons looking for technique references
2. **Residents/Fellows** - Surgical trainees learning procedures

## Core Features

### 1. Authentication
- Email/password sign-in
- Google OAuth sign-in
- Password reset flow
- Session persistence

### 2. Resource Browsing
- Filter by specialty (e.g., Orthopedic Surgery)
- Filter by subspecialty (e.g., Sports Medicine)
- Search within filtered results
- Resource cards with title, description, preview image
- External link to source material
- Optional implant info links

### 3. User Features
- **Favorites:** Save resources for quick access
- **Notes:** Add personal notes to resources
- **Upcoming Cases:** Track procedures with dates and notes

### 4. Onboarding
- Multi-step flow for new users
- Specialty/subspecialty selection
- User type selection (Surgeon vs Resident/Fellow)

### 5. Admin Features
- **Analytics Dashboard:** Usage metrics, user types, popular resources
- **Role Management:** Assign specialty/subspecialty admins
- **Messaging:** 1:1 and broadcast messaging between admins
- **Resource Management:** Add, edit, remove resources
- **Reported Resources:** Review user-reported issues
- **Sponsorship Inquiries:** Manage sponsor requests

## Role Hierarchy

| Role | Permissions |
|------|-------------|
| super_admin | Full access to all features and all specialties |
| specialty_admin | Manage resources and subadmins within their specialty |
| subspecialty_admin | Manage resources within their subspecialty |
| user | Browse, favorite, note, track cases |

## Non-Functional Requirements

- **Mobile-first:** Optimized for phone screens, enhanced for desktop
- **Performance:** Fast load times, lazy loading where appropriate
- **Accessibility:** Keyboard navigation, ARIA labels, focus states
- **Security:** RLS policies, input sanitization, no PII in logs
- **Privacy:** HIPAA-conscious (no patient data), de-identified analytics
