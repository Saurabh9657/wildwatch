async function loadAlertsPage() {
    const mainContent = document.getElementById('mainContent');
    
    // Simple loading state
    mainContent.innerHTML = `
        <div class="container">
            <div class="card">
                <h2><i class="fas fa-bell"></i> Wildlife Alerts</h2>
                <div id="alertsList" class="alerts-container">
                    <div style="text-align: center; padding: 2rem;">
                        <i class="fas fa-spinner fa-spin fa-2x"></i>
                        <p>Loading alerts...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    try {
        // Fetch alerts
        const response = await fetch('/api/alerts', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('authToken')}`
            }
        });
        const data = await response.json();
        const alerts = data.alerts || [];
        
        const container = document.getElementById('alertsList');
        
        if (alerts.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fas fa-bell-slash" style="font-size: 3rem; color: #6c757d;"></i>
                    <h3>No Alerts</h3>
                    <p>No wildlife alerts at this time.</p>
                </div>
            `;
            return;
        }
        
        // Simple alert display
        container.innerHTML = alerts.map(alert => `
            <div style="background: white; border-radius: 12px; padding: 1rem; margin-bottom: 1rem; border-left: 4px solid ${getRiskColor(alert.riskLevel)}; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <span style="background: ${getRiskColor(alert.riskLevel)}; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: bold;">
                        ${alert.riskLevel || 'MEDIUM'} RISK
                    </span>
                    <span style="color: #6c757d; font-size: 0.75rem;">
                        ${new Date(alert.timestamp).toLocaleString()}
                    </span>
                </div>
                <div style="font-size: 1rem; margin-bottom: 0.5rem;">
                    ${alert.message || 'Wildlife Alert'}
                </div>
                <div style="margin-top: 0.75rem;">
                    <span style="font-size: 0.8rem; color: #666;">
                        📍 Coordinates: ${alert.coordinates?.lat?.toFixed(4) || 'Unknown'}, ${alert.coordinates?.lng?.toFixed(4) || 'Unknown'}
                    </span>
                    <button class="btn btn-outline btn-sm" onclick="showLocationOnMap(${alert.coordinates?.lat || 0}, ${alert.coordinates?.lng || 0})" style="margin-left: 0.5rem;">
                        <i class="fas fa-location-dot"></i> Show Location
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('alertsList').innerHTML = `
            <div style="text-align: center; padding: 2rem; color: red;">
                <i class="fas fa-exclamation-circle fa-2x"></i>
                <p>Error loading alerts: ${error.message}</p>
                <button class="btn btn-primary" onclick="loadAlertsPage()">Try Again</button>
            </div>
        `;
    }
}

// Map helper function
window.showLocationOnMap = function(lat, lng) {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        showToast('Invalid location coordinates', 'error');
        return;
    }
    
    // Switch to map tab
    loadPage('map');
    
    // After map loads, center on the location
    setTimeout(() => {
        if (window.liveMapInstance) {
            window.liveMapInstance.setView([lat, lng], 14);
            // Add a temporary marker
            const marker = L.marker([lat, lng]).addTo(window.liveMapInstance);
            marker.bindPopup('Alert Location').openPopup();
            // Remove marker after 5 seconds
            setTimeout(() => {
                if (window.liveMapInstance) {
                    window.liveMapInstance.removeLayer(marker);
                }
            }, 5000);
        }
    }, 500);
};
