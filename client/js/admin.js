/**
 * Admin Module
 * Handles admin dashboard, analytics, zone management, and system logs
 */

let adminMap = null;
let adminZones = [];
let currentZoneDrawing = [];
let currentDrawMode = 'polygon';
let zoneDrawLayer = null;
let adminChart = null;
let logsPage = 1;
const logsPageSize = 20;
let circleCenter = null; // For circle drawing

// Current active admin tab
let currentAdminTab = 'analytics';

/**
 * Save current admin tab to localStorage
 */
function saveAdminTab(tab) {
    localStorage.setItem('adminTab', tab);
    currentAdminTab = tab;
}

/**
 * Get saved admin tab
 */
function getSavedAdminTab() {
    return localStorage.getItem('adminTab') || 'analytics';
}

/**
 * Load admin dashboard
 */
async function loadAdminDashboard() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="container">
            <div class="dashboard-tabs" style="margin-bottom: 2rem;">
                <button class="tab-btn" onclick="switchAdminTab('analytics')">
                    <i class="fas fa-chart-line"></i> Analytics
                </button>
                <button class="tab-btn" onclick="switchAdminTab('zones')">
                    <i class="fas fa-draw-polygon"></i> Zone Management
                </button>
                <button class="tab-btn" onclick="switchAdminTab('officers')">
                    <i class="fas fa-user-shield"></i> Officer Management
                </button>
                <button class="tab-btn" onclick="switchAdminTab('reports')">
                    <i class="fas fa-file-alt"></i> Reports
                </button>
            </div>
            <div id="adminContent">
                <div class="loading-container">
                    <i class="fas fa-spinner fa-spin fa-2x"></i>
                    <p>Loading dashboard...</p>
                </div>
            </div>
        </div>
    `;
    
    // Get saved tab from localStorage
    const savedTab = getSavedAdminTab();
    currentAdminTab = savedTab;
    
    // Highlight the active tab
    const tabs = document.querySelectorAll('.tab-btn');
    const tabMap = { analytics: 0, zones: 1, officers: 2, reports: 3 };
    const tabIndex = tabMap[savedTab];
    if (tabs[tabIndex]) {
        tabs[tabIndex].classList.add('active');
    } else {
        tabs[0].classList.add('active');
    }
    
    // Load the saved tab
    await loadAdminTabContent(savedTab);
}

/**
 * Load admin tab content based on tab name
 */
async function loadAdminTabContent(tab) {
    const content = document.getElementById('adminContent');
    
    switch(tab) {
        case 'analytics':
            await loadAnalytics();
            break;
        case 'zones':
            await loadZoneManagement();
            break;
        case 'officers':
            await loadOfficerManagement();
            break;
        case 'reports':
            await loadAdminReports();
            break;
        default:
            await loadAnalytics();
    }
}

/**
 * Switch admin tabs
 */
async function switchAdminTab(tab) {
    // Save to localStorage
    saveAdminTab(tab);
    currentAdminTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach((btn, index) => {
        btn.classList.remove('active');
    });
    
    const tabs = document.querySelectorAll('.tab-btn');
    const tabMap = { analytics: 0, zones: 1, officers: 2, reports: 3 };
    const tabIndex = tabMap[tab];
    if (tabs[tabIndex]) tabs[tabIndex].classList.add('active');
    
    const content = document.getElementById('adminContent');
    content.innerHTML = `
        <div class="loading-container">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p>Loading ${tab}...</p>
        </div>
    `;
    
    // Load the selected tab content
    await loadAdminTabContent(tab);
}

/**
 * Load analytics dashboard
 */
async function loadAnalytics() {
    const content = document.getElementById('adminContent');
    
    try {
        const response = await apiRequest('/analytics/summary');
        const { summary, reportsOverTime, animalDistribution } = response;
        
        content.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>${summary.totalReports || 0}</h3>
                    <p>Total Reports</p>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, var(--danger), #c1121f);">
                    <h3>${summary.highRiskReports || 0}</h3>
                    <p>High Risk Reports</p>
                </div>
                <div class="stat-card">
                    <h3>${summary.speciesCount || 0}</h3>
                    <p>Species Count</p>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, var(--warning), #e67e22);">
                    <h3>${summary.pendingReports || 0}</h3>
                    <p>Pending Review</p>
                </div>
                <div class="stat-card">
                    <h3>${summary.verifiedReports || 0}</h3>
                    <p>Verified Reports</p>
                </div>
                <div class="stat-card">
                    <h3>${summary.totalAlerts || 0}</h3>
                    <p>Active Alerts</p>
                </div>
                <div class="stat-card">
                    <h3>${summary.officerCount || 0}</h3>
                    <p>Officer Accounts</p>
                </div>
                <div class="stat-card">
                    <h3>${summary.totalZones || 0}</h3>
                    <p>Active Zones</p>
                </div>
            </div>
            
            <div class="card" style="margin-bottom: 1.5rem;">
                <h3><i class="fas fa-chart-bar"></i> Reports Over Time (Last 30 Days)</h3>
                <canvas id="reportsChart" style="max-height: 300px; margin-top: 1rem;"></canvas>
            </div>
            
            <div class="dashboard-grid" style="grid-template-columns: 1fr 1fr;">
                <div class="card">
                    <h3><i class="fas fa-paw"></i> Top Animal Sightings</h3>
                    <table class="data-table">
                        <thead>
                            <tr><th>Animal Type</th><th>Count</th> </tr>
                        </thead>
                        <tbody>
                            ${animalDistribution?.map(item => `
                                <tr><td>${item._id}</td><td>${item.count}</td> </tr>
                            `).join('') || '<tr><td colspan="2">No data</td></tr>'}
                        </tbody>
                    </table>
                </div>
                
                <div class="card">
                    <h3><i class="fas fa-trophy"></i> Top Reporters (This Month)</h3>
                    <div id="topReporters">
                        <div class="loading-container"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
                    </div>
                </div>
            </div>
        `;
        
        // Create chart
        const ctx = document.getElementById('reportsChart')?.getContext('2d');
        if (ctx && reportsOverTime && reportsOverTime.length > 0) {
            const labels = reportsOverTime.map(item => item._id);
            const data = reportsOverTime.map(item => item.count);
            
            if (adminChart) adminChart.destroy();
            
            adminChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Reports',
                        data: data,
                        borderColor: '#2d6a4f',
                        backgroundColor: 'rgba(45, 106, 79, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { position: 'top' }
                    }
                }
            });
        }
        
        // Load top reporters
        await loadTopReporters();
        
    } catch (error) {
        console.error('Error loading analytics:', error);
        content.innerHTML = `<p style="color: var(--danger);">Error loading analytics: ${error.message}</p>`;
    }
}

