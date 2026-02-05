# Backend Structure

## Overview

The backend is powered entirely by **Supabase**, providing:
- PostgreSQL database
- Authentication (email + OAuth)
- Row Level Security (RLS) for access control
- Realtime subscriptions
- Storage (not currently used)

## Database Schema

### Core Tables

#### `profiles`
User profile data, extends Supabase auth.users
```sql
id (uuid, PK, references auth.users)
email (text)
role (text) -- 'user', 'subspecialty_admin', 'specialty_admin', 'super_admin'
primary_specialty_id (uuid, FK)
primary_subspecialty_id (uuid, FK)
user_type (text) -- 'Surgeon', 'Resident/Fellow'
onboarding_completed (boolean)
created_at (timestamp)
```

#### `specialties`
Medical specialties
```sql
id (uuid, PK)
name (text)
created_at (timestamp)
```

#### `subspecialties`
Subspecialties within specialties
```sql
id (uuid, PK)
specialty_id (uuid, FK)
name (text)
created_at (timestamp)
```

#### `resources`
Surgical technique resources
```sql
id (uuid, PK)
title (text)
description (text)
url (text)
preview_image_url (text)
implant_info_url (text, nullable)
specialty_id (uuid, FK)
subspecialty_id (uuid, FK)
created_by (uuid, FK)
created_at (timestamp)
```

#### `favorites`
User-saved resources
```sql
id (uuid, PK)
user_id (uuid, FK)
resource_id (uuid, FK)
created_at (timestamp)
```

#### `notes`
User notes on resources
```sql
id (uuid, PK)
user_id (uuid, FK)
resource_id (uuid, FK)
content (text)
created_at (timestamp)
updated_at (timestamp)
```

#### `upcoming_cases`
User case tracker
```sql
id (uuid, PK)
user_id (uuid, FK)
resource_id (uuid, FK, nullable)
title (text)
date (date)
notes (text)
created_at (timestamp)
```

#### `admin_messages`
1:1 messaging between admins
```sql
id (uuid, PK)
sender_id (uuid, FK)
recipient_id (uuid, FK)
body (text)
read_at (timestamp, nullable)
created_at (timestamp)
```

## Row Level Security (RLS)

All tables have RLS enabled. Policies enforce:

- **Users** can only read/write their own data (favorites, notes, cases)
- **Admins** can manage resources within their specialty/subspecialty scope
- **Super admins** have full access
- **Public** can read specialties, subspecialties, and resources

See `comprehensive_rls_policies.sql` for full policy definitions.

## Authentication Flow

1. User signs up/in via Supabase Auth
2. On signup, a trigger creates a `profiles` row
3. Client stores session in localStorage
4. `useAuth` hook manages session state
5. Role is read from `profiles.role`

## API Access

### Direct Client Access
Components call Supabase client directly:
```javascript
import { supabase } from '../lib/supabase';

const { data, error } = await supabase
  .from('resources')
  .select('*')
  .eq('specialty_id', specialtyId);
```

### Service Layer
`src/services/authService.js` wraps auth methods:
```javascript
import { authService } from '../services/authService';

await authService.signIn(email, password);
await authService.signOut();
```

## Realtime

Used for admin messaging:
```javascript
supabase
  .channel('admin-messages-' + currentUser.id)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'admin_messages',
    filter: `recipient_id=eq.${currentUser.id}`,
  }, handleNewMessage)
  .subscribe();
```

## Migrations

SQL files in repo root are applied manually via Supabase SQL Editor:
- `comprehensive_rls_policies.sql` - All RLS policies
- Other `*.sql` files - Schema changes

## Environment

Supabase credentials are in `src/lib/supabase.js`:
- URL: `https://bufnygjdkdemacqbxcrh.supabase.co`
- Anon Key: (public, safe for client-side)

For production, consider moving to environment variables with `VITE_` prefix.
