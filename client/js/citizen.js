/**
 * Citizen Module
 * Handles citizen dashboard, report wizard, alerts, and my reports
 */

let citizenMap = null;
let citizenMarkers = [];
let reportWizardStep = 1;
let reportData = {
    animalType: '',
    animalCount: 1,
    behavior: [],
    timeOfSighting: new Date().toISOString().slice(0, 16),
    locationName: '',
    coordinates: null,
    description: '',
    photo: null,
    riskLevel: ''
};

/**
 * Optional: refine "nearby" lists after GPS (does not block first paint)
 */
function enhanceDashboardWithGeolocation(verifiedReports, zones) {
    if (!navigator.geolocation) return;

    const calcDistanceKm = (lat1, lng1, lat2, lng2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    };

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            const nearbyZones = zones.filter((zone) => {
                let zoneLat; let zoneLng;
                if (zone.geometry?.type === 'Polygon' && zone.geometry.coordinates?.[0]?.[0]) {
                    zoneLat = zone.geometry.coordinates[0][0][1];
                    zoneLng = zone.geometry.coordinates[0][0][0];
                } else if (zone.polygonCoordinates && zone.polygonCoordinates[0]) {
                    zoneLat = zone.polygonCoordinates[0][0];
                    zoneLng = zone.polygonCoordinates[0][1];
                } else {
                    return false;
                }
                return calcDistanceKm(zoneLat, zoneLng, userLocation.lat, userLocation.lng) < 50;
            }).slice(0, 3);

            const nearbySightings = verifiedReports.filter((report) => {
                if (!report.coordinates) return false;
                return calcDistanceKm(
                    report.coordinates.lat,
                    report.coordinates.lng,
                    userLocation.lat,
                    userLocation.lng
                ) < 50;
            }).slice(0, 5);

            const zonesEl = document.getElementById('citizenNearbyZones');
            const sightEl = document.getElementById('citizenRecentSightings');
            if (!zonesEl || !sightEl) return;

            if (nearbyZones.length > 0) {
                zonesEl.innerHTML = nearbyZones.map((zone) => `
                    <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--gray-light);">
                        <div><strong>${zone.name || 'Zone'}</strong><div style="font-size: 0.85rem; color: var(--gray);">Near your location</div></div>
                        <span style="background: ${getRiskColor(zone.riskLevel || 'Medium')}; color: white; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.75rem;">${zone.riskLevel || 'Active'}</span>
                    </div>
                `).join('');
            }

            if (nearbySightings.length > 0) {
                sightEl.innerHTML = nearbySightings.map((report) => `
                    <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--gray-light);">
                        <div><strong style="color: ${getRiskColor(report.riskLevel)}">${report.animalType}</strong><div style="font-size: 0.85rem; color: var(--gray);">${report.locationName}</div></div>
                        <div style="text-align: right;"><span class="alert-badge ${report.riskLevel?.toLowerCase()}">${report.riskLevel}</span><div style="font-size: 0.75rem; color: var(--gray);">${safeFormatRelativeTime(report.timestamp)}</div></div>
                    </div>
                `).join('');
            }
        },
        () => { /* keep fallback lists */ },
        { timeout: 4000, maximumAge: 120000, enableHighAccuracy: false }
    );
}

/**
 * Load citizen dashboard with real data - OPTIMIZED
 */