/**
 * Load top reporters
 */
async function loadTopReporters() {
    try {
        const response = await apiRequest('/reports');
        const reports = response.reports || [];
        
        // Group by user
        const userReports = {};
        reports.forEach(report => {
            const userId = report.createdBy?._id || 'anonymous';
            const userName = report.createdBy?.name || 'Anonymous';
            if (!userReports[userId]) {
                userReports[userId] = { name: userName, count: 0 };
            }
            userReports[userId].count++;
        });
        
        const topReporters = Object.values(userReports)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        
        const container = document.getElementById('topReporters');
        if (container) {
            container.innerHTML = topReporters.map(reporter => `
                <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--gray-light);">
                    <span><i class="fas fa-user"></i> ${reporter.name}</span>
                    <span class="alert-badge low">${reporter.count} reports</span>
                </div>
            `).join('');
            
            if (topReporters.length === 0) {
                container.innerHTML = '<p>No reporters yet</p>';
            }
        }
        
    } catch (error) {
        console.error('Error loading top reporters:', error);
    }
}

/**
 * Load zone management
 */
async function loadZoneManagement() {
    const content = document.getElementById('adminContent');
    
    content.innerHTML = `
        <div class="card" style="margin-bottom: 1.5rem;">
            <h3><i class="fas fa-draw-polygon"></i> Create New Zone</h3>
            <div class="zone-tools">
                <button class="tool-btn ${currentDrawMode === 'polygon' ? 'active' : ''}" onclick="setDrawMode('polygon')">
                    <i class="fas fa-draw-polygon"></i> Polygon
                </button>
                <button class="tool-btn ${currentDrawMode === 'circle' ? 'active' : ''}" onclick="setDrawMode('circle')">
                    <i class="fas fa-circle"></i> Circle
                </button>
                <button class="tool-btn ${currentDrawMode === 'pin' ? 'active' : ''}" onclick="setDrawMode('pin')">
                    <i class="fas fa-map-pin"></i> Pin
                </button>
                <button class="tool-btn ${currentDrawMode === 'path' ? 'active' : ''}" onclick="setDrawMode('path')">
                    <i class="fas fa-chart-line"></i> Path
                </button>
                <button class="tool-btn" onclick="clearZoneDrawing()">
                    <i class="fas fa-trash"></i> Clear
                </button>
            </div>
            <div id="zoneMap" class="map-container" style="height: 400px;"></div>
            
            <form id="zoneForm" style="margin-top: 1.5rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Zone Name *</label>
                        <input type="text" id="zoneName" placeholder="e.g., Tiger Corridor Zone 5" required>
                    </div>
                    <div class="form-group">
                        <label>Animal Type</label>
                        <select id="zoneAnimal">
                            <option value="">Select Animal</option>
                            <option value="Tiger">Tiger</option>
                            <option value="Elephant">Elephant</option>
                            <option value="Leopard">Leopard</option>
                            <option value="Bear">Bear</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Risk Level</label>
                        <select id="zoneRisk">
                            <option value="Critical">Critical</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Radius (km)</label>
                        <select id="zoneRadius">
                            <option value="0.5">0.5 km</option>
                            <option value="5" selected>5.0 km</option>
                            <option value="20">20 km</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Zone Expiry</label>
                        <input type="date" id="zoneExpiry" value="${getDateAfterDays(7)}">
                    </div>
                    <div class="form-group">
                        <label>Public Alert Message</label>
                        <input type="text" id="zoneMessage" placeholder="Alert message for public">
                    </div>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="notifyOfficers" checked>
                        Notify all duty officers in sector
                    </label>
                </div>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-plus-circle"></i> Create Zone & Issue Alert
                </button>
            </form>
        </div>
        
        <div class="card">
            <h3><i class="fas fa-layer-group"></i> Active Zones (${adminZones.length})</h3>
            <div id="zonesList"></div>
        </div>
    `;
    
    // Initialize zone map
    if (!adminMap) {
        adminMap = L.map('zoneMap').setView([20.5937, 78.9629], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(adminMap);
        
        // Add drawing controls
        adminMap.on('click', handleMapClick);
    }
    
    // Load existing zones
    await loadZonesList();
    
    // Handle zone form submission
    document.getElementById('zoneForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await createZone();
    });
}

