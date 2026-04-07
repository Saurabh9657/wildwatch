# Quick Setup Guide

## Step 1: Install Dependencies

```bash
cd server
npm install
```

## Step 2: Configure Environment

Create a file named `.env` in the `server` directory with the following content:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/wildlife_db
JWT_SECRET=your_secret_key_change_this_in_production_12345
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=AdminPass@123
```

**Important**: 
- Change `JWT_SECRET` to a random string for security
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` are used to auto-create the admin account on first server start
- Admin account is created automatically if it doesn't exist

## Step 3: Start MongoDB

Make sure MongoDB is running on your system:

- **Windows**: Start MongoDB service or run `mongod`
- **Mac/Linux**: Run `mongod` or `sudo systemctl start mongod`

## Step 4: Start the Server

```bash
cd server
npm start
```

The server will start on `http://localhost:3000`

## Step 5: Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Testing the Application

### Create Test Users

1. **Admin Account** (Auto-created):
   - Email: `admin@gmail.com` (from .env file)
   - Password: `AdminPass@123` (from .env file)
   - Created automatically on server start
   - Login directly with these credentials

2. **Register as Citizen**:
   - Click "Login" → "Register (Citizens Only)"
   - Name: John Doe
   - Email: citizen@test.com
   - Password: test123
   - Note: Only citizens can register publicly

3. **Create Officer** (Admin Only):
   - Login as admin
   - Go to Admin Dashboard → "👮 Register Officer"
   - Fill in officer details and create account
   - Officers can then login normally

### Test Flow

1. **As Citizen**:
   - Login with citizen account
   - Submit a wildlife report
   - View live map
   - Check alerts

2. **As Officer**:
   - Login with officer account
   - Go to Officer Dashboard
   - Verify pending reports
   - Track animal movement
   - Publish an alert

3. **As Admin**:
   - Login with admin account
   - Go to Admin Dashboard
   - View analytics
   - Create zones
   - Analyze paths

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check connection string in `.env` file
- Try: `mongodb://127.0.0.1:27017/wildlife_db`

### Port Already in Use
- Change `PORT` in `.env` file to another port (e.g., 3001)
- Update API URL in `client/js/main.js` if needed

### Images Not Uploading
- The `server/uploads` directory will be created automatically
- Ensure write permissions on the server directory

### CORS Errors
- CORS is enabled for all origins in development
- For production, update CORS settings in `server/server.js`

## Project Structure

```
├── client/          # Frontend files (HTML, CSS, JS)
├── server/          # Backend files (Node.js, Express)
└── README.md        # Full documentation
```

## Need Help?

Refer to `README.md` for detailed documentation and API endpoints.
