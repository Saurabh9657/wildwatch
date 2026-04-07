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