async function loadCitizenDashboard() {
    const mainContent = document.getElementById('mainContent');
    
    // Show skeleton loading for better perceived performance
    mainContent.innerHTML = `
        <div class="container">
            <div class="dashboard-grid">
                <div class="loading-skeleton" style="height: 150px; border-radius: var(--radius-md);"></div>
                <div class="loading-skeleton" style="height: 150px; border-radius: var(--radius-md);"></div>
                <div class="loading-skeleton" style="height: 150px; border-radius: var(--radius-md);"></div>
            </div>
            <div class="loading-skeleton" style="height: 450px; border-radius: var(--radius-md); margin-bottom: 1rem;"></div>
            <div class="loading-skeleton" style="height: 300px; border-radius: var(--radius-md);"></div>
        </div>
    `;
    
    try {
        // Fetch ALL data in parallel with caching
        const [reportsRes, zonesRes, myReportsRes] = await Promise.all([
            apiRequest('/reports?status=verified&limit=30', {}, true),
            apiRequest('/zones', {}, true),
            apiRequest('/reports/my-reports', {}, true)
        ]);
        
        const verifiedReports = (reportsRes.reports || []).slice(0, 30);
        const zones = zonesRes.zones || [];
        const myReports = myReportsRes.reports || [];
        
        // Calculate stats (lightweight)
        const totalMyReports = myReports.length;
        const verifiedMyReports = myReports.filter(r => r.status === 'verified').length;
        const highRiskAlerts = verifiedReports.filter(r => r.riskLevel === 'High').length;
        
        // Fast first paint: do NOT wait for GPS (was blocking 3–15+ seconds)
        let nearbyZones = zones.slice(0, 3);
        let nearbySightings = verifiedReports.slice(0, 5);
        
        // Quick HTML generation
        const nearbyZonesHtml = nearbyZones.length > 0 ? 
            nearbyZones.map(zone => `
                <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--gray-light);">
                    <div><strong>${zone.name || 'Zone'}</strong><div style="font-size: 0.85rem; color: var(--gray);">Active zone</div></div>
                    <span style="background: ${getRiskColor(zone.riskLevel || 'Medium')}; color: white; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.75rem;">${zone.riskLevel || 'Active'}</span>
                </div>
            `).join('') : '<p style="color: var(--gray);">No zones listed</p>';
        
        const recentSightingsHtml = nearbySightings.length > 0 ?
            nearbySightings.map(report => `
                <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--gray-light);">
                    <div><strong style="color: ${getRiskColor(report.riskLevel)}">${report.animalType}</strong><div style="font-size: 0.85rem; color: var(--gray);">${report.locationName}</div></div>
                    <div style="text-align: right;"><span class="alert-badge ${report.riskLevel?.toLowerCase()}">${report.riskLevel}</span><div style="font-size: 0.75rem; color: var(--gray);">${safeFormatRelativeTime(report.timestamp)}</div></div>
                </div>
            `).join('') : '<p style="text-align: center; color: var(--gray);">No recent sightings</p>';
        
        // Render HTML immediately
        mainContent.innerHTML = `
            <div class="container">
                <div class="dashboard-grid">
                    <div class="card"><h3><i class="fas fa-user-circle"></i> ${currentUser?.name || 'Citizen'}</h3><p style="color: var(--gray);">${currentUser?.email || ''}</p><hr style="margin: 1rem 0;"><div style="display: flex; gap: 1rem; justify-content: space-between;"><div><h4>${totalMyReports}</h4><small>My Reports</small></div><div><h4>${verifiedMyReports}</h4><small>Verified</small></div><div><h4>${highRiskAlerts}</h4><small>High Risk</small></div></div></div>
                    <div class="card"><h3><i class="fas fa-map-marker-alt"></i> Active Zones Nearby</h3><div id="citizenNearbyZones">${nearbyZonesHtml}</div></div>
                    <div class="card"><h3><i class="fas fa-phone-alt"></i> Emergency</h3><div style="text-align: center; padding: 1rem;"><h2 style="color: var(--danger);">1926</h2><p>Wildlife Helpline</p><button class="btn btn-danger btn-sm" onclick="window.location.href='tel:1926'"><i class="fas fa-phone"></i> Call Now</button></div></div>
                </div>
                <div class="card"><h3><i class="fas fa-map"></i> Live Wildlife Map</h3><div id="citizenMap" class="map-container" style="height: 400px;"></div><div class="map-filters" style="margin-top: 1rem;"><select id="riskFilter" style="flex:1; padding:0.5rem;"><option value="">All Risks</option><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select><button class="btn btn-primary btn-sm" onclick="refreshCitizenMap()"><i class="fas fa-sync-alt"></i> Refresh</button></div></div>
                <div class="card"><h3><i class="fas fa-eye"></i> Recent Sightings</h3><div id="citizenRecentSightings">${recentSightingsHtml}</div></div>
            </div>
        `;
        
        // Map after paint; GPS refines lists in background (no blocking)
        requestAnimationFrame(() => {
            initCitizenMap(verifiedReports.slice(0, 30), zones);
        });
        setTimeout(() => enhanceDashboardWithGeolocation(verifiedReports, zones), 0);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        mainContent.innerHTML = `
            <div class="container">
                <div class="card" style="text-align: center; color: var(--danger);">
                    <i class="fas fa-exclamation-circle fa-2x"></i>
                    <h3>Error Loading Dashboard</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="loadCitizenDashboard()">Try Again</button>
                </div>
            </div>
        `;
    }
}

/**
 * Initialize citizen map with reports and zones - OPTIMIZED
 */
