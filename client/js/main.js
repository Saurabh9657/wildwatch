/**
 * Main Application JavaScript
 * Handles navigation, authentication state, global functions
 */

// Global state
let currentUser = null;
let authToken = null;
let currentPage = 'home';
let liveMapInstance = null;

// API Base URL - Use relative URL (works with localhost, ngrok, and any domain)
const API_BASE = '/api';

/**
 * Save current page to localStorage
 * @param {string} page - Page identifier
 */
function saveCurrentPage(page) {
    localStorage.setItem('currentPage', page);
}

/**
 * Get saved page from localStorage
 * @returns {string} - Saved page identifier
 */
function getSavedPage() {
    return localStorage.getItem('currentPage') || 'home';
}

/**
 * Clear saved page
 */
function clearSavedPage() {
    localStorage.removeItem('currentPage');
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Check stored auth
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
        authToken = storedToken;
        currentUser = JSON.parse(storedUser);
    }
    
    // Render navigation
    renderNavigation();
    
    // Get saved page from localStorage
    const savedPage = getSavedPage();
    
    // Protected pages list
    const protectedPages = ['map', 'alerts', 'dashboard', 'report', 'my-reports', 
                            'officer-dashboard', 'admin-dashboard', 'logs'];
    
    // If not logged in and trying to access protected page, go to home
    if (protectedPages.includes(savedPage) && !authToken) {
        loadPage('home');
    } else {
        // Load saved page
        loadPage(savedPage);
    }

    setupMobileNavigation();
    
    // Test connection to server
    testServerConnection();
});

/**
 * Test server connection
 */
async function testServerConnection() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        console.log('✅ Server connected:', data);
    } catch (error) {
        console.error('❌ Server connection failed:', error);
        showToast('Cannot connect to server. Please check your connection.', 'error');
    }
}

/**
 * Setup mobile navigation toggle behavior
 */
function setupMobileNavigation() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');
    if (!mobileMenuBtn || !navLinks) return;

    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    document.addEventListener('click', (event) => {
        const clickInsideNav = event.target.closest('.nav-container');
        if (!clickInsideNav) {
            navLinks.classList.remove('active');
        }
    });
}

/**
 * Render navigation based on auth state and role
 */
function renderNavigation() {
    const navLinks = document.getElementById('navLinks');
    const navUser = document.getElementById('navUser');
    
    if (!navLinks) return;
    
    if (currentUser && authToken) {
        // Logged in - show role-specific navigation
        let links = [];
        
        // Common links for all logged-in users
        links.push({ id: 'home', label: 'Home', icon: 'fa-home' });
        links.push({ id: 'map', label: 'Live Map', icon: 'fa-map' });
        links.push({ id: 'alerts', label: 'Alerts', icon: 'fa-bell' });
        
        // Role-specific links
        if (currentUser.role === 'user') {
            links.push({ id: 'dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt' });
            links.push({ id: 'report', label: 'Report', icon: 'fa-camera' });
            links.push({ id: 'my-reports', label: 'My Reports', icon: 'fa-list' });
        } else if (currentUser.role === 'officer') {
            links.push({ id: 'officer-dashboard', label: 'Officer Dashboard', icon: 'fa-shield-alt' });
        } else if (currentUser.role === 'admin') {
            links.push({ id: 'admin-dashboard', label: 'Admin Dashboard', icon: 'fa-crown' });
            links.push({ id: 'logs', label: 'System Logs', icon: 'fa-history' });
        }
        
        // Build navigation HTML
        navLinks.innerHTML = links.map(link => `
            <a href="#" class="nav-link ${currentPage === link.id ? 'active' : ''}" 
               onclick="loadPage('${link.id}'); return false;">
                <i class="fas ${link.icon}"></i> ${link.label}
            </a>
        `).join('');
        
        // User info
        navUser.innerHTML = `
            <div class="user-avatar">${currentUser.name.charAt(0).toUpperCase()}</div>
            <span class="user-name">${currentUser.name}</span>
            <button class="logout-btn" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i>
            </button>
        `;
    } else {
        // Not logged in
        navLinks.innerHTML = `
            <a href="#" class="nav-link ${currentPage === 'home' ? 'active' : ''}" onclick="loadPage('home'); return false;">
                <i class="fas fa-home"></i> Home
            </a>
            <a href="#" class="nav-link" onclick="loadPage('login'); return false;">
                <i class="fas fa-sign-in-alt"></i> Login
            </a>
            <a href="#" class="nav-link" onclick="loadPage('register'); return false;">
                <i class="fas fa-user-plus"></i> Register
            </a>
        `;
        navUser.innerHTML = '';
    }
}

