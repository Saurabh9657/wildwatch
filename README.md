# Wildlife Spotting & Risk Monitoring System

A full-stack web application for reporting wildlife sightings, tracking animal movements, and monitoring risk zones. Built with Node.js, Express, MongoDB, and vanilla JavaScript.

## Features

### User (Citizen) Module
- Submit wildlife sighting reports with geo-tagged data
- View live map with verified sightings (color-coded by risk level)
- Receive and view alerts from officers
- View personal report history with status tracking

### Officer Module
- View and verify/reject pending reports
- Track animal movement patterns on map
- Publish alerts for high-risk situations
- Filter and analyze all reports

### Admin Module
- Comprehensive analytics dashboard
- Zone management (define Normal, Sensitive, Restricted areas)
- Path-based analysis and heatmaps
- System logs and activity tracking

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Leaflet.js
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running locally or connection string)
- npm or yarn

### Setup Steps

1. **Clone or navigate to the project directory**
   ```bash
   cd "C:\Users\Saurabh\OneDrive\Desktop\New folder"
   ```

2. **Install backend dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Configure environment variables**
   - Create a `.env` file in the `server` directory
   - Copy from `.env.example` and update:
     ```
     PORT=3000
     MONGODB_URI=mongodb://localhost:27017/wildlife_db
     JWT_SECRET=your_secret_key_change_in_production
     ```

4. **Start MongoDB**
   - Make sure MongoDB is running on your system
   - Default connection: `mongodb://localhost:27017`

5. **Start the server**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open browser and navigate to: `http://localhost:3000`
   - The server serves both API and static files

## Project Structure

```
├── client/
│   ├── css/
│   │   └── style.css          # Main stylesheet
│   ├── js/
│   │   ├── main.js            # Main app logic, navigation
│   │   ├── auth.js            # Authentication handlers
│   │   ├── user.js            # User module (reports, map, alerts)
│   │   ├── officer.js         # Officer module (verification, tracking)
│   │   └── admin.js           # Admin module (analytics, zones)
│   └── index.html             # Main HTML page
│
├── server/
│   ├── models/
│   │   ├── User.js            # User model
│   │   ├── Report.js          # Report model
│   │   ├── Alert.js           # Alert model
│   │   ├── Zone.js            # Zone model
│   │   └── Log.js             # Log model
│   ├── routes/
│   │   ├── authRoutes.js      # Authentication routes
│   │   ├── reportRoutes.js    # Report routes
│   │   ├── alertRoutes.js     # Alert routes
│   │   ├── zoneRoutes.js      # Zone routes
│   │   └── analyticsRoutes.js # Analytics routes
│   ├── controllers/
│   │   ├── authController.js  # Auth logic
│   │   ├── reportController.js # Report logic
│   │   ├── alertController.js  # Alert logic
│   │   ├── zoneController.js   # Zone logic
│   │   └── analyticsController.js # Analytics logic
│   ├── middleware/
│   │   ├── auth.js            # JWT authentication
│   │   └── upload.js          # File upload (Multer)
│   ├── utils/
│   │   └── logger.js          # Logging utility
│   ├── uploads/               # Uploaded images directory
│   ├── server.js              # Main server file
│   └── package.json           # Dependencies
│
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Reports
- `POST /api/reports` - Create new report (authenticated)
- `GET /api/reports` - Get all reports (filtered by role)
- `GET /api/reports/my-reports` - Get user's own reports
- `GET /api/reports/pending` - Get pending reports (officer/admin)
- `PUT /api/reports/:id/verify` - Verify/reject report (officer/admin)
- `GET /api/reports/tracking/:animalType` - Get animal tracking data

### Alerts
- `POST /api/alerts` - Create alert (officer/admin)
- `GET /api/alerts` - Get all alerts

### Zones
- `POST /api/zones` - Create zone (admin)
- `GET /api/zones` - Get all zones

### Analytics
- `GET /api/analytics/summary` - Get analytics summary (admin)
- `GET /api/analytics/paths` - Get path analysis (admin)

## Usage Guide

### For Citizens
1. Register/Login with role "Citizen"
2. Click "Report Sighting" to submit a wildlife report
3. Use GPS button to auto-fill coordinates, or enter manually
4. View "Live Map" to see verified sightings
5. Check "Alerts" for officer-published warnings
6. View "My Reports" to track your submissions

### For Officers
1. Register/Login with role "Officer"
2. Access "Officer Dashboard"
3. Verify or reject pending reports
4. Use "Animal Tracking" to view movement patterns
5. Publish alerts for high-risk situations

### For Admins
1. Register/Login with role "Admin"
2. Access "Admin Dashboard"
3. View analytics and statistics
4. Create zones on map (Normal/Sensitive/Restricted)
5. Analyze animal paths and heatmaps

## Security Features

- Password hashing with bcryptjs
- JWT-based authentication
- Role-based access control (RBAC)
- Input validation
- Secure file upload handling

## Notes for Viva/Defense

### Key Points to Explain:
1. **Architecture**: RESTful API with separation of concerns (MVC pattern)
2. **Authentication**: JWT tokens stored in localStorage, role-based middleware
3. **Database**: MongoDB with Mongoose schemas for flexible data modeling
4. **Maps**: Leaflet.js for interactive mapping with markers, polylines, polygons
5. **File Upload**: Multer middleware for handling image uploads
6. **Security**: Password hashing, JWT tokens, role-based authorization

### Demo Flow:
1. Register as Citizen → Submit report
2. Login as Officer → Verify report → Track animal → Publish alert
3. Login as Admin → View analytics → Create zone → Analyze paths

## Troubleshooting

- **MongoDB Connection Error**: Ensure MongoDB is running and connection string is correct
- **Port Already in Use**: Change PORT in `.env` file
- **Image Upload Fails**: Check `server/uploads` directory exists and has write permissions
- **CORS Issues**: CORS is enabled for all origins (adjust in production)

## License

This project is created for academic purposes.
