const Zone = require('../models/Zone');
const { createLog } = require('../utils/logger');

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getZoneCenter(zone) {
  if (zone.geometry?.type === 'Point' && Array.isArray(zone.geometry.coordinates)) {
    return { lat: zone.geometry.coordinates[1], lng: zone.geometry.coordinates[0] };
  }
  if (zone.geometry?.type === 'Polygon' && Array.isArray(zone.geometry.coordinates?.[0])) {
    const points = zone.geometry.coordinates[0];
    const sums = points.reduce((acc, p) => ({ x: acc.x + p[0], y: acc.y + p[1] }), { x: 0, y: 0 });
    return { lat: sums.y / points.length, lng: sums.x / points.length };
  }
  if (Array.isArray(zone.polygonCoordinates) && zone.polygonCoordinates.length > 0) {
    const sums = zone.polygonCoordinates.reduce((acc, p) => ({ lat: acc.lat + p[0], lng: acc.lng + p[1] }), { lat: 0, lng: 0 });
    return { lat: sums.lat / zone.polygonCoordinates.length, lng: sums.lng / zone.polygonCoordinates.length };
  }
  return null;
}

/**
 * Create Zone
 * POST /zones
 * Allows admin to define geographic zones on the map
 */
exports.createZone = async (req, res) => {
  try {
    const { name, geometry, zoneType, animalType, riskLevel, radius, center } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Zone name is required' });
    }

    // Build zone data
    const zoneData = {
      name,
      zoneType: zoneType || 'Zone',
      createdBy: req.user._id,
      createdByRole: req.user.role,
      animalType: animalType || null,
      riskLevel: riskLevel || 'Medium'
    };
    
    // Handle circle zones (officer created)
    if (geometry?.type === 'Circle' && center && radius) {
      zoneData.geometry = {
        type: 'Circle',
        center: { lat: center.lat, lng: center.lng },
        radius: radius
      };
      zoneData.radius = radius;
      zoneData.center = center;
    }
    // Handle polygon zones
    else if (geometry?.type === 'Polygon') {
      zoneData.geometry = geometry;
    }
    // Handle point zones
    else if (geometry?.type === 'Point') {
      zoneData.geometry = geometry;
    }
    
    const zone = await Zone.create(zoneData);
    
    await createLog('Zone created', req.user._id, { 
      zoneId: zone._id, 
      name, 
      createdByRole: req.user.role
    });

    res.status(201).json({
      message: 'Zone created successfully',
      zone
    });
  } catch (error) {
    console.error('Create zone error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get All Zones
 * GET /zones
 * Returns all zones defined in the system
 */
exports.getAllZones = async (req, res) => {
  try {
    // Return ALL zones with populated createdBy info
    const zones = await Zone.find()
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });
    
    // Add createdByRole to each zone for frontend display
    const zonesWithRole = zones.map(zone => {
      const zoneObj = zone.toObject();
      zoneObj.createdByRole = zone.createdBy?.role || zone.createdByRole || 'admin';
      return zoneObj;
    });
    
    res.json({ zones: zonesWithRole });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create zone using dedicated draw endpoint
 * POST /zones/draw
 */
exports.drawZone = exports.createZone;

/**
 * Delete zone
 * DELETE /zones/:id
 */
exports.deleteZone = async (req, res) => {
  try {
    const { id } = req.params;
    const zone = await Zone.findByIdAndDelete(id);
    if (!zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    await createLog('Zone deleted', req.user._id, { zoneId: id, name: zone.name });
    res.json({ message: 'Zone deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get nearby zones
 * GET /zones/nearby?lat=X&lng=Y&radius=20
 */
exports.getNearbyZones = async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    const originLat = parseFloat(lat);
    const originLng = parseFloat(lng);
    const searchRadius = parseFloat(radius) || 20;

    if (isNaN(originLat) || isNaN(originLng)) {
      return res.status(400).json({ error: 'Valid lat and lng are required' });
    }

    const zones = await Zone.find().sort({ createdAt: -1 });
    const nearbyZones = zones
      .map((zone) => {
        const center = getZoneCenter(zone);
        if (!center) return null;
        const distanceKm = haversineDistanceKm(originLat, originLng, center.lat, center.lng);
        return { zone, distanceKm, center };
      })
      .filter(Boolean)
      .filter((entry) => entry.distanceKm <= searchRadius)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .map((entry) => ({
        ...entry.zone.toObject(),
        distanceKm: Number(entry.distanceKm.toFixed(2)),
        center: entry.center
      }));

    res.json({ zones: nearbyZones });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