/**
 * Load different pages
 * @param {string} page - Page identifier
 */
async function loadPage(page) {
    currentPage = page;
    
    // Save current page to localStorage
    saveCurrentPage(page);

    // Close mobile menu after navigation
    const navLinks = document.getElementById('navLinks');
    if (navLinks) {
        navLinks.classList.remove('active');
    }
    
    const mainContent = document.getElementById('mainContent');
    
    if (!mainContent) return;
    
    // Update active nav link
    renderNavigation();
    
    // Check authentication for protected pages
    const protectedPages = ['map', 'alerts', 'dashboard', 'report', 'my-reports', 
                            'officer-dashboard', 'admin-dashboard', 'logs'];
    
    if (protectedPages.includes(page) && !authToken) {
        showToast('Please login to access this page', 'warning');
        loadPage('login');
        return;
    }
    
    // Load page content
    switch(page) {
        case 'home':
            await loadHomePage();
            break;
        case 'login':
            loadLoginPage();
            break;
        case 'register':
            loadRegisterPage();
            break;
        case 'map':
            await loadMapPage();
            break;
        case 'alerts':
            await loadAlertsPage();
            break;
        case 'dashboard':
            if (currentUser?.role === 'user') {
                await loadCitizenDashboard();
            } else {
                showToast('Unauthorized access', 'error');
                loadPage('home');
            }
            break;
        case 'report':
            if (currentUser?.role === 'user') {
                loadReportWizard();
            } else {
                showToast('Only citizens can submit reports', 'error');
                loadPage('home');
            }
            break;
        case 'my-reports':
            if (currentUser?.role === 'user') {
                await loadMyReports();
            } else {
                loadPage('home');
            }
            break;
        case 'officer-dashboard':
            if (currentUser?.role === 'officer') {
                await loadOfficerDashboard();
            } else {
                showToast('Unauthorized: Officer access only', 'error');
                loadPage('home');
            }
            break;
        case 'admin-dashboard':
            if (currentUser?.role === 'admin') {
                await loadAdminDashboard();
            } else {
                showToast('Unauthorized: Admin access only', 'error');
                loadPage('home');
            }
            break;
        case 'logs':
            if (currentUser?.role === 'admin') {
                await loadSystemLogs();
            } else {
                loadPage('home');
            }
            break;
        default:
            await loadHomePage();
    }
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - success, error, warning, info
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

/**
 * Make API request with authentication and optional GET caching
 * @param {string} endpoint - API endpoint (without /api)
 * @param {object} options - Fetch options
 * @param {boolean} useCache - Use cached response for GET (default true)
 * @returns {Promise} - Response data
 */
async function apiRequest(endpoint, options = {}, useCache = true) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    // Handle FormData
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
        useCache = false;
    }

    const method = (options.method || 'GET').toUpperCase();
    // Never cache mutations
    if (method !== 'GET') {
        useCache = false;
    }

    const cacheKey = `${method}:${endpoint}`;
    
    // Check cache for GET requests
    if (method === 'GET' && useCache && typeof CacheManager !== 'undefined' && CacheManager) {
        const cached = CacheManager.get(cacheKey);
        if (cached) {
            return cached;
        }
    }
    
    const url = `/api${endpoint}`;
    
    try {
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `Request failed: ${response.status}`);
        }
        
        // Cache GET responses
        if (method === 'GET' && typeof CacheManager !== 'undefined' && CacheManager) {
            CacheManager.set(cacheKey, data);
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw new Error(error.message || 'Network error. Please check your connection.');
    }
}

