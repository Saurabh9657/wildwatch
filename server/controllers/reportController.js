const Report = require('../models/Report');
const { createLog } = require('../utils/logger');
const path = require('path');
const fs = require('fs');

/**
 * Create New Report
 * POST /reports
 * Allows users to submit wildlife sighting reports
 */
exports.createReport = async (req, res) => {
  try {
    console.log('📝 Report submission received');
    console.log('Body:', req.body);
    console.log('File:', req.file);

    // ── Cooldown: reject if the same user submitted within the last 60 s ──
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentReport = await Report.findOne({
      createdBy: req.user._id,
      createdAt: { $gte: oneMinuteAgo }
    });

    if (recentReport) {
      const secondsLeft = Math.ceil(
        (recentReport.createdAt.getTime() + 60000 - Date.now()) / 1000
      );
      return res.status(429).json({
        error: `Please wait ${secondsLeft} seconds before submitting another report.`,
        cooldownRemaining: secondsLeft
      });
    }
    // ── End cooldown check ────────────────────────────────────────────────

    const { animalType, locationName, coordinates, riskLevel, description, timeOfSighting } = req.body;

    
    // Handle image path - check if file was uploaded
    let imagePath = '';
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
      console.log('📸 Image saved at:', imagePath);
    }

    // Validate required fields
    if (!animalType || !locationName || !coordinates || !riskLevel) {
      console.log('❌ Missing required fields:', { animalType, locationName, coordinates, riskLevel });
      return res.status(400).json({ 
        error: 'Missing required fields: animalType, locationName, coordinates, and riskLevel are required' 
      });
    }

    // Parse coordinates if it's a JSON string
    let coordData = coordinates;
    if (typeof coordinates === 'string') {
      try {
        coordData = JSON.parse(coordinates);
      } catch (e) {
        console.log('❌ Invalid coordinates format:', coordinates);
        return res.status(400).json({ error: 'Invalid coordinates format' });
      }
    }

    // Validate coordinates
    const lat = parseFloat(coordData.lat);
    const lng = parseFloat(coordData.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
      console.log('❌ Invalid coordinates values:', { lat, lng });
      return res.status(400).json({ error: 'Invalid coordinates. Please provide valid latitude and longitude.' });
    }

    // Parse timeOfSighting if provided
    let sightingTime = new Date();
    if (timeOfSighting) {
      sightingTime = new Date(timeOfSighting);
      if (isNaN(sightingTime.getTime())) {
        sightingTime = new Date();
      }
    }

    // Create report
    const report = await Report.create({
      animalType: animalType.trim(),
      locationName: locationName.trim(),
      coordinates: {
        lat: lat,
        lng: lng
      },
      riskLevel,
      description: description ? description.trim() : '',
      imagePath: imagePath,
      createdBy: req.user._id,
      status: 'pending',
      timestamp: sightingTime
    });

    console.log('✅ Report created successfully:', report._id);

    // Log report creation
    await createLog('Report created', req.user._id, { 
      reportId: report._id, 
      animalType, 
      riskLevel 
    });

    res.status(201).json({
      message: 'Report submitted successfully',
      report
    });
  } catch (error) {
    console.error('❌ Create report error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Get all reports
 * GET /reports
 * Returns verified reports for public, all reports for officers
 */
exports.getAllReports = async (req, res) => {
  try {
    const { animalType, riskLevel, status, limit = 500 } = req.query;
    let query = {};

    // For regular users, only show verified reports within the last 7 days
    if (req.user.role === 'user') {
      query.status = 'verified';
      query.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    }

    if (animalType) query.animalType = new RegExp(animalType, 'i');
    if (riskLevel) query.riskLevel = riskLevel;
    if (status && (req.user.role === 'officer' || req.user.role === 'admin')) {
      query.status = status;
    }

    const reports = await Report.find(query)
      .populate('createdBy', 'name email role')
      .populate('verifiedBy', 'name email role')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({ reports });
  } catch (error) {
    console.error('❌ Get all reports error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Get user's own reports
 * GET /reports/my-reports
 */
exports.getMyReports = async (req, res) => {
  try {
    const query = { createdBy: req.user._id };
    if (req.user.role === 'user') {
      query.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    }

    const reports = await Report.find(query)
      .sort({ timestamp: -1 });

    res.json({ reports });
  } catch (error) {
    console.error('❌ Get my reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get pending reports (officer only)
 * GET /reports/pending
 */
exports.getPendingReports = async (req, res) => {
  try {
    const reports = await Report.find({ status: 'pending' })
      .populate('createdBy', 'name email')
      .sort({ timestamp: -1 });

    res.json({ reports });
  } catch (error) {
    console.error('❌ Get pending reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Verify or Reject report (officer only)
 * PUT /reports/:id/verify
 */
exports.verifyReport = async (req, res) => {
  try {
    const { status, officerRemarks } = req.body;
    const reportId = req.params.id;

    if (!['verified', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Status must be verified, rejected, or pending' });
    }

    const report = await Report.findById(reportId);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    report.status = status;
    report.verifiedBy = req.user._id;
    if (officerRemarks) {
      report.officerRemarks = officerRemarks;
    }

    await report.save();

    await createLog(`Report ${status}`, req.user._id, {
      reportId: report._id,
      animalType: report.animalType
    });

    res.json({ message: `Report ${status} successfully`, report });
  } catch (error) {
    console.error('❌ Verify report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get animal tracking data (officer only)
 * GET /reports/tracking/:animalType
 */
exports.getAnimalTracking = async (req, res) => {
  try {
    const { animalType } = req.params;
    
    const reports = await Report.find({ 
      animalType: { $regex: new RegExp(animalType, 'i') },
      status: 'verified' 
    }).sort({ timestamp: -1 });

    res.json({ reports });
  } catch (error) {
    console.error('❌ Get animal tracking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};