async function initCitizenMap(reports, zones) {
    const mapContainer = document.getElementById('citizenMap');
    if (!mapContainer) return;
    
    // Remove existing map
    if (citizenMap) {
        citizenMap.remove();
        citizenMap = null;
    }
    
    // Create new map with default view (don't wait for bounds)
    citizenMap = L.map('citizenMap').setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(citizenMap);
    
    // Add markers in batch (faster)
    const points = [];
    const markers = [];
    
    // Add reports (limit to 50 for performance)
    const limitedReports = reports.slice(0, 50);
    
    for (const report of limitedReports) {
        if (!report?.coordinates) continue;
        const lat = Number(report.coordinates.lat);
        const lng = Number(report.coordinates.lng);
        if (isNaN(lat) || isNaN(lng)) continue;
        
        points.push([lat, lng]);
        const marker = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: getRiskColor(report.riskLevel),
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.85
        }).addTo(citizenMap);
        
        marker.bindPopup(`
            <strong>${report.animalType || 'Sighting'}</strong><br>
            📍 ${report.locationName || 'Unknown'}<br>
            ⚠️ ${report.riskLevel || 'Unknown'}<br>
            🕐 ${safeFormatRelativeTime(report.timestamp)}
        `);
        markers.push(marker);
    }
    
    // Add zones (simplified)
    for (const zone of zones.slice(0, 20)) {
        if (zone.geometry?.type === 'Polygon' && zone.geometry.coordinates?.[0]) {
            const coords = zone.geometry.coordinates[0]
                .filter(c => Array.isArray(c) && c.length >= 2)
                .map(c => [c[1], c[0]]);
            if (coords.length >= 3) {
                points.push(...coords);
                L.polygon(coords, {
                    color: getRiskColor(zone.riskLevel || 'Medium'),
                    fillColor: getRiskColor(zone.riskLevel || 'Medium'),
                    fillOpacity: 0.15,
                    weight: 1.5
                }).addTo(citizenMap).bindPopup(zone.name || 'Zone');
            }
        }
    }
    
    // Fit bounds only if we have points (with delay to not block UI)
    if (points.length > 0) {
        setTimeout(() => {
            try {
                citizenMap.fitBounds(points, { padding: [30, 30] });
            } catch (e) {
                console.log('Fit bounds error');
            }
        }, 50);
    }
}

/**
 * Refresh citizen map with filters
 */
async function refreshCitizenMap() {
    if (!citizenMap) return;

    const riskFilter = document.getElementById('riskFilter')?.value || '';

    try {
        // Fetch ALL verified reports (not just user's)
        let url = '/reports?status=verified&limit=500';
        if (riskFilter) url += `&riskLevel=${riskFilter}`;

        const [reportsRes, zonesRes] = await Promise.all([
            apiRequest(url, {}, true),
            apiRequest('/zones', {}, true)
        ]);

        await addMarkersToCitizenMap(reportsRes.reports || [], zonesRes.zones || []);

    } catch (error) {
        console.error('Error refreshing map:', error);
        showToast('Error refreshing map', 'error');
    }
}

/**
 * Add markers to citizen map
 */
/**
 * Add markers to citizen map - OPTIMIZED with batching
 */
async function addMarkersToCitizenMap(reports, zones) {
    if (!citizenMap) return;
    
    // Clear existing markers
    citizenMarkers.forEach(marker => citizenMap.removeLayer(marker));
    citizenMarkers = [];
    
    const points = [];
    
    console.log('Rendering zones to citizen map:', zones.length, 'zones');
    
    // Add zones FIRST so they appear behind markers
    zones.forEach(zone => {
        const zoneColor = getRiskColor(zone.riskLevel || 'Medium');
        
        if (zone.geometry?.type === 'Polygon' && zone.geometry.coordinates?.[0]) {
            const coords = zone.geometry.coordinates[0]
                .filter(c => Array.isArray(c) && c.length >= 2)
                .map(c => [c[1], c[0]]);
            if (coords.length >= 3) {
                points.push(...coords);
                const polygon = L.polygon(coords, {
                    color: zoneColor,
                    fillColor: zoneColor,
                    fillOpacity: 0.15,
                    weight: 1.5
                }).addTo(citizenMap);
                polygon.bindPopup(`
                    <strong>${zone.name || 'Zone'}</strong><br>
                    ${zone.riskLevel ? `Risk: ${zone.riskLevel}` : ''}<br>
                    Created by: ${zone.createdByRole === 'officer' ? 'Forest Officer' : 'Admin'}
                `);
                citizenMarkers.push(polygon);
            }
        }
        else if (zone.geometry?.type === 'Circle' && zone.geometry.center) {
            const radiusMeters = (zone.radius || 5) * 1000;
            points.push([zone.geometry.center.lat, zone.geometry.center.lng]);
            const circle = L.circle([zone.geometry.center.lat, zone.geometry.center.lng], {
                radius: radiusMeters,
                color: zoneColor,
                fillColor: zoneColor,
                fillOpacity: 0.15,
                weight: 1.5
            }).addTo(citizenMap);
            circle.bindPopup(`
                <strong>${zone.name || 'Zone'}</strong><br>
                Type: Circle Zone<br>
                Radius: ${zone.radius || 5} km<br>
                Created by: ${zone.createdByRole === 'officer' ? 'Forest Officer' : 'Admin'}
            `);
            citizenMarkers.push(circle);
        }
    });
    
    // Then add report markers in batches
    const batchSize = 8;
    let index = 0;
    
    function addBatch() {
        const end = Math.min(index + batchSize, reports.length);
        for (let i = index; i < end; i++) {
            const report = reports[i];
            if (!report?.coordinates) continue;
            const lat = Number(report.coordinates.lat);
            const lng = Number(report.coordinates.lng);
            if (isNaN(lat) || isNaN(lng)) continue;
            
            points.push([lat, lng]);
            
            const marker = L.circleMarker([lat, lng], {
                radius: 7,
                fillColor: getRiskColor(report.riskLevel),
                color: '#fff',
                weight: 1.5,
                opacity: 1,
                fillOpacity: 0.85
            }).addTo(citizenMap);
            
            marker.bindPopup(`
                <strong>${report.animalType || 'Sighting'}</strong><br>
                📍 ${report.locationName || 'Unknown'}<br>
                ⚠️ ${report.riskLevel || 'Unknown'}<br>
                🕐 ${safeFormatRelativeTime(report.timestamp)}
            `);
            citizenMarkers.push(marker);
        }
        
        index = end;
        if (index < reports.length) {
            setTimeout(addBatch, 10);
        }
    }
    
    addBatch();
    
    if (points.length > 0) {
        setTimeout(() => {
            try {
                citizenMap.fitBounds(points, { padding: [20, 20] });
            } catch (e) {
                console.log('Fit bounds error');
            }
        }, 100);
    }
}

