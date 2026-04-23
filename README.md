# PulseLink Blood Bank Management System

PulseLink is a full-stack blood bank management web application for a college project. It uses Node.js, Express, MySQL, HTML, Tailwind via CDN, custom CSS, and vanilla JavaScript.

## Features

- Donor, patient, and admin roles
- JWT authentication with password hashing
- Donor eligibility check based on age, weight, health history, and 90-day donation interval
- Blood-group-based donor search with live availability
- Emergency request mode with live in-app notifications
- Donation history tracking
- Admin analytics, user management, and broadcasts
- Responsive dark/light UI, voice search, and multilingual toggle

## Project Structure

- `server.js` - main Express server
- `src/` - backend routes, config, middleware, utilities, services
- `public/` - frontend HTML, CSS, and JavaScript
- `database/schema.sql` - MySQL table definitions
- `database/seed.sql` - sample demo data

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`.

3. Create the database and tables:

```sql
SOURCE database/schema.sql;
SOURCE database/seed.sql;
```

4. Start the server:

```bash
npm start
```

5. Open `http://localhost:4000`

## Demo Login

- Admin: `admin@pulselink.com`
- Donor: `riya@pulselink.com`
- Patient: `aman@pulselink.com`
- Demo password for seed users: `password`

## Notes

- Tailwind is loaded through CDN to keep the project simple for a college submission.
- SSE notifications are implemented for live in-app alerts.
- Chat APIs are included; UI can be extended further if needed for full messaging workflows.
