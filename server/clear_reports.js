// clear_reports.js
// Run from the project root: node clear_reports.js
// ⚠️  This permanently deletes ALL reports from the database. There is no undo.

const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

const Report = require('./server/models/Report');

const clearReports = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wildlife_db';
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB:', uri);

        const before = await Report.countDocuments();
        console.log(`📋 Reports found: ${before}`);

        if (before === 0) {
            console.log('ℹ️  Nothing to delete — the reports collection is already empty.');
        } else {
            const result = await Report.deleteMany({});
            console.log(`🗑️  Deleted ${result.deletedCount} report(s) successfully.`);
        }
    } catch (error) {
        console.error('❌ Error clearing reports:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB.');
    }
};

clearReports();