/**
 * Clear cache for specific endpoint or all
 */
function clearCache(endpoint) {
    if (typeof CacheManager !== 'undefined' && CacheManager) {
        if (endpoint) {
            CacheManager.clear(`GET:${endpoint}`);
        } else {
            CacheManager.clear();
        }
    }
}

/**
 * Get full image URL (works with both localhost and ngrok)
 */
function getImageUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return path; // Use relative path
}

/**
 * Logout user
 */
function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    clearCache(); // Drop cached API data so next user doesn't see stale lists
    clearSavedPage(); // Clear saved page on logout
    renderNavigation();
    loadPage('home');
    showToast('Logged out successfully', 'success');
}

/**
 * Get full image URL (works with both localhost and ngrok)
 * @param {string} path - Image path from backend
 * @returns {string} - Full URL
 */
function getImageUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return path; // Use relative path, works with any domain
}

/**
 * Safely format date
 * @param {string|Date} date - Date string or Date object
 * @returns {string} - Formatted date string
 */
function safeFormatDate(date) {
    if (!date) return 'Unknown date';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Invalid date';
        return d.toLocaleDateString();
    } catch (e) {
        return 'Invalid date';
    }
}

/**
 * Safely format date with time
 * @param {string|Date} date - Date string or Date object
 * @returns {string} - Formatted date time string
 */
function safeFormatDateTime(date) {
    if (!date) return 'Unknown date';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Invalid date';
        return d.toLocaleString();
    } catch (e) {
        return 'Invalid date';
    }
}

/**
 * Safely format relative time
 * @param {string|Date} date - Date string or Date object
 * @returns {string} - Relative time string
 */
function safeFormatRelativeTime(date) {
    if (!date) return 'Unknown';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Invalid date';
        
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hr ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return d.toLocaleDateString();
    } catch (e) {
        return 'Unknown date';
    }
}

/**
 * Format relative time (alias for safeFormatRelativeTime for backward compatibility)
 */
function formatRelativeTime(date) {
    return safeFormatRelativeTime(date);
}

/**
 * Get risk color
 * @param {string} risk - Risk level
 * @returns {string} - Color code
 */
function getRiskColor(risk) {
    switch(risk?.toLowerCase()) {
        case 'critical': return '#e63946';
        case 'high': return '#e63946';
        case 'medium': return '#ffb703';
        case 'low': return '#52b788';
        default: return '#6c757d';
    }
}

/**
 * Load home page with stats
 */
