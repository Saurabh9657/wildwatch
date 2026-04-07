const Report = require('../models/Report');
const Alert = require('../models/Alert');
const Zone = require('../models/Zone');
const User = require('../models/User');

/**
 * Get Analytics Summary
 * GET /analytics/summary
 * Returns comprehensive analytics for admin dashboard
 */
exports.getSummary = async (req, res) => {
  try {
    // Total reports
    const totalReports = await Report.countDocuments();
    
    // High-risk reports
    const highRiskReports = await Report.countDocuments({ riskLevel: 'High' });
    
    // Reports by status
    const pendingReports = await Report.countDocuments({ status: 'pending' });
    const verifiedReports = await Report.countDocuments({ status: 'verified' });
    const rejectedReports = await Report.countDocuments({ status: 'rejected' });
    
    // Reports by risk level
    const lowRiskCount = await Report.countDocuments({ riskLevel: 'Low' });
    const mediumRiskCount = await Report.countDocuments({ riskLevel: 'Medium' });
    
    // Unique animal types (species count)
    const animalTypes = await Report.distinct('animalType');
    const speciesCount = animalTypes.length;
    
    // Reports over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const reportsOverTime = await Report.aggregate([
      {
        $match: {
          timestamp: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Total alerts
    const totalAlerts = await Alert.countDocuments();
    
    // Total zones
    const totalZones = await Zone.countDocuments();
    
    // Total users by role
    const userCount = await User.countDocuments({ role: 'user' });
    const officerCount = await User.countDocuments({ role: 'officer' });
    const adminCount = await User.countDocuments({ role: 'admin' });
    
    // Animal type distribution
    const animalDistribution = await Report.aggregate([
      {
        $group: {
          _id: '$animalType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    res.json({
      summary: {
        totalReports,
        highRiskReports,
        pendingReports,
        verifiedReports,
        rejectedReports,
        lowRiskCount,
        mediumRiskCount,
        speciesCount,
        totalAlerts,
        totalZones,
        userCount,
        officerCount,
        adminCount
      },
      reportsOverTime,
      animalDistribution
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get Path-Based Analysis
 * GET /analytics/paths
 * Identifies frequent animal paths and creates heatmap data
 */
exports.getPathAnalysis = async (req, res) => {
  try {
    // Get all verified reports grouped by animal type
    const pathData = await Report.aggregate([
      {
        $match: { status: 'verified' }
      },
      {
        $group: {
          _id: '$animalType',
          reports: {
            $push: {
              coordinates: '$coordinates',
              timestamp: '$timestamp',
              locationName: '$locationName',
              riskLevel: '$riskLevel'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    // Create heatmap data (all coordinates with weights)
    const heatmapData = await Report.find({ status: 'verified' })
      .select('coordinates riskLevel')
      .lean();
    
    const heatmap = heatmapData.map(report => ({
      lat: report.coordinates.lat,
      lng: report.coordinates.lng,
      weight: report.riskLevel === 'High' ? 3 : report.riskLevel === 'Medium' ? 2 : 1
    }));
    
    res.json({
      pathData,
      heatmap
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
