const mongoose = require('mongoose');
require('dotenv').config();

const Alert = require('./server/models/Alert');

async function seedAlert() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wildlife_spotting');
        console.log('Connected to MongoDB');
        
        const count = await Alert.countDocuments();
        if (count === 0) {
            console.log('No alerts found. Inserting a test alert...');
            const alert = new Alert({
                message: "Test Alert - Tiger spotted near the main road",
                riskLevel: "High",
                coordinates: { lat: 20.5937, lng: 78.9629 },
                timestamp: new Date()
            });
            await alert.save();
            console.log('Test alert inserted successfully');
        } else {
            console.log(`There are already ${count} alerts in the database. No seeding needed.`);
        }
    } catch (error) {
        console.error('Error seeding alert:', error);
    } finally {
        await mongoose.disconnect();
    }
}

seedAlert();
