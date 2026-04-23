# PulseLink Blood Bank - Setup and Run Guide

## ✅ What Has Been Fixed

The project now uses **simple database authentication** instead of JWT tokens:

- Removed unused `jsonwebtoken` dependency from `package.json`
- Removed `JWT_SECRET` from environment variables
- Updated authentication to use cookie-based session with password hashing via bcryptjs
- All user credentials are securely stored in MySQL database

## 📋 Prerequisites

Before you begin, make sure you have:

1. **Node.js** (v14+) and **npm** - [Download here](https://nodejs.org/)
2. **MySQL Server** (v5.7+) - [Download here](https://dev.mysql.com/downloads/mysql/)
3. **Git** (optional but recommended)

### Verify Installations

```bash
node --version
npm --version
mysql --version
```

---

## 🚀 Step-by-Step Setup

### Step 1: Navigate to Project Directory

```bash
cd "c:\Users\sukhp\OneDrive\Desktop\Pulse-Link"
```

### Step 2: Configure MySQL Database

1. **Start MySQL Server** (if not already running):
   - Windows: Start MySQL from Services or use command line
   - Command: `mysql -u root -p`

2. **Create Database and Import Schema**:

```bash
mysql -u root -p blood_bank_db < database\schema.sql
```

When prompted, enter your MySQL root password (in your case: `btsarmy7`)

3. **Optional - Add Demo Data**:

```bash
mysql -u root -p blood_bank_db < database\seed.sql
```

### Step 3: Install Dependencies

Dependencies have already been installed, but if needed:

```bash
npm install
```

**Current Dependencies:**

- `express` - Web framework
- `mysql2` - MySQL database driver
- `bcryptjs` - Password hashing
- `cors` - Cross-Origin Resource Sharing
- `dotenv` - Environment variables

### Step 4: Verify Environment Configuration

Check `.env` file has correct settings:

```
PORT=4500
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=btsarmy7
DB_NAME=blood_bank_db
```

**Important:** Update `DB_PASSWORD` if your MySQL password is different!

---

## ▶️ Running the Project

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Expected Output:

```
Database connected successfully!
Server is running on http://localhost:4500
```

---

## 🌐 Accessing the Application

Once the server is running, open your browser and visit:

- **Main Application**: http://localhost:4500
- **Login/Register**: http://localhost:4500/auth.html

### Default Test Credentials:

After seeding with demo data:

**Admin Account:**

- Email: `admin@example.com`
- Password: `password123`

**Donor Account:**

- Email: `donor@example.com`
- Password: `password123`

**Patient Account:**

- Email: `patient@example.com`
- Password: `password123`

---

## 🔐 Authentication System

### How It Works:

1. **Registration**: User creates account with email and password
   - Password is hashed using bcryptjs (10 salt rounds)
   - User data stored securely in MySQL `users` table

2. **Login**:
   - Email and password verified against database
   - User object stored in browser cookie (`pulse_user`)
   - Session maintained via cookies and headers

3. **Access Control**:
   - Role-based access (donor, patient, admin)
   - Middleware checks user identity from cookies
   - Protected routes verified through `requireAuth()` middleware

### Session Storage:

User data is stored in:

- **Cookie**: `pulse_user` (encrypted user object)
- **LocalStorage/SessionStorage**: Fallback if cookies unavailable

---

## 📁 Project Structure

```
Pulse-Link/
├── public/              # Frontend HTML, CSS, JavaScript
│   ├── auth.html       # Login/Registration page
│   ├── donor-dashboard.html
│   ├── patient-dashboard.html
│   ├── admin-dashboard.html
│   └── assets/         # CSS and JS files
├── src/
│   ├── config/         # Database configuration
│   ├── routes/         # API endpoints
│   ├── services/       # Business logic (user auth, notifications)
│   ├── middleware/     # Authentication middleware
│   └── utils/          # Helper functions
├── database/
│   ├── schema.sql      # Database table definitions
│   └── seed.sql        # Sample demo data
├── server.js           # Express server entry point
├── package.json        # Dependencies
└── .env               # Environment configuration
```

---

## 🛠️ API Endpoints

### Authentication

```
POST /api/auth/register
Body: {
  name, email, password, role, phone, address,
  blood_group (for donors), age, weight, required_blood_group (for patients)
}

POST /api/auth/login
Body: { email, password }
Response: { success, user: { id, name, email, role } }
```

### Other Main Routes

```
/api/donors      - Donor management
/api/patients    - Patient management
/api/admin       - Admin operations
/api/chat        - Live chat between donor/patient
/api/notify      - Notifications
```

---

## ❌ Troubleshooting

### Problem: "Cannot connect to database"

**Solution:**

- Check MySQL is running
- Verify `.env` has correct credentials
- Ensure database `blood_bank_db` exists

```bash
mysql -u root -p -e "SHOW DATABASES;"
```

### Problem: Port 4500 already in use

**Solution:** The server auto-finds available port. Check output for actual port, or change in `.env`

### Problem: Dependencies missing after npm install

**Solution:**

```bash
rm -r node_modules
npm install
```

### Problem: Module not found errors

**Solution:**

```bash
npm install --save bcryptjs cors dotenv express mysql2
```

---

## 🧪 Testing the Login System

### Quick Test:

1. Go to http://localhost:4500/auth.html
2. Click **Register** and create new account:
   - Email: `test@example.com`
   - Password: `test123456`
   - Role: Choose any role
   - Fill other required fields

3. After registration, click **Login** with same credentials
4. You should be redirected to your role's dashboard

---

## 📝 Key Files Modified

- `package.json` - Removed jsonwebtoken
- `.env` - Removed JWT_SECRET
- `.env.example` - Updated template
- `README.md` - Updated feature description
- `public/auth.html` - Updated UI text

---

## ✨ Features Included

✅ Multi-role authentication (Donor, Patient, Admin)
✅ Secure password hashing with bcryptjs
✅ MySQL database persistence
✅ Cookie-based session management
✅ Donor eligibility checking
✅ Blood-group matching system
✅ Real-time notifications
✅ Emergency request mode
✅ Live chat support
✅ Admin analytics dashboard

---

## 📞 Support

If you encounter any issues:

1. Check `.env` configuration
2. Ensure MySQL is running
3. Check server logs in terminal
4. Verify database tables exist: `mysql -u root -p blood_bank_db -e "SHOW TABLES;"`

---

**Ready to go! Run `npm run dev` and start the application.** 🎉