async function loadHomePage() {
    const mainContent = document.getElementById('mainContent');
    
    // Fetch stats
    let stats = { totalReports: 0, activeZones: 0, verifiedRate: 0 };
    
    try {
        const reportsRes = await apiRequest('/reports');
        const reports = reportsRes.reports || [];
        const verifiedReports = reports.filter(r => r.status === 'verified').length;
        stats.totalReports = reports.length;
        stats.verifiedRate = reports.length > 0 ? Math.round((verifiedReports / reports.length) * 100) : 0;
    } catch (e) {
        console.log('Stats not available yet');
    }
    
    try {
        const zonesRes = await apiRequest('/zones');
        stats.activeZones = (zonesRes.zones || []).length;
    } catch (e) {
        console.log('Zones not available yet');
    }
    
    mainContent.innerHTML = `
        <div class="container">
            <div class="hero">
                <h2>Wildlife Incident Monitoring & Reporting System</h2>
                <p>A real-time platform for citizens and forest officers to report, monitor, and respond to wildlife encounters — protecting both communities and wildlife.</p>
                <div class="hero-buttons">
                    ${!authToken ? `
                        <button class="btn btn-primary" onclick="loadPage('register')">
                            <i class="fas fa-user-plus"></i> Report a Sighting
                        </button>
                    ` : `
                        <button class="btn btn-primary" onclick="loadPage('report')">
                            <i class="fas fa-camera"></i> Report a Sighting
                        </button>
                    `}
                    <button class="btn btn-secondary" onclick="loadPage('map')">
                        <i class="fas fa-map"></i> View Live Map
                    </button>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>${stats.totalReports}</h3>
                    <p>REPORTS FILED</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.activeZones}</h3>
                    <p>ACTIVE ZONES</p>
                </div>
                <div class="stat-card">
                    <h3>12</h3>
                    <p>OFFICER UNITS</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.verifiedRate}%</h3>
                    <p>VERIFIED REPORTS</p>
                </div>
            </div>
            
            <div class="features-grid">
                <div class="feature-card">
                    <i class="fas fa-shield-alt"></i>
                    <h3>Community Safety</h3>
                    <p>Early warnings reduce dangerous encounters by up to 60%. Citizens receive instant alerts when wildlife is detected near their location.</p>
                </div>
                <div class="feature-card">
                    <i class="fas fa-tree"></i>
                    <h3>Wildlife Protection</h3>
                    <p>Movement data helps identify migration corridors, enabling authorities to protect habitats and reduce habitat encroachment proactively.</p>
                </div>
                <div class="feature-card">
                    <i class="fas fa-clock"></i>
                    <h3>Real-Time Response</h3>
                    <p>Reports reach on-duty forest officers instantly, cutting average response times from hours to under 20 minutes in active areas.</p>
                </div>
                <div class="feature-card">
                    <i class="fas fa-chart-line"></i>
                    <h3>Pattern Analysis</h3>
                    <p>Aggregated reports reveal seasonal movement patterns, enabling proactive zone mapping and resource deployment before incidents occur.</p>
                </div>
            </div>
            
            <div class="features-grid" style="margin-top: 0;">
                <div class="feature-card">
                    <i class="fas fa-camera"></i>
                    <h3>Report Sightings</h3>
                    <p>Submit a sighting in under 20 seconds. Just select the animal, drop a pin on the map, and tap send. Photos are optional but encouraged.</p>
                </div>
                <div class="feature-card">
                    <i class="fas fa-map-marked-alt"></i>
                    <h3>See Wildlife Zones</h3>
                    <p>Live risk zones on an interactive map, color-coded by danger level. Know what's near you at any moment, updated in real time.</p>
                </div>
                <div class="feature-card">
                    <i class="fas fa-bell"></i>
                    <h3>Receive Alerts</h3>
                    <p>Push notifications when wildlife is reported near you. Customize your alert radius from 1-50km in profile settings.</p>
                </div>
            </div>
            
            <div class="text-center" style="margin-top: 2rem; padding: 1rem; border-top: 1px solid rgba(255,255,255,0.2);">
                <p style="color: rgba(255,255,255,0.7);">WildWatch — Forest Department of India</p>
                <div style="display: flex; justify-content: center; gap: 1rem; margin-top: 0.5rem;">
                    <a href="#" style="color: rgba(255,255,255,0.7);">About</a>
                    <a href="#" style="color: rgba(255,255,255,0.7);">Contact</a>
                    <a href="#" style="color: rgba(255,255,255,0.7);">Guidelines</a>
                    <a href="#" style="color: rgba(255,255,255,0.7);">Privacy</a>
                    <a href="#" style="color: rgba(255,255,255,0.7);">API Docs</a>
                </div>
            </div>
        </div>
    `;
}

/**
 * Load shared live map page
 */