/**
 * Search location on map
 */
async function searchLocationOnMap(query) {
    if (!query || !citizenMap) return;

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        const data = await response.json();

        if (data && data[0]) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            citizenMap.setView([lat, lng], 12);

            const marker = L.marker([lat, lng]).addTo(citizenMap);
            marker.bindPopup(`Search result: ${query}`).openPopup();

            // Remove marker after 5 seconds
            setTimeout(() => {
                citizenMap.removeLayer(marker);
            }, 5000);
        } else {
            showToast('Location not found', 'warning');
        }
    } catch (error) {
        console.error('Search error:', error);
    }
}

/**
 * Simple Report Wizard - Single page, auto location, auto time, photo capture
 */
/**
 * Simple Report Wizard - Single page, auto location, auto time, photo capture
 */
/**
 * Simple Report Wizard - ULTRA FAST
 * - Renders instantly without waiting for location
 * - Location loads in background
 * - Optimized for mobile networks
 */
function loadReportWizard() {
    const mainContent = document.getElementById('mainContent');
    
    // Initialize report data
    let reportData = {
        animalType: '',
        customAnimal: '',
        locationName: '',
        coordinates: null,
        riskLevel: '',
        description: '',
        photoFile: null
    };
    
    // Animals with emojis
    const animals = [
        { name: 'Tiger', emoji: '🐯' },
        { name: 'Leopard', emoji: '🐆' },
        { name: 'Elephant', emoji: '🐘' },
        { name: 'Bear', emoji: '🐻' },
        { name: 'Snake', emoji: '🐍' },
        { name: 'Monkey', emoji: '🐒' },
        { name: 'Deer', emoji: '🦌' },
        { name: 'Other', emoji: '❓' }
    ];
    
    // Get current time instantly
    const getCurrentTime = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };
    
    const currentTime = getCurrentTime();
    
    // RENDER INSTANTLY - NO WAITING
    mainContent.innerHTML = `
        <div class="container">
            <div class="card" style="max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <i class="fas fa-camera" style="font-size: 2rem; color: var(--primary);"></i>
                    <h2>Report Wildlife Sighting</h2>
                    <p style="color: var(--gray);">Share what you see to help protect your community</p>
                </div>
                
                <form id="simpleReportForm">
                    <!-- Animal Type -->
                    <div class="form-group">
                        <label>🐾 Animal Type *</label>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem;">
                            ${animals.map(animal => `
                                <div class="animal-option" data-animal="${animal.name}" onclick="selectSimpleAnimal('${animal.name}')" style="text-align: center; padding: 0.75rem; background: var(--gray-light); border-radius: 8px; cursor: pointer;">
                                    <div style="font-size: 1.8rem;">${animal.emoji}</div>
                                    <div style="font-size: 0.8rem;">${animal.name}</div>
                                </div>
                            `).join('')}
                        </div>
                        <input type="hidden" id="animalType" required>
                        <div id="customAnimalDiv" style="display: none; margin-top: 0.5rem;">
                            <input type="text" id="customAnimal" placeholder="Enter animal name" style="width: 100%; padding: 0.5rem; border-radius: 8px; border: 1px solid var(--gray-light);">
                        </div>
                    </div>
                    
                    <!-- Location - Shows detection status -->
                    <div class="form-group">
                        <label>📍 Location *</label>
                        <div id="locationStatus" style="background: var(--gray-light); padding: 0.75rem; border-radius: 8px; margin-bottom: 0.75rem;">
                            <i class="fas fa-spinner fa-spin"></i> Detecting location...
                        </div>
                        <input type="text" id="locationName" placeholder="Landmark name (e.g., Mukki Gate, Near village well)" required style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--gray-light); margin-bottom: 0.5rem;">
                        <div style="display: flex; gap: 0.5rem;">
                            <input type="text" id="latitude" placeholder="Latitude" style="flex: 1; padding: 0.5rem; border-radius: 8px; border: 1px solid var(--gray-light);">
                            <input type="text" id="longitude" placeholder="Longitude" style="flex: 1; padding: 0.5rem; border-radius: 8px; border: 1px solid var(--gray-light);">
                            <button type="button" class="btn btn-outline btn-sm" onclick="refreshLocation()" style="padding: 0.5rem 1rem;">
                                <i class="fas fa-location-arrow"></i> Retry
                            </button>
                        </div>
                        <small style="color: var(--gray);">Location will be detected automatically. Edit if incorrect.</small>
                    </div>
                    
                    <!-- Time - Auto filled -->
                    <div class="form-group">
                        <label>🕐 Time of Sighting *</label>
                        <input type="datetime-local" id="timeOfSighting" value="${currentTime}" required style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--gray-light);">
                        <small style="color: var(--gray);">Current time auto-filled. Change if needed.</small>
                    </div>
                    
                    <!-- Risk Level -->
                    <div class="form-group">
                        <label>⚠️ Risk Level *</label>
                        <select id="riskLevel" required style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--gray-light);">
                            <option value="">Select risk level</option>
                            <option value="Low">🟢 Low - Animal in forest/natural area, calm behavior</option>
                            <option value="Medium">🟡 Medium - Animal near village/road, may cause trouble</option>
                            <option value="High">🔴 High - Aggressive behavior, immediate threat to people</option>
                        </select>
                    </div>
                    
                    <!-- Photo Capture -->
                    <div class="form-group">
                        <label>📸 Photo (Optional)</label>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <button type="button" class="btn btn-outline btn-sm" onclick="capturePhoto()" style="padding: 0.5rem 1rem;">
                                <i class="fas fa-camera"></i> Take Photo
                            </button>
                            <button type="button" class="btn btn-outline btn-sm" onclick="uploadPhoto()" style="padding: 0.5rem 1rem;">
                                <i class="fas fa-image"></i> Choose from Gallery
                            </button>
                        </div>
                        <div id="photoPreview" style="margin-top: 0.5rem;"></div>
                        <small style="color: var(--gray);">Take a photo or upload from gallery. Helps officers verify.</small>
                    </div>
                    
                    <!-- Description -->
                    <div class="form-group">
                        <label>📝 Additional Notes</label>
                        <textarea id="description" rows="3" placeholder="Any details: how many animals, what they were doing, etc..." style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--gray-light);"></textarea>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem; padding: 0.75rem;">
                        <i class="fas fa-paper-plane"></i> Submit Report
                    </button>
                    <div id="reportMessage" class="message" style="margin-top: 1rem;"></div>
                </form>
            </div>
        </div>
    `;
    
    // GET LOCATION IN BACKGROUND (doesn't block rendering)
    const getLocationInBackground = () => {
        if (!navigator.geolocation) {
            document.getElementById('locationStatus').innerHTML = '<i class="fas fa-exclamation-triangle" style="color: orange;"></i> Location detection not supported. Please enter manually.';
            return;
        }
        
        // Use Promise.race to timeout after 3 seconds
        const locationPromise = new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
                enableHighAccuracy: false, // Faster, less accurate
                maximumAge: 60000 // Use cached location up to 1 minute
            });
        });
        
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve(null), 3000);
        });
        
        Promise.race([locationPromise, timeoutPromise]).then((position) => {
            const statusEl = document.getElementById('locationStatus');
            const latInput = document.getElementById('latitude');
            const lngInput = document.getElementById('longitude');
            
            if (position && position.coords) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                latInput.value = lat.toFixed(6);
                lngInput.value = lng.toFixed(6);
                reportData.coordinates = { lat, lng };
                statusEl.innerHTML = '<i class="fas fa-check-circle" style="color: green;"></i> Location detected!';
                statusEl.style.background = '#e8f5e9';
            } else {
                statusEl.innerHTML = '<i class="fas fa-map-marker-alt"></i> Could not auto-detect. Please enter coordinates manually.';
                statusEl.style.background = '#fff3e0';
            }
        });
    };
    
    // Start location detection after render (non-blocking)
    setTimeout(getLocationInBackground, 10);
    
    // ========== EVENT HANDLERS ==========
    window.selectSimpleAnimal = (animal) => {
        document.getElementById('animalType').value = animal;
        
        document.querySelectorAll('.animal-option').forEach(el => {
            if (el.dataset.animal === animal) {
                el.style.background = 'var(--primary)';
                el.style.color = 'white';
            } else {
                el.style.background = 'var(--gray-light)';
                el.style.color = 'inherit';
            }
        });
        
        const customDiv = document.getElementById('customAnimalDiv');
        if (animal === 'Other') {
            customDiv.style.display = 'block';
            document.getElementById('customAnimal').focus();
        } else {
            customDiv.style.display = 'none';
            document.getElementById('customAnimal').value = '';
        }
    };
    
    window.refreshLocation = () => {
        if (navigator.geolocation) {
            showToast('Getting location...', 'info');
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    document.getElementById('latitude').value = lat.toFixed(6);
                    document.getElementById('longitude').value = lng.toFixed(6);
                    reportData.coordinates = { lat, lng };
                    const statusEl = document.getElementById('locationStatus');
                    statusEl.innerHTML = '<i class="fas fa-check-circle" style="color: green;"></i> Location updated!';
                    statusEl.style.background = '#e8f5e9';
                    showToast('Location updated!', 'success');
                },
                (error) => {
                    showToast('Unable to get location. Please enter manually.', 'error');
                }
            );
        } else {
            showToast('Geolocation not supported.', 'error');
        }
    };
    
    window.capturePhoto = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = (e) => {
            if (e.target.files && e.target.files[0]) {
                handlePhotoFile(e.target.files[0]);
            }
        };
        input.click();
    };
    
    window.uploadPhoto = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            if (e.target.files && e.target.files[0]) {
                handlePhotoFile(e.target.files[0]);
            }
        };
        input.click();
    };
    
    function handlePhotoFile(file) {
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Photo is too large. Please choose a photo under 5MB.', 'error');
            return;
        }
        
        reportData.photoFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
            const preview = document.getElementById('photoPreview');
            preview.innerHTML = `
                <img src="${event.target.result}" style="max-width: 100%; border-radius: 8px; margin-top: 0.5rem;">
                <button type="button" class="btn btn-danger btn-sm" onclick="removePhoto()" style="margin-top: 0.5rem; padding: 0.25rem 0.5rem;">Remove Photo</button>
            `;
        };
        reader.readAsDataURL(file);
    }
    
    window.removePhoto = () => {
        reportData.photoFile = null;
        document.getElementById('photoPreview').innerHTML = '';
    };
    
    // Form submission
    document.getElementById('simpleReportForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let animalType = document.getElementById('animalType').value;
        const customAnimal = document.getElementById('customAnimal')?.value.trim();
        
        if (animalType === 'Other' && customAnimal) {
            animalType = customAnimal;
        }
        
        const locationName = document.getElementById('locationName').value.trim();
        const latitude = document.getElementById('latitude').value;
        const longitude = document.getElementById('longitude').value;
        const riskLevel = document.getElementById('riskLevel').value;
        const description = document.getElementById('description').value;
        const timeOfSighting = document.getElementById('timeOfSighting').value;
        
        // Validation
        if (!animalType) {
            showMessage('reportMessage', 'Please select an animal type', 'error');
            return;
        }
        if (!locationName) {
            showMessage('reportMessage', 'Please enter a location name', 'error');
            return;
        }
        if (!riskLevel) {
            showMessage('reportMessage', 'Please select a risk level', 'error');
            return;
        }
        
        let lat = null, lng = null;
        if (latitude && longitude) {
            lat = parseFloat(latitude);
            lng = parseFloat(longitude);
            if (isNaN(lat) || isNaN(lng)) {
                showMessage('reportMessage', 'Invalid coordinates. Click "Retry" to get location.', 'error');
                return;
            }
        } else {
            showMessage('reportMessage', 'Please get your location (click "Retry" button).', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('animalType', animalType);
        formData.append('locationName', locationName);
        formData.append('coordinates', JSON.stringify({ lat, lng }));
        formData.append('riskLevel', riskLevel);
        formData.append('description', description || '');
        formData.append('timeOfSighting', timeOfSighting || new Date().toISOString());
        if (reportData.photoFile) {
            formData.append('image', reportData.photoFile);
        }
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;
        
        try {
            const response = await apiRequest('/reports', {
                method: 'POST',
                body: formData,
                useCache: false
            });
            
            showMessage('reportMessage', '✅ Report submitted successfully! An officer will review it shortly.', 'success');
            
            if (window.CacheManager) {
                window.CacheManager.clear('GET:/reports');
            }
            
            setTimeout(() => {
                loadPage('dashboard');
            }, 1500);
            
        } catch (error) {
            console.error('Submission error:', error);
            showMessage('reportMessage', error.message || 'Failed to submit report. Please try again.', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
    
    function showMessage(elementId, message, type) {
        const msgDiv = document.getElementById(elementId);
        if (msgDiv) {
            msgDiv.textContent = message;
            msgDiv.className = `message ${type}`;
            msgDiv.style.display = 'block';
            setTimeout(() => {
                msgDiv.style.display = 'none';
            }, 5000);
        }
    }
}


/**
 * Submit final report
 */
async function submitFinalReport() {
    const submitBtn = document.getElementById('submitReportBtn');
    const originalText = submitBtn?.innerHTML;

    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;
    }

    try {
        const formData = new FormData();
        formData.append('animalType', reportData.animalType);
        formData.append('locationName', reportData.locationName);
        formData.append('coordinates', JSON.stringify(reportData.coordinates));
        formData.append('riskLevel', reportData.riskLevel);
        formData.append('description', reportData.description);

        // Add behavior and count as extra data
        formData.append('animalCount', reportData.animalCount);
        formData.append('behavior', JSON.stringify(reportData.behavior));
        formData.append('timeOfSighting', reportData.timeOfSighting);

        if (reportData.photo) {
            formData.append('image', reportData.photo);
        }

        const response = await apiRequest('/reports', {
            method: 'POST',
            body: formData
        });

        showToast('Report submitted successfully! An officer will review it shortly.', 'success');

        // Reset and go to dashboard
        reportData = {
            animalType: '',
            animalCount: 1,
            behavior: [],
            timeOfSighting: new Date().toISOString().slice(0, 16),
            locationName: '',
            coordinates: null,
            description: '',
            photo: null,
            riskLevel: ''
        };

        loadPage('dashboard');

    } catch (error) {
        showToast(error.message, 'error');
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}




async function loadAlertsPage() {
    const mainContent = document.getElementById('mainContent');
    
    // State for filters
    let currentRiskFilter = '';
    let currentRadius = 10; // Default 10km
    let userLocation = null;
    let isLocating = false;
    
    // Function to get user location with timeout
    const getUserLocation = () => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve(null);
                return;
            }
            isLocating = true;
            updateLocationStatus('Detecting your location...');
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    isLocating = false;
                    updateLocationStatus(`📍 Location detected! Showing alerts within ${currentRadius}km`);
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    isLocating = false;
                    updateLocationStatus('⚠️ Location unavailable. Showing all alerts.');
                    console.log('Location error:', error);
                    resolve(null);
                },
                { timeout: 5000, enableHighAccuracy: false }
            );
        });
    };
    
    // Update location status display
    const updateLocationStatus = (message) => {
        const statusEl = document.getElementById('locationStatus');
        if (statusEl) statusEl.innerHTML = message;
    };
    
    // Calculate distance between two points in km
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
        return Math.hypot(lat1 - lat2, lng1 - lng2) * 111;
    };
    
    // Function to render alerts with filters
    const renderAlerts = async () => {
        const container = document.getElementById('alertsList');
        if (!container) return;
        
        container.innerHTML = '<div style="text-align: center; padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> Loading alerts...</div>';
        
        try {
            const response = await fetch('/api/alerts', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            const data = await response.json();
            let alerts = data.alerts || [];
            
            // Apply risk filter
            if (currentRiskFilter) {
                alerts = alerts.filter(a => 
                    a.riskLevel?.toLowerCase() === currentRiskFilter.toLowerCase()
                );
            }
            
            // Apply distance filter
            let showDistanceColumn = false;
            let filteredByDistance = false;
            
            if (userLocation && currentRadius !== 'all') {
                const radiusKm = parseInt(currentRadius);
                alerts = alerts.filter(alert => {
                    if (!alert.coordinates) return false;
                    const distance = calculateDistance(
                        userLocation.lat, userLocation.lng,
                        alert.coordinates.lat, alert.coordinates.lng
                    );
                    alert.distance = distance;
                    return distance <= radiusKm;
                });
                filteredByDistance = true;
                showDistanceColumn = true;
                updateLocationStatus(`📍 Showing ${alerts.length} alerts within ${radiusKm}km of you`);
            } else if (currentRadius === 'all') {
                updateLocationStatus(`🌍 Showing all alerts (no distance filter)`);
            } else if (!userLocation && currentRadius !== 'all') {
                updateLocationStatus(`⚠️ Location unavailable. Showing all alerts. Click "Detect Location" to enable distance filter.`);
            }
            
            if (alerts.length === 0) {
                let emptyMessage = 'No alerts found';
                if (filteredByDistance) {
                    emptyMessage = `No alerts within ${currentRadius}km of your location`;
                } else if (currentRiskFilter) {
                    emptyMessage = `No ${currentRiskFilter} risk alerts found`;
                }
                container.innerHTML = `
                    <div style="text-align: center; padding: 3rem; background: white; border-radius: 12px;">
                        <i class="fas fa-bell-slash" style="font-size: 3rem; color: #6c757d;"></i>
                        <h3>${emptyMessage}</h3>
                        <button class="btn btn-outline btn-sm" onclick="resetFilters()" style="margin-top: 1rem;">
                            <i class="fas fa-undo"></i> Reset Filters
                        </button>
                    </div>
                `;
                return;
            }
            
            // Sort by distance if available
            if (showDistanceColumn && userLocation) {
                alerts.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
            }
            
            // Render alerts
            container.innerHTML = alerts.map(alert => {
                const distanceText = alert.distance ? `${alert.distance.toFixed(1)} km away` : '';
                const riskColor = alert.riskLevel === 'High' || alert.riskLevel === 'Critical' ? '#e63946' :
                                 alert.riskLevel === 'Medium' ? '#ffb703' : '#52b788';
                
                return `
                    <div style="background: white; border-radius: 12px; padding: 1rem; margin-bottom: 1rem; border-left: 4px solid ${riskColor}; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <span style="background: ${riskColor}; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: bold;">
                                ${alert.riskLevel || 'MEDIUM'} RISK
                            </span>
                            <span style="color: #6c757d; font-size: 0.75rem;">
                                ${new Date(alert.timestamp).toLocaleString()}
                            </span>
                        </div>
                        <div style="font-size: 1rem; margin-bottom: 0.5rem;">
                            ${alert.message || 'Wildlife Alert'}
                        </div>
                        <div style="color: #6c757d; font-size: 0.85rem;">
                            📍 ${alert.coordinates?.lat?.toFixed(4) || 'Unknown'}, ${alert.coordinates?.lng?.toFixed(4) || 'Unknown'}
                            ${distanceText ? `<span style="margin-left: 1rem;">📍 ${distanceText}</span>` : ''}
                        </div>
                        <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
                            <button class="btn btn-outline btn-sm" onclick="viewAlertOnMap(${alert.coordinates?.lat || 0}, ${alert.coordinates?.lng || 0})">
                                <i class="fas fa-map"></i> View on Map
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="shareAlert('${alert._id}')">
                                <i class="fas fa-share-alt"></i> Share
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Error:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: red; background: white; border-radius: 12px;">
                    <i class="fas fa-exclamation-circle fa-2x"></i>
                    <p>Error loading alerts: ${error.message}</p>
                    <button class="btn btn-primary btn-sm" onclick="renderAlerts()">Try Again</button>
                </div>
            `;
        }
    };
    
    // Get initial location
    userLocation = await getUserLocation();
    
    // Render the page HTML with filters
    mainContent.innerHTML = `
        <div class="container">
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
                    <div>
                        <h2><i class="fas fa-bell"></i> Wildlife Alerts</h2>
                        <p style="color: var(--gray);" id="locationStatus">
                            ${userLocation ? `📍 Showing alerts within ${currentRadius}km of you` : '📍 Detecting location...'}
                        </p>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="refreshAlerts()">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
                
                <div class="filter-bar" style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
                    <div class="filter-group">
                        <label><i class="fas fa-chart-line"></i> Risk Level:</label>
                        <select id="filterRiskSelect">
                            <option value="">All Risks</option>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label><i class="fas fa-map-marker-alt"></i> Distance:</label>
                        <select id="filterRadiusSelect">
                            <option value="all">All Alerts</option>
                            <option value="1">Within 1 km</option>
                            <option value="5">Within 5 km</option>
                            <option value="10" selected>Within 10 km</option>
                            <option value="20">Within 20 km</option>
                            <option value="50">Within 50 km</option>
                        </select>
                    </div>
                    
                    <button class="btn btn-primary btn-sm" onclick="detectLocationAndRefresh()">
                        <i class="fas fa-location-arrow"></i> Detect My Location
                    </button>
                </div>
                
                <div id="alertsList" class="alerts-container">
                    <div style="text-align: center; padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> Loading alerts...</div>
                </div>
            </div>
        </div>
    `;
    
    // Attach filter event listeners
    const riskSelect = document.getElementById('filterRiskSelect');
    const radiusSelect = document.getElementById('filterRadiusSelect');
    
    if (riskSelect) {
        riskSelect.addEventListener('change', (e) => {
            currentRiskFilter = e.target.value;
            renderAlerts();
        });
    }
    
    if (radiusSelect) {
        radiusSelect.addEventListener('change', async (e) => {
            currentRadius = e.target.value;
            if (currentRadius !== 'all' && !userLocation) {
                userLocation = await getUserLocation();
            }
            renderAlerts();
        });
    }
    
    // Global functions
    window.refreshAlerts = () => {
        renderAlerts();
    };
    
    window.detectLocationAndRefresh = async () => {
        userLocation = await getUserLocation();
        renderAlerts();
    };
    
    window.resetFilters = () => {
        if (riskSelect) riskSelect.value = '';
        if (radiusSelect) radiusSelect.value = '10';
        currentRiskFilter = '';
        currentRadius = '10';
        renderAlerts();
    };
    
    // Initial render
    await renderAlerts();
}

// Also add/update the viewAlertOnMap function in main.js or ensure it's global:
window.viewAlertOnMap = function(lat, lng) {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        showToast('Location not available', 'error');
        return;
    }
    loadPage('map');
    setTimeout(() => {
        if (window.liveMapInstance) {
            window.liveMapInstance.setView([lat, lng], 14);
            L.marker([lat, lng]).addTo(window.liveMapInstance).bindPopup('Alert Location').openPopup();
        }
    }, 500);
};

// Add shareAlert if missing
window.shareAlert = function(alertId) {
    const shareUrl = `${window.location.origin}/alerts/${alertId}`;
    if (navigator.share) {
        navigator.share({
            title: 'Wildlife Alert',
            text: 'Check out this wildlife alert',
            url: shareUrl
        });
    } else {
        navigator.clipboard.writeText(shareUrl);
        showToast('Link copied to clipboard!', 'success');
    }
};

