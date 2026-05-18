/**
 * Officer Module
 * Handles officer dashboard, pending reports, verification modal, and animal tracking
 */

let officerMap = null;
let officerMarkers = [];
let officerPolylines = [];
let currentPendingReports = [];
let currentOpenReport = null; // Stores the report currently shown in the modal

/**
 * Load officer dashboard
 */
async function loadOfficerDashboard() {
    const mainContent = document.getElementById('mainContent');

    mainContent.innerHTML = `
        <div class="container">
            <div class="dashboard-split">
                <div class="card">
                    <h3><i class="fas fa-map-marked-alt"></i> Live Monitoring Map</h3>
                    <p style="color: var(--gray); margin-bottom: 1rem;">· Live · ${currentUser?.name || 'Officer'} on patrol</p>
                    <div id="officerMap" class="map-container" style="height: 500px;"></div>
                    <div class="map-filters" style="margin-top: 1rem;">
                        <button class="btn btn-outline btn-sm" onclick="toggleOfficerMapLayer('all')">
                            <i class="fas fa-globe"></i> All zones
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="toggleOfficerMapLayer('pending')">
                            <i class="fas fa-clock"></i> Pending only
                        </button>
                    </div>
                </div>
                
                <div class="card">
                    <h3><i class="fas fa-list"></i> Pending Verification</h3>
                    <div class="filter-bar" style="margin-bottom: 1rem;">
                        <select id="pendingFilter" onchange="filterPendingReports()">
                            <option value="all">All Pending</option>
                            <option value="high">High Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="low">Low Priority</option>
                        </select>
                        <button class="btn btn-primary btn-sm" onclick="refreshPendingReports()">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                    <div id="pendingReportsList" class="pending-list" style="max-height: 500px; overflow-y: auto;">
                        <div class="loading" style="margin: 2rem auto;"></div>
                    </div>
                </div>
            </div>
            
            <div class="card" style="margin-top: 1.5rem;">
                <h3><i class="fas fa-chart-line"></i> Animal Movement Tracking</h3>
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                    <input type="text" id="trackAnimal" placeholder="Enter animal type (e.g., Tiger, Elephant)" style="flex: 1; padding: 0.75rem;">
                    <button class="btn btn-primary" onclick="trackAnimalMovement()">
                        <i class="fas fa-search"></i> Track
                    </button>
                </div>
                <div id="trackingInfo" style="margin-top: 1rem;"></div>
            </div>
        </div>
    `;

    // Always destroy and recreate map to avoid "container already initialized" error
    if (officerMap) {
        officerMap.remove();
        officerMap = null;
        officerMarkers = [];
        officerPolylines = [];
    }
    officerMap = L.map('officerMap').setView([20.5937, 78.9629], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(officerMap);

    // Load pending reports
    await loadPendingReportsList();

    // Load map markers
    await loadOfficerMapMarkers();
}

/**
 * Load pending reports list
 */
async function loadPendingReportsList() {
    try {
        const response = await apiRequest('/reports/pending');
        currentPendingReports = response.reports || [];

        const container = document.getElementById('pendingReportsList');
        if (!container) return;

        if (currentPendingReports.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 2rem;">No pending reports</p>';
            return;
        }

        // Update filter count
        const filterSelect = document.getElementById('pendingFilter');
        if (filterSelect) {
            const allOption = filterSelect.querySelector('option[value="all"]');
            if (allOption) {
                allOption.textContent = `All Pending (${currentPendingReports.length})`;
            }
        }

        container.innerHTML = currentPendingReports.map(report => `
            <div class="pending-item priority-${getPriorityClass(report.riskLevel)}" 
                 onclick="showReportVerificationModal('${report._id}')">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <strong style="font-size: 1.1rem;">${report.animalType}</strong>
                        <span class="alert-badge ${report.riskLevel?.toLowerCase()}" style="margin-left: 0.5rem;">${report.riskLevel}</span>
                    </div>
                    <span style="font-size: 0.75rem; color: var(--gray);">${formatRelativeTime(report.timestamp)}</span>
                </div>
                <div style="margin-top: 0.5rem; color: var(--gray);">
                    <i class="fas fa-map-marker-alt"></i> ${report.locationName}
                </div>
                <div style="margin-top: 0.25rem; font-size: 0.85rem;">
                    <i class="fas fa-user"></i> ${report.createdBy?.name || 'Anonymous'}
                    ${report.imagePath ? ' · <i class="fas fa-camera"></i> Photo attached' : ''}
                </div>
                ${report.description ? `
                    <div style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--gray); border-left: 2px solid var(--gray-light); padding-left: 0.5rem;">
                        "${report.description.substring(0, 100)}${report.description.length > 100 ? '...' : ''}"
                    </div>
                ` : ''}
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading pending reports:', error);
        const container = document.getElementById('pendingReportsList');
        if (container) {
            container.innerHTML = '<p style="text-align: center; color: var(--danger);">Error loading reports</p>';
        }
    }
}

/**
 * Filter pending reports
 */
function filterPendingReports() {
    const filter = document.getElementById('pendingFilter')?.value;
    const container = document.getElementById('pendingReportsList');
    if (!container) return;

    let filtered = [...currentPendingReports];

    if (filter === 'high') {
        filtered = filtered.filter(r => r.riskLevel === 'High' || r.riskLevel === 'Critical');
    } else if (filter === 'medium') {
        filtered = filtered.filter(r => r.riskLevel === 'Medium');
    } else if (filter === 'low') {
        filtered = filtered.filter(r => r.riskLevel === 'Low');
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 2rem;">No reports match filter</p>';
        return;
    }

    container.innerHTML = filtered.map(report => `
        <div class="pending-item priority-${getPriorityClass(report.riskLevel)}" 
             onclick="showReportVerificationModal('${report._id}')">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <strong style="font-size: 1.1rem;">${report.animalType}</strong>
                    <span class="alert-badge ${report.riskLevel?.toLowerCase()}" style="margin-left: 0.5rem;">${report.riskLevel}</span>
                </div>
                <span style="font-size: 0.75rem; color: var(--gray);">${formatRelativeTime(report.timestamp)}</span>
            </div>
            <div style="margin-top: 0.5rem; color: var(--gray);">
                <i class="fas fa-map-marker-alt"></i> ${report.locationName}
            </div>
            <div style="margin-top: 0.25rem; font-size: 0.85rem;">
                <i class="fas fa-user"></i> ${report.createdBy?.name || 'Anonymous'}
                ${report.imagePath ? ' · <i class="fas fa-camera"></i> Photo attached' : ''}
            </div>
        </div>
    `).join('');
}

/**
 * Get priority class for styling
 */
function getPriorityClass(riskLevel) {
    switch (riskLevel?.toLowerCase()) {
        case 'critical':
        case 'high':
            return 'high';
        case 'medium':
            return 'medium';
        default:
            return 'low';
    }
}

/**
 * Refresh pending reports
 */
async function refreshPendingReports() {
    // Clear cache so we always get live data
    if (typeof clearCache === 'function') {
        clearCache('/reports/pending');
        clearCache('/reports?status=pending');
        clearCache('/reports?status=verified');
    }
    await loadPendingReportsList();
    await loadOfficerMapMarkers();
    showToast('Reports refreshed', 'success');
}

/**
 * Show report verification modal
 */
async function showReportVerificationModal(reportId) {
    try {
        // Fetch fresh report list (skip cache so pending state is accurate)
        const response = await apiRequest('/reports', {}, false);
        const report = response.reports?.find(r => r._id === reportId);

        if (!report) {
            showToast('Report not found', 'error');
            return;
        }

        // Store globally so verifyReportAction and createZoneFromReport can reuse it
        currentOpenReport = report;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'verificationModal';

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>Report Verification</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem;">
                        <span class="alert-badge ${report.riskLevel?.toLowerCase()}">${report.riskLevel}</span>
                        <span><i class="fas fa-clock"></i> ${formatRelativeTime(report.timestamp)}</span>
                    </div>

                    <h4>Animal: ${report.animalType}</h4>
                    <p><strong>Location:</strong> ${report.locationName}</p>
                    <p><strong>Coordinates:</strong> ${report.coordinates.lat}, ${report.coordinates.lng}</p>
                    <p><strong>Reported by:</strong> ${report.createdBy?.name || 'Anonymous'}</p>

                    <div style="background: var(--gray-light); padding: 1rem; border-radius: var(--radius-sm); margin: 1rem 0;">
                        <strong>Submitted Notes:</strong>
                        <p style="margin-top: 0.5rem;">${report.description || 'No additional notes'}</p>
                    </div>

                    ${report.imagePath ? `
                        <div style="margin: 1rem 0;">
                            <strong>Photo Evidence:</strong>
                            <img src="${report.imagePath}" style="max-width: 100%; border-radius: var(--radius-sm); margin-top: 0.5rem;" onerror="this.style.display='none'">
                        </div>
                    ` : '<p><em>No photo uploaded</em></p>'}

                    <div style="background: var(--gray-light); padding: 1rem; border-radius: var(--radius-sm); margin: 1rem 0;">
                        <strong>Reported Location on Map:</strong>
                        <div id="modalMap" style="height: 200px; margin-top: 0.5rem; border-radius: var(--radius-sm);"></div>
                    </div>

                    <div class="form-group">
                        <label><i class="fas fa-comment"></i> Officer Remarks (Optional)</label>
                        <textarea id="officerRemarks" rows="3" placeholder="Add any notes about this report..."></textarea>
                    </div>

                    <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1.5rem;">
                        <button class="btn btn-success" onclick="verifyReportAction('${report._id}', 'verified')">
                            <i class="fas fa-check-circle"></i> Verify &amp; Issue Public Alert
                        </button>
                        <button class="btn btn-outline" onclick="verifyReportAction('${report._id}', 'need-more')">
                            <i class="fas fa-question-circle"></i> Request More Info
                        </button>
                        <button class="btn btn-danger" onclick="verifyReportAction('${report._id}', 'rejected')">
                            <i class="fas fa-times-circle"></i> Reject
                        </button>
                        <button class="btn btn-primary" onclick="createZoneFromReport('${report._id}')">
                            <i class="fas fa-draw-polygon"></i> Create Zone from Report
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Initialize mini-map in modal
        setTimeout(() => {
            const modalMap = L.map('modalMap').setView([report.coordinates.lat, report.coordinates.lng], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(modalMap);
            L.marker([report.coordinates.lat, report.coordinates.lng]).addTo(modalMap)
                .bindPopup(`${report.animalType} sighting`).openPopup();
        }, 100);

    } catch (error) {
        console.error('Error loading report details:', error);
        showToast('Error loading report details', 'error');
    }
}

/**
 * Close modal
 */
function closeModal() {
    const modal = document.getElementById('verificationModal');
    if (modal) modal.remove();
}

/**
 * Verify report action
 */
async function verifyReportAction(reportId, action) {
    const remarks = document.getElementById('officerRemarks')?.value || '';
    // Reuse the report already loaded in the modal (no extra fetch needed)
    const report = currentOpenReport;

    if (action === 'need-more') {
        const moreInfo = prompt('What additional information is needed from the reporter?');
        if (!moreInfo) return;
        // Save the remark to the report so it's visible in the backend
        try {
            await apiRequest(`/reports/${reportId}/verify`, {
                method: 'PUT',
                body: JSON.stringify({
                    status: 'pending',
                    officerRemarks: `[More info requested]: ${moreInfo}`
                })
            });
            showToast('Remarks saved. Reporter will be notified.', 'info');
        } catch (e) {
            console.error('Error saving need-more remark:', e);
        }
        closeModal();
        await refreshPendingReports();
        return;
    }

    if (action === 'verified') {
        const publishAlert = confirm('Do you want to publish a public alert for this sighting?');

        if (publishAlert) {
            // Use animal type from the stored report — not a split of ObjectId
            const defaultMsg = report
                ? `${report.animalType} sighting reported near ${report.locationName}. Stay cautious.`
                : 'Wildlife sighting reported. Stay cautious in the area.';
            const alertMessage = prompt('Alert message:', defaultMsg);
            if (alertMessage && report) {
                try {
                    await apiRequest('/alerts', {
                        method: 'POST',
                        body: JSON.stringify({
                            message: alertMessage,
                            riskLevel: report.riskLevel,
                            coordinates: report.coordinates
                        })
                    });
                    showToast('Alert published successfully', 'success');
                } catch (error) {
                    console.error('Error publishing alert:', error);
                    showToast('Alert publish failed: ' + error.message, 'error');
                }
            }
        }
    }

    try {
        await apiRequest(`/reports/${reportId}/verify`, {
            method: 'PUT',
            body: JSON.stringify({
                status: action === 'verified' ? 'verified' : 'rejected',
                officerRemarks: remarks
            })
        });

        // Clear report-related caches
        if (typeof clearCache === 'function') {
            clearCache('/reports/pending');
            clearCache('/reports?status=pending');
            clearCache('/reports?status=verified');
        }

        showToast(`Report ${action === 'verified' ? 'verified' : 'rejected'} successfully`, 'success');
        closeModal();
        currentOpenReport = null;
        await refreshPendingReports();

    } catch (error) {
        showToast(error.message, 'error');
    }
}

/**
 * Create zone from report
 */
async function createZoneFromReport(reportId) {
    try {
        // Reuse the report already loaded in the modal (no extra fetch needed)
        const report = currentOpenReport;
        if (!report) {
            showToast('Report data not available. Please reopen the modal.', 'error');
            return;
        }

        if (currentUser?.role === 'officer') {
            const radiusStr = prompt('Enter zone radius in km (Max 5km for officers):', '2');
            if (radiusStr === null) return;
            
            let radius = parseFloat(radiusStr);
            if (isNaN(radius) || radius <= 0) {
                showToast('Invalid radius', 'error');
                return;
            }
            if (radius > 5) {
                showToast('Radius capped at 5km for officers', 'info');
                radius = 5;
            }

            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + 24);

            const zoneData = {
                name: `${report.animalType} Alert Zone - ${report.locationName}`,
                geometry: {
                    type: 'Circle',
                    center: {
                        lat: report.coordinates.lat,
                        lng: report.coordinates.lng
                    },
                    radius: radius
                },
                zoneType: 'Restricted',
                animalType: report.animalType,
                riskLevel: report.riskLevel,
                radius: radius,
                expiry: expiryDate.toISOString(),
                alertMessage: `Zone created by officer for ${report.animalType} sighting`,
                notifyOfficers: true
            };

            const submitBtn = document.querySelector('button[onclick^="createZoneFromReport"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
                submitBtn.disabled = true;
            }

            await apiRequest('/zones', {
                method: 'POST',
                body: JSON.stringify(zoneData)
            });

            showToast('Zone created successfully', 'success');
            closeModal();
            
            if (typeof clearCache === 'function') {
                clearCache('/zones');
            }
        } else if (currentUser?.role === 'admin') {
            // ... admin flow remains unchanged
        } else {
            showToast('You do not have permission to create zones', 'warning');
        }
    } catch (error) {
        console.error('Error creating zone:', error);
        showToast(error.message || 'Error creating zone', 'error');
    }
}
/**
 * Load officer map markers
 */
async function loadOfficerMapMarkers() {
    if (!officerMap) return;

    // Clear existing markers
    officerMarkers.forEach(marker => officerMap.removeLayer(marker));
    officerMarkers = [];

    try {
        const response = await apiRequest('/reports?status=pending');
        const pendingReports = response.reports || [];

        pendingReports.forEach(report => {
            const color = getRiskColor(report.riskLevel);
            const marker = L.circleMarker(
                [report.coordinates.lat, report.coordinates.lng],
                {
                    radius: 12,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.9,
                    className: 'pulse-marker'
                }
            ).addTo(officerMap);

            marker.bindPopup(`
                <strong>⚠️ PENDING: ${report.animalType}</strong><br>
                ${report.locationName}<br>
                Risk: ${report.riskLevel}<br>
                ${formatRelativeTime(report.timestamp)}<br>
                <button class="btn btn-primary btn-sm" onclick="showReportVerificationModal('${report._id}')">
                    Verify Now
                </button>
            `);

            officerMarkers.push(marker);
        });

        // Also add verified reports with different styling
        const verifiedResponse = await apiRequest('/reports?status=verified');
        const verifiedReports = verifiedResponse.reports || [];

        verifiedReports.forEach(report => {
            const color = getRiskColor(report.riskLevel);
            const marker = L.circleMarker(
                [report.coordinates.lat, report.coordinates.lng],
                {
                    radius: 8,
                    fillColor: color,
                    color: '#fff',
                    weight: 1.5,
                    opacity: 0.8,
                    fillOpacity: 0.6
                }
            ).addTo(officerMap);

            marker.bindPopup(`
                <strong>✓ VERIFIED: ${report.animalType}</strong><br>
                ${report.locationName}<br>
                Risk: ${report.riskLevel}<br>
                ${formatRelativeTime(report.timestamp)}
            `);

            officerMarkers.push(marker);
        });

    } catch (error) {
        console.error('Error loading map markers:', error);
    }
}

/**
 * Toggle officer map layer
 */
async function toggleOfficerMapLayer(layer) {
    if (!officerMap) return;

    // Clear all markers
    officerMarkers.forEach(marker => officerMap.removeLayer(marker));
    officerMarkers = [];

    if (layer === 'all') {
        await loadOfficerMapMarkers();
    } else if (layer === 'pending') {
        try {
            const response = await apiRequest('/reports?status=pending');
            const pendingReports = response.reports || [];

            pendingReports.forEach(report => {
                const color = getRiskColor(report.riskLevel);
                const marker = L.circleMarker(
                    [report.coordinates.lat, report.coordinates.lng],
                    {
                        radius: 12,
                        fillColor: color,
                        color: '#fff',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.9
                    }
                ).addTo(officerMap);

                marker.bindPopup(`
                    <strong>⚠️ PENDING: ${report.animalType}</strong><br>
                    ${report.locationName}<br>
                    Risk: ${report.riskLevel}
                `);

                officerMarkers.push(marker);
            });
        } catch (error) {
            console.error('Error loading pending markers:', error);
        }
    }
}

/**
 * Track animal movement
 */
async function trackAnimalMovement() {
    const animalType = document.getElementById('trackAnimal')?.value.trim();
    if (!animalType) {
        showToast('Please enter an animal type', 'warning');
        return;
    }

    const trackingInfo = document.getElementById('trackingInfo');
    trackingInfo.innerHTML = '<div class="loading" style="margin: 1rem auto;"></div>';

    try {
        const response = await apiRequest(`/reports/tracking/${encodeURIComponent(animalType)}`);
        const reports = response.reports || [];

        if (reports.length === 0) {
            trackingInfo.innerHTML = '<p style="color: var(--gray);">No verified reports found for this animal type.</p>';
            return;
        }

        // Clear existing polylines
        officerPolylines.forEach(line => officerMap.removeLayer(line));
        officerPolylines = [];

        // Sort by timestamp
        const sortedReports = [...reports].sort((a, b) =>
            new Date(a.timestamp) - new Date(b.timestamp)
        );

        // Create polyline
        const latlngs = sortedReports.map(r => [r.coordinates.lat, r.coordinates.lng]);
        const polyline = L.polyline(latlngs, {
            color: '#ff9f1c',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 10'
        }).addTo(officerMap);

        officerPolylines.push(polyline);

        // Add markers with sequence numbers
        sortedReports.forEach((report, index) => {
            const marker = L.marker([report.coordinates.lat, report.coordinates.lng]).addTo(officerMap);
            marker.bindPopup(`
                <strong>Point ${index + 1}: ${report.animalType}</strong><br>
                ${report.locationName}<br>
                ${formatRelativeTime(report.timestamp)}<br>
                Risk: ${report.riskLevel}
            `);
            officerMarkers.push(marker);
        });

        // Fit bounds
        officerMap.fitBounds(latlngs, { padding: [50, 50] });

        // Show tracking info
        const firstReport = sortedReports[0];
        const lastReport = sortedReports[sortedReports.length - 1];

        trackingInfo.innerHTML = `
            <div style="background: var(--gray-light); padding: 1rem; border-radius: var(--radius-sm);">
                <h4><i class="fas fa-chart-line"></i> ${animalType} Movement Analysis</h4>
                <p><strong>Total sightings:</strong> ${reports.length}</p>
                <p><strong>Date range:</strong> ${new Date(firstReport.timestamp).toLocaleDateString()} - ${new Date(lastReport.timestamp).toLocaleDateString()}</p>
                <p><strong>Movement pattern:</strong> ${latlngs.length} points tracked</p>
                <button class="btn btn-primary btn-sm" onclick="clearTracking()">
                    <i class="fas fa-trash"></i> Clear Tracking
                </button>
            </div>
        `;

    } catch (error) {
        console.error('Error tracking animal:', error);
        trackingInfo.innerHTML = `<p style="color: var(--danger);">Error: ${error.message}</p>`;
    }
}

/**
 * Clear tracking lines
 */
function clearTracking() {
    officerPolylines.forEach(line => officerMap.removeLayer(line));
    officerPolylines = [];

    // Remove tracking markers but keep pending ones
    const trackingMarkers = officerMarkers.filter(m => {
        const popup = m.getPopup()?.getContent();
        return popup && popup.includes('Point');
    });
    trackingMarkers.forEach(m => officerMap.removeLayer(m));
    officerMarkers = officerMarkers.filter(m => !trackingMarkers.includes(m));

    document.getElementById('trackingInfo').innerHTML = '';
    showToast('Tracking cleared', 'success');
}

// ============================================
// NOTE FOR BACKEND ADJUSTMENTS:
// ============================================
// To fully support officer features, consider adding:
//
// 1. GET /api/reports/statistics/pending - For pending report statistics
// 2. POST /api/reports/:id/request-info - For requesting more info from reporter
// 3. GET /api/reports/tracking/all - For tracking multiple animals
// 4. POST /api/alerts/bulk - For publishing multiple alerts
// 5. GET /api/officer/patrol - For officer patrol route management
// 6. WebSocket connections for real-time report updates