async function loadMapPage() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="container">
            <div class="card">
                <h3><i class="fas fa-map"></i> Live Map - Community Wildlife Activity</h3>
                <p style="color: var(--gray); margin-bottom: 1rem;">Showing all verified sightings and active zones from the community</p>
                <div class="map-filters" style="margin-bottom: 1rem;">
                    <select id="liveMapAnimalFilter">
                        <option value="">All Animals</option>
                    </select>
                    <select id="liveMapRiskFilter">
                        <option value="">All Risk Levels</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                    </select>
                    <button class="btn btn-primary btn-sm" onclick="refreshLiveMapData()">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
                <div id="liveMap" class="map-container"></div>
            </div>
        </div>
    `;

    // Initialize map
    if (liveMapInstance) {
        liveMapInstance.remove();
        liveMapInstance = null;
    }

    liveMapInstance = L.map('liveMap').setView([20.5937, 78.9629], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(liveMapInstance);
    
    // Load map data
    await refreshLiveMapData();
    
    // Add filter listeners
    const animalFilter = document.getElementById('liveMapAnimalFilter');
    const riskFilter = document.getElementById('liveMapRiskFilter');
    if (animalFilter) animalFilter.addEventListener('change', refreshLiveMapData);
    if (riskFilter) riskFilter.addEventListener('change', refreshLiveMapData);
}

/**
 * Refresh live map data with current filters
 */
async function refreshLiveMapData() {
    if (!liveMapInstance) return;
    
    // Clear all layers
    liveMapInstance.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.CircleMarker || 
            layer instanceof L.Polygon || layer instanceof L.Polyline || 
            layer instanceof L.Circle) {
            liveMapInstance.removeLayer(layer);
        }
    });
    
    const animalFilter = document.getElementById('liveMapAnimalFilter')?.value || '';
    const riskFilter = document.getElementById('liveMapRiskFilter')?.value || '';
    
    try {
        // Fetch reports
        let reportsUrl = '/reports?status=verified&limit=500';
        if (animalFilter) reportsUrl += `&animalType=${encodeURIComponent(animalFilter)}`;
        if (riskFilter) reportsUrl += `&riskLevel=${riskFilter}`;
        
        // Fetch ALL zones
        const authToken = localStorage.getItem('authToken') || localStorage.getItem('token');
        const zonesResponse = await fetch('/api/zones', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const zonesData = await zonesResponse.json();
        const zones = zonesData.zones || [];
        
        const reportsResponse = await apiRequest(reportsUrl, {}, true);
        const reports = reportsResponse.reports || [];
        
        console.log('Rendering:', reports.length, 'reports,', zones.length, 'zones');
        
        const points = [];
        const animalTypes = new Set();
        
        // Add report markers
        reports.forEach(report => {
            if (!report?.coordinates) return;
            const lat = Number(report.coordinates.lat);
            const lng = Number(report.coordinates.lng);
            if (isNaN(lat) || isNaN(lng)) return;
            
            points.push([lat, lng]);
            animalTypes.add(report.animalType);
            
            const marker = L.circleMarker([lat, lng], {
                radius: 8,
                fillColor: getRiskColor(report.riskLevel),
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.85
            }).addTo(liveMapInstance);
            
            marker.bindPopup(`
                <div style="min-width: 200px;">
                    <strong>🐾 ${report.animalType || 'Sighting'}</strong><br>
                    📍 ${report.locationName || 'Unknown'}<br>
                    ⚠️ ${report.riskLevel || 'Unknown'} risk<br>
                    🕐 ${safeFormatRelativeTime(report.timestamp)}<br>
                    👤 ${report.createdBy?.name || 'Community member'}
                </div>
            `);
        });
        
        // Add ALL zones - CRITICAL: Handle all zone types
        zones.forEach(zone => {
            console.log('Adding zone:', zone.name, 'Type:', zone.geometry?.type || zone.zoneType);
            
            const zoneColor = getRiskColor(zone.riskLevel || 'Medium');
            const createdBy = zone.createdByRole === 'officer' ? 'Forest Officer' : 
                             zone.createdByRole === 'admin' ? 'Administrator' : 'System';
            
            // CASE 1: Circle zone (officer created)
            if (zone.geometry?.type === 'Circle' && zone.geometry.center) {
                const center = zone.geometry.center;
                const radiusMeters = (zone.radius || 5) * 1000;
                points.push([center.lat, center.lng]);
                L.circle([center.lat, center.lng], {
                    radius: radiusMeters,
                    color: zoneColor,
                    fillColor: zoneColor,
                    fillOpacity: 0.25,
                    weight: 2,
                    opacity: 0.8
                }).addTo(liveMapInstance).bindPopup(`
                    <strong>🔴 ${zone.name}</strong><br>
                    Type: ${zone.zoneType || 'Safety Zone'}<br>
                    Risk: ${zone.riskLevel || 'Medium'}<br>
                    Created by: ${createdBy}<br>
                    Radius: ${zone.radius || 5} km<br>
                    ${zone.animalType ? `Animal: ${zone.animalType}` : ''}
                `);
            }
            // CASE 2: Polygon zone (admin created)
            else if (zone.geometry?.type === 'Polygon' && zone.geometry.coordinates?.[0]) {
                const coords = zone.geometry.coordinates[0]
                    .filter(c => Array.isArray(c) && c.length >= 2)
                    .map(c => [c[1], c[0]]);
                if (coords.length >= 3) {
                    points.push(...coords);
                    L.polygon(coords, {
                        color: zoneColor,
                        fillColor: zoneColor,
                        fillOpacity: 0.2,
                        weight: 2
                    }).addTo(liveMapInstance).bindPopup(`
                        <strong>🔴 ${zone.name}</strong><br>
                        Type: ${zone.zoneType || 'Protection Area'}<br>
                        Risk: ${zone.riskLevel || 'Medium'}<br>
                        Created by: ${createdBy}
                    `);
                }
            }
            // CASE 3: Legacy polygon format
            else if (zone.polygonCoordinates && zone.polygonCoordinates.length >= 3) {
                const coords = zone.polygonCoordinates.map(p => [p[0], p[1]]);
                points.push(...coords);
                L.polygon(coords, {
                    color: zoneColor,
                    fillColor: zoneColor,
                    fillOpacity: 0.2,
                    weight: 2
                }).addTo(liveMapInstance).bindPopup(zone.name || 'Zone');
            }
            // CASE 4: Point zone
            else if (zone.geometry?.type === 'Point' && zone.geometry.coordinates) {
                const lat = zone.geometry.coordinates[1];
                const lng = zone.geometry.coordinates[0];
                points.push([lat, lng]);
                L.marker([lat, lng]).addTo(liveMapInstance).bindPopup(`
                    <strong>📍 ${zone.name}</strong><br>
                    Point of interest<br>
                    Risk: ${zone.riskLevel || 'Medium'}
                `);
            }
        });
        
        // Update animal filter
        const animalSelect = document.getElementById('liveMapAnimalFilter');
        if (animalSelect && animalTypes.size > 0) {
            const currentValue = animalSelect.value;
            animalSelect.innerHTML = '<option value="">All Animals</option>';
            Array.from(animalTypes).sort().forEach(animal => {
                const option = document.createElement('option');
                option.value = animal;
                option.textContent = animal;
                if (currentValue === animal) option.selected = true;
                animalSelect.appendChild(option);
            });
        }
        
        // Fit bounds
        if (points.length > 0) {
            liveMapInstance.fitBounds(points, { padding: [30, 30] });
        }
        
        showToast(`📍 ${reports.length} sightings | 🗺️ ${zones.length} active zones`, 'info');
        
    } catch (error) {
        console.error('Error loading map data:', error);
        showToast('Error loading map data: ' + error.message, 'error');
    }
}