/**
 * Handle map click for zone drawing
 */
function handleMapClick(e) {
    if (currentDrawMode === 'polygon') {
        currentZoneDrawing.push([e.latlng.lat, e.latlng.lng]);
        
        // Update drawing layer
        if (zoneDrawLayer) adminMap.removeLayer(zoneDrawLayer);
        
        if (currentZoneDrawing.length === 1) {
            zoneDrawLayer = L.marker([e.latlng.lat, e.latlng.lng]).addTo(adminMap);
        } else {
            zoneDrawLayer = L.polyline(currentZoneDrawing, {
                color: '#2d6a4f',
                weight: 3,
                dashArray: '5, 5'
            }).addTo(adminMap);
        }
        
        showToast(`Point ${currentZoneDrawing.length} added. Click to continue drawing polygon.`, 'info');
        
    } else if (currentDrawMode === 'circle') {
        // Circle drawing logic
        if (!circleCenter) {
            // First click - set center
            circleCenter = e.latlng;
            
            // Add marker for center
            if (zoneDrawLayer) adminMap.removeLayer(zoneDrawLayer);
            zoneDrawLayer = L.marker([circleCenter.lat, circleCenter.lng], {
                icon: L.divIcon({
                    className: 'circle-center-marker',
                    html: '<div style="background: #2d6a4f; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
                    iconSize: [12, 12]
                })
            }).addTo(adminMap);
            
            showToast('Center point placed. Now click to set radius.', 'info');
            
        } else {
            // Second click - calculate radius and draw circle
            const radiusLatLng = e.latlng;
            const radiusDistance = circleCenter.distanceTo(radiusLatLng) / 1000; // Convert to km
            
            // Remove existing circle if any
            if (zoneDrawLayer && zoneDrawLayer instanceof L.Circle) {
                adminMap.removeLayer(zoneDrawLayer);
            }
            
            // Draw the circle
            zoneDrawLayer = L.circle([circleCenter.lat, circleCenter.lng], {
                radius: radiusDistance * 1000, // Convert back to meters
                color: '#2d6a4f',
                fillColor: '#2d6a4f',
                fillOpacity: 0.2,
                weight: 2,
                dashArray: '5, 5'
            }).addTo(adminMap);
            
            // Store circle data
            currentZoneDrawing = [{
                type: 'circle',
                center: { lat: circleCenter.lat, lng: circleCenter.lng },
                radius: radiusDistance
            }];
            
            showToast(`Circle drawn! Radius: ${radiusDistance.toFixed(2)} km`, 'success');
            
            // Reset for next circle
            circleCenter = null;
        }
        
    } else if (currentDrawMode === 'pin') {
        if (zoneDrawLayer) adminMap.removeLayer(zoneDrawLayer);
        zoneDrawLayer = L.marker([e.latlng.lat, e.latlng.lng]).addTo(adminMap);
        currentZoneDrawing = [{
            type: 'point',
            coordinates: { lat: e.latlng.lat, lng: e.latlng.lng }
        }];
        showToast('Pin placed. Click "Create Zone" to save this location.', 'success');
        
    } else if (currentDrawMode === 'path') {
        currentZoneDrawing.push({ lat: e.latlng.lat, lng: e.latlng.lng });
        
        if (zoneDrawLayer) adminMap.removeLayer(zoneDrawLayer);
        
        const latlngs = currentZoneDrawing.map(p => [p.lat, p.lng]);
        zoneDrawLayer = L.polyline(latlngs, {
            color: '#ff9f1c',
            weight: 4
        }).addTo(adminMap);
        
        showToast(`Path point ${currentZoneDrawing.length} added.`, 'info');
    }
}

/**
 * Set draw mode
 */
function setDrawMode(mode) {
    currentDrawMode = mode;
    
    // Reset drawing data
    currentZoneDrawing = [];
    circleCenter = null;
    if (zoneDrawLayer) {
        adminMap.removeLayer(zoneDrawLayer);
        zoneDrawLayer = null;
    }
    
    // Update button styles
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    const buttons = document.querySelectorAll('.tool-btn');
    const modeMap = { polygon: 0, circle: 1, pin: 2, path: 3 };
    const index = modeMap[mode];
    if (buttons[index]) buttons[index].classList.add('active');
    
    // Change cursor style
    if (mode === 'circle') {
        adminMap.getContainer().style.cursor = 'crosshair';
        showToast('Circle mode: Click to set center, then click to set radius', 'info');
    } else if (mode === 'polygon') {
        adminMap.getContainer().style.cursor = 'crosshair';
        showToast('Polygon mode: Click points to draw polygon', 'info');
    } else if (mode === 'pin') {
        adminMap.getContainer().style.cursor = 'pointer';
        showToast('Pin mode: Click to place a point marker', 'info');
    } else if (mode === 'path') {
        adminMap.getContainer().style.cursor = 'crosshair';
        showToast('Path mode: Click points to draw a path', 'info');
    }
}

/**
 * Clear zone drawing
 */
function clearZoneDrawing() {
    if (zoneDrawLayer) adminMap.removeLayer(zoneDrawLayer);
    currentZoneDrawing = [];
    circleCenter = null;
    zoneDrawLayer = null;
    showToast('Drawing cleared', 'success');
}

/**
 * Create zone
 */
async function createZone() {
    const name = document.getElementById('zoneName')?.value;
    const animalType = document.getElementById('zoneAnimal')?.value;
    const riskLevel = document.getElementById('zoneRisk')?.value;
    const radius = parseFloat(document.getElementById('zoneRadius')?.value);
    const expiry = document.getElementById('zoneExpiry')?.value;
    const alertMessage = document.getElementById('zoneMessage')?.value;
    const notifyOfficers = document.getElementById('notifyOfficers')?.checked;
    
    if (!name) {
        showToast('Please enter zone name', 'error');
        return;
    }
    
    if (currentZoneDrawing.length === 0) {
        showToast('Please draw a zone on the map first', 'error');
        return;
    }
    
    // Prepare zone geometry based on drawing mode
    let geometry;
    let alertCoords = null;
    
    if (currentDrawMode === 'circle' && currentZoneDrawing[0]?.type === 'circle') {
        // Circle zone
        geometry = {
            type: 'Circle',
            center: currentZoneDrawing[0].center,
            radius: currentZoneDrawing[0].radius // in km
        };
        alertCoords = currentZoneDrawing[0].center;
        
    } else if (currentDrawMode === 'pin') {
        // Point zone
        geometry = {
            type: 'Point',
            coordinates: [currentZoneDrawing[0].coordinates.lng, currentZoneDrawing[0].coordinates.lat]
        };
        alertCoords = currentZoneDrawing[0].coordinates;
        
    } else if (currentDrawMode === 'path') {
        // Path/Line zone
        geometry = {
            type: 'LineString',
            coordinates: currentZoneDrawing.map(p => [p.lng, p.lat])
        };
        alertCoords = currentZoneDrawing[0];
        
    } else {
        // Polygon - close the polygon
        const closedPolygon = [...currentZoneDrawing, currentZoneDrawing[0]];
        geometry = {
            type: 'Polygon',
            coordinates: [closedPolygon.map(p => [p[1], p[0]])]
        };
        alertCoords = currentZoneDrawing[0];
    }
    
    try {
        const response = await apiRequest('/zones', {
            method: 'POST',
            body: JSON.stringify({
                name,
                animalType,
                riskLevel,
                radius: radius || (currentZoneDrawing[0]?.radius || 5),
                expiry,
                alertMessage,
                geometry,
                zoneType: currentDrawMode === 'circle' ? 'Circle' : 
                          currentDrawMode === 'pin' ? 'Point' : 
                          currentDrawMode === 'path' ? 'Line' : 'Polygon',
                notifyOfficers
            })
        });
        
        showToast(`Zone "${name}" created successfully!`, 'success');
        
        // Clear drawing
        clearZoneDrawing();
        document.getElementById('zoneForm').reset();
        
        // Reload zones list
        await loadZonesList();
        
        // If alert message provided, also create an alert
        if (alertMessage && alertCoords) {
            try {
                await apiRequest('/alerts', {
                    method: 'POST',
                    body: JSON.stringify({
                        message: alertMessage,
                        riskLevel: riskLevel,
                        coordinates: alertCoords
                    })
                });
                showToast('Alert published successfully', 'success');
            } catch (error) {
                console.error('Error publishing alert:', error);
            }
        }
        
    } catch (error) {
        showToast(error.message, 'error');
    }
}

/**
 * Load zones list
 */
async function loadZonesList() {
    try {
        const response = await apiRequest('/zones');
        adminZones = response.zones || [];
        
        // Clear existing zone layers
        if (window.zoneLayers) {
            window.zoneLayers.forEach(layer => {
                if (adminMap) adminMap.removeLayer(layer);
            });
        }
        window.zoneLayers = [];
        
        // Display zones on map
        adminZones.forEach(zone => {
            if (zone.geometry) {
                if (zone.geometry.type === 'Polygon') {
                    const coords = zone.geometry.coordinates[0].map(c => [c[1], c[0]]);
                    const polygon = L.polygon(coords, {
                        color: '#2d6a4f',
                        fillColor: '#2d6a4f',
                        fillOpacity: 0.3,
                        weight: 2
                    }).addTo(adminMap).bindPopup(zone.name);
                    window.zoneLayers.push(polygon);
                    
                } else if (zone.geometry.type === 'Circle') {
                    // Circle zone
                    const circle = L.circle([zone.geometry.center.lat, zone.geometry.center.lng], {
                        radius: zone.geometry.radius * 1000,
                        color: '#2d6a4f',
                        fillColor: '#2d6a4f',
                        fillOpacity: 0.3,
                        weight: 2
                    }).addTo(adminMap).bindPopup(`
                        <strong>${zone.name}</strong><br>
                        Type: Circle Zone<br>
                        Radius: ${zone.geometry.radius} km
                    `);
                    window.zoneLayers.push(circle);
                    
                } else if (zone.geometry.type === 'Point') {
                    const marker = L.marker([zone.geometry.coordinates[1], zone.geometry.coordinates[0]])
                        .addTo(adminMap)
                        .bindPopup(zone.name);
                    window.zoneLayers.push(marker);
                    
                } else if (zone.geometry.type === 'LineString') {
                    const coords = zone.geometry.coordinates.map(c => [c[1], c[0]]);
                    const polyline = L.polyline(coords, {
                        color: '#ff9f1c',
                        weight: 3,
                        dashArray: '5, 5'
                    }).addTo(adminMap).bindPopup(zone.name);
                    window.zoneLayers.push(polyline);
                }
            } else if (zone.polygonCoordinates && zone.polygonCoordinates.length > 0) {
                // Legacy polygon format
                const coords = zone.polygonCoordinates.map(c => [c[0], c[1]]);
                const polygon = L.polygon(coords, {
                    color: '#2d6a4f',
                    fillColor: '#2d6a4f',
                    fillOpacity: 0.3,
                    weight: 2
                }).addTo(adminMap).bindPopup(zone.name);
                window.zoneLayers.push(polygon);
            }
        });
        
        const zonesList = document.getElementById('zonesList');
        if (zonesList) {
            zonesList.innerHTML = adminZones.map(zone => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--gray-light);">
                    <div>
                        <strong>${zone.name}</strong>
                        <div style="font-size: 0.85rem; color: var(--gray);">
                            ${zone.zoneType || 'Zone'} · ${zone.geometry?.type || 'Polygon'} · Created ${new Date(zone.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                    <button class="btn btn-danger btn-sm" onclick="deleteZone('${zone._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
            
            if (adminZones.length === 0) {
                zonesList.innerHTML = '<p>No zones created yet</p>';
            }
        }
        
    } catch (error) {
        console.error('Error loading zones:', error);
    }
}

/**
 * Delete zone
 */
async function deleteZone(zoneId) {
    if (!confirm('Are you sure you want to delete this zone?')) return;
    
    try {
        await apiRequest(`/zones/${zoneId}`, {
            method: 'DELETE'
        });
        showToast('Zone deleted successfully', 'success');
        await loadZonesList();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

/**
 * Load officer management
 */
async function loadOfficerManagement() {
    const content = document.getElementById('adminContent');
    
    content.innerHTML = `
        <div class="card" style="margin-bottom: 1.5rem;">
            <h3><i class="fas fa-user-plus"></i> Register New Officer</h3>
            <form id="createOfficerForm" style="max-width: 500px;">
                <div class="form-group">
                    <label>Officer Name *</label>
                    <input type="text" id="officerName" placeholder="Full Name" required>
                </div>
                <div class="form-group">
                    <label>Email *</label>
                    <input type="email" id="officerEmail" placeholder="officer@forest.gov.in" required>
                </div>
                <div class="form-group">
                    <label>Password *</label>
                    <input type="password" id="officerPassword" placeholder="Minimum 6 characters" required>
                </div>
                <div class="form-group">
                    <label>District</label>
                    <input type="text" id="officerDistrict" placeholder="e.g., Kanha, Pench">
                </div>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-user-shield"></i> Create Officer Account
                </button>
            </form>
        </div>
        
        <div class="card">
            <h3><i class="fas fa-users"></i> Existing Officers</h3>
            <div id="officersList"></div>
        </div>
    `;
    
    // Load existing officers
    await loadOfficersList();
    
    // Handle form submission
    document.getElementById('createOfficerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('officerName').value;
        const email = document.getElementById('officerEmail').value;
        const password = document.getElementById('officerPassword').value;
        const district = document.getElementById('officerDistrict').value;
        
        if (!name || !email || !password) {
            showToast('Please fill all required fields', 'error');
            return;
        }
        
        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }
        
        try {
            const response = await apiRequest('/admin/create-officer', {
                method: 'POST',
                body: JSON.stringify({ name, email, password, district })
            });
            
            showToast('Officer account created successfully!', 'success');
            document.getElementById('createOfficerForm').reset();
            await loadOfficersList();
            
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

/**
 * Load officers list
 */
async function loadOfficersList() {
    try {
        const response = await apiRequest('/admin/officers');
        const officers = response.officers || [];
        
        const container = document.getElementById('officersList');
        if (!container) return;
        
        if (officers.length === 0) {
            container.innerHTML = '<p>No officers created yet</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr><th>Name</th><th>Email</th><th>District</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    ${officers.map(officer => `
                        <tr>
                            <td>${officer.name}</td>
                            <td>${officer.email}</td>
                            <td>${officer.district || '-'}</td>
                            <td><span class="alert-badge low">Active</span></td>
                            <td>
                                <button class="btn btn-danger btn-sm" onclick="disableOfficer('${officer._id}')">
                                    <i class="fas fa-ban"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        console.error('Error loading officers:', error);
    }
}

/**
 * Load admin reports view
 */
async function loadAdminReports() {
    const content = document.getElementById('adminContent');
    
    content.innerHTML = `
        <div class="card">
            <h3><i class="fas fa-file-alt"></i> All Reports</h3>
            <div class="filter-bar">
                <select id="reportStatusFilter">
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                </select>
                <select id="reportRiskFilter">
                    <option value="">All Risk</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                </select>
                <button class="btn btn-primary btn-sm" onclick="exportReports()">
                    <i class="fas fa-download"></i> Export CSV
                </button>
            </div>
            <div id="adminReportsList"></div>
        </div>
    `;
    
    await loadAdminReportsList();
    
    document.getElementById('reportStatusFilter')?.addEventListener('change', loadAdminReportsList);
    document.getElementById('reportRiskFilter')?.addEventListener('change', loadAdminReportsList);
}

/**
 * Load admin reports list
 */
async function loadAdminReportsList() {
    const status = document.getElementById('reportStatusFilter')?.value;
    const risk = document.getElementById('reportRiskFilter')?.value;
    
    let url = '/reports';
    const params = [];
    if (status) params.push(`status=${status}`);
    if (risk) params.push(`riskLevel=${risk}`);
    if (params.length) url += '?' + params.join('&');
    
    try {
        const response = await apiRequest(url);
        const reports = response.reports || [];
        
        const container = document.getElementById('adminReportsList');
        if (!container) return;
        
        if (reports.length === 0) {
            container.innerHTML = '<p>No reports found</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Animal</th>
                        <th>Location</th>
                        <th>Risk</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Reporter</th>
                    </tr>
                </thead>
                <tbody>
                    ${reports.map(report => `
                        <tr onclick="showReportDetailsModal('${report._id}')" style="cursor: pointer;">
                            <td><strong>${report.animalType}</strong></td>
                            <td>${report.locationName}</td>
                            <td><span class="alert-badge ${report.riskLevel?.toLowerCase()}">${report.riskLevel}</span></td>
                            <td><span class="alert-badge ${report.status}">${report.status}</span></td>
                            <td>${safeFormatRelativeTime(report.timestamp)}</td>
                            <td>${report.createdBy?.name || 'Anonymous'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

/**
 * Export reports as CSV
 */
async function exportReports() {
    try {
        const response = await apiRequest('/reports');
        const reports = response.reports || [];
        
        const headers = ['Animal Type', 'Location', 'Risk Level', 'Status', 'Date', 'Reporter', 'Coordinates'];
        const rows = reports.map(r => [
            r.animalType,
            r.locationName,
            r.riskLevel,
            r.status,
            new Date(r.timestamp).toLocaleString(),
            r.createdBy?.name || 'Anonymous',
            `${r.coordinates.lat}, ${r.coordinates.lng}`
        ]);
        
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wildlife_reports_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast('Reports exported successfully', 'success');
        
    } catch (error) {
        showToast('Error exporting reports', 'error');
    }
}

/**
 * Load system logs
 */
async function loadSystemLogs() {
    logsPage = 1;
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="container">
            <div class="card">
                <h3><i class="fas fa-history"></i> System Logs</h3>
                <p style="color: var(--gray); margin-bottom: 1rem;">Security monitoring, audit trail, and access log</p>
                
                <div class="stats-grid" style="grid-template-columns: repeat(5, 1fr); margin-bottom: 1.5rem;">
                    <div class="stat-card" style="background: var(--primary);">
                        <h3>3,241</h3>
                        <p>Events Today</p>
                    </div>
                    <div class="stat-card" style="background: var(--danger);">
                        <h3>4</h3>
                        <p>Failed Logins</p>
                    </div>
                    <div class="stat-card" style="background: var(--info);">
                        <h3>12,840</h3>
                        <p>API Requests</p>
                    </div>
                    <div class="stat-card" style="background: var(--success);">
                        <h3>17</h3>
                        <p>Admin Actions</p>
                    </div>
                    <div class="stat-card" style="background: var(--warning);">
                        <h3>2</h3>
                        <p>Blocked Requests</p>
                    </div>
                </div>
                
                <div id="logsTable">
                    <div class="loading-container"><i class="fas fa-spinner fa-spin"></i> Loading logs...</div>
                </div>
            </div>
        </div>
    `;
    
    await loadLogsTable();
}

/**
 * Load logs table
 */
async function loadLogsTable() {
    const container = document.getElementById('logsTable');
    if (!container) return;
    
    // Sample logs data
    const sampleLogs = [
        { timestamp: '2024-06-15 14:23:10', user: 'Ramesh Kumar', role: 'Citizen', action: 'SUBMIT_REPORT', resource: 'Report #2847', ip: '182.64.12.45', status: 'SUCCESS' },
        { timestamp: '2024-06-15 14:21:05', user: 'R. Singh', role: 'Officer', action: 'VERIFY_REPORT', resource: 'Report #2846', ip: '10.1.0.45', status: 'SUCCESS' },
        { timestamp: '2024-06-15 14:18:32', user: 'Admin Patel', role: 'Admin', action: 'CREATE_ZONE', resource: 'Zone #Z-34', ip: '10.1.0.1', status: 'SUCCESS' },
        { timestamp: '2024-06-15 14:15:44', user: 'Unknown', role: 'Citizen', action: 'UPLOAD_PHOTO', resource: 'Report #2845', ip: '49.36.201.8', status: 'SUCCESS' },
        { timestamp: '2024-06-15 14:10:12', user: 'Priya Devi', role: 'Citizen', action: 'ISSUE_ALERT', resource: 'Alert #A-241', ip: '10.1.0.62', status: 'SUCCESS' },
        { timestamp: '2024-06-15 14:08:56', user: 'P. Rao', role: 'Officer', action: 'EXPORT_DATA', resource: 'Reports June CSV', ip: '10.1.0.1', status: 'SUCCESS' },
        { timestamp: '2024-06-15 14:04:23', user: 'Admin Patel', role: 'Admin', action: 'LOGIN_FAILED', resource: 'Auth endpoint', ip: '10.1.0.1', status: 'FAILED' },
    ];
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>IP Address</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${sampleLogs.map(log => `
                    <tr>
                        <td>${log.timestamp}</td>
                        <td>${log.user}</td>
                        <td>${log.role}</td>
                        <td>${log.action}</td>
                        <td>${log.resource}</td>
                        <td>${log.ip}</td>
                        <td><span class="alert-badge ${log.status === 'SUCCESS' ? 'low' : 'high'}">${log.status}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div style="margin-top: 1rem; text-align: center;">
            <button class="btn btn-outline btn-sm" onclick="changeLogsPage(-1)" disabled>← Prev</button>
            <span style="margin: 0 1rem;">Page 1 of 50</span>
            <button class="btn btn-outline btn-sm" onclick="changeLogsPage(1)">Next →</button>
        </div>
    `;
}

/**
 * Change logs page
 */
async function changeLogsPage(step) {
    logsPage += step;
    if (logsPage < 1) logsPage = 1;
    await loadLogsTable();
}

/**
 * Get date after days
 */
function getDateAfterDays(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

/**
 * Show report details modal (for admin)
 */
async function showReportDetailsModal(reportId) {
    try {
        const response = await apiRequest('/reports');
        const report = response.reports?.find(r => r._id === reportId);
        
        if (report) {
            showToast(`${report.animalType} report by ${report.createdBy?.name || 'Anonymous'}`, 'info');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Disable officer account
 */
async function disableOfficer(officerId) {
    if (!confirm('Are you sure you want to disable this officer account?')) return;
    try {
        await apiRequest(`/users/${officerId}/disable`, {
            method: 'PUT'
        });
        showToast('Officer account disabled successfully', 'success');
        await loadOfficersList();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================
// NOTE FOR BACKEND ADJUSTMENTS:
// ============================================
// To fully support admin features, consider adding:
//
// 1. POST /api/zones - With geometry support for circle, pin, path
// 2. DELETE /api/zones/:id - For deleting zones
// 3. PUT /api/users/:id/disable - For disabling officer accounts
// 4. GET /api/logs - For system logs with pagination
// 5. GET /api/reports/export - For CSV export
// 6. POST /api/alerts/broadcast - For mass alerts to specific zones