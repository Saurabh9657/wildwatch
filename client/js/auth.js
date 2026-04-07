/**
 * Authentication Module
 * Handles login and simple registration
 */

/**
 * Load login page
 */
function loadLoginPage() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="container">
            <div class="form-container">
                <div class="text-center">
                    <i class="fas fa-paw" style="font-size: 3rem; color: var(--primary);"></i>
                    <h2 style="margin: 1rem 0 0.5rem;">Welcome Back</h2>
                    <p style="color: var(--gray); margin-bottom: 2rem;">Sign in to your WildWatch account</p>
                </div>
                
                <form id="loginForm">
                    <div class="form-group">
                        <label><i class="fas fa-envelope"></i> Email Address</label>
                        <input type="email" id="loginEmail" placeholder="you@example.com" required>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-lock"></i> Password</label>
                        <input type="password" id="loginPassword" placeholder="Enter your password" required>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-user-tag"></i> Login As</label>
                        <select id="loginRole">
                            <option value="user">Citizen</option>
                            <option value="officer">Forest Officer</option>
                            <option value="admin">Administrator</option>
                        </select>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" style="width: 100%;">
                        <i class="fas fa-sign-in-alt"></i> Sign In
                    </button>
                </form>
                
                <div class="text-center" style="margin-top: 1.5rem;">
                    <p>Don't have an account? 
                        <a href="#" onclick="loadPage('register'); return false;" style="color: var(--primary);">Register as Citizen</a>
                    </p>
                </div>
            </div>
        </div>
    `;
    
    // Handle login form submission
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const role = document.getElementById('loginRole').value;
        
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        submitBtn.disabled = true;
        
        try {
            const response = await apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            
            // Store auth
            authToken = response.token;
            currentUser = response.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            // Check role matches
            if (currentUser.role !== role) {
                showToast(`Warning: You logged in as ${role} but your account is ${currentUser.role}`, 'warning');
            }
            
            showToast(`Welcome back, ${currentUser.name}!`, 'success');
            
            // Update navigation and load appropriate dashboard
            renderNavigation();
            
            // Redirect based on role
            if (currentUser.role === 'admin') {
                loadPage('admin-dashboard');
            } else if (currentUser.role === 'officer') {
                loadPage('officer-dashboard');
            } else {
                loadPage('dashboard');
            }
            
        } catch (error) {
            showToast(error.message, 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

/**
 * Load simple registration page
 * Only requires: Name, Email, Password, Confirm Password
 */
function loadRegisterPage() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="container">
            <div class="form-container">
                <div class="text-center">
                    <i class="fas fa-paw" style="font-size: 3rem; color: var(--primary);"></i>
                    <h2 style="margin: 1rem 0 0.5rem;">Create Account</h2>
                    <p style="color: var(--gray); margin-bottom: 2rem;">Join WildWatch as a citizen reporter</p>
                </div>
                
                <form id="registerForm">
                    <div class="form-group">
                        <label><i class="fas fa-user"></i> Full Name *</label>
                        <input type="text" id="regName" placeholder="Enter your full name" required>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-envelope"></i> Email Address *</label>
                        <input type="email" id="regEmail" placeholder="you@example.com" required>
                        <small style="color: var(--gray);">We'll send a confirmation email</small>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-lock"></i> Password *</label>
                        <input type="password" id="regPassword" placeholder="Minimum 6 characters" required minlength="6">
                        <small style="color: var(--gray);">Use at least 6 characters</small>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-check-circle"></i> Confirm Password *</label>
                        <input type="password" id="regConfirmPassword" placeholder="Re-enter your password" required>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" style="width: 100%;">
                        <i class="fas fa-user-plus"></i> Create Account
                    </button>
                </form>
                
                <div class="text-center" style="margin-top: 1.5rem;">
                    <p>Already have an account? 
                        <a href="#" onclick="loadPage('login'); return false;" style="color: var(--primary);">Sign In</a>
                    </p>
                </div>
            </div>
        </div>
    `;
    
    // Handle registration form submission
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;
        
        // Validate
        if (!name || !email || !password) {
            showToast('Please fill all required fields', 'error');
            return;
        }
        
        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }
        
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
        submitBtn.disabled = true;
        
        try {
            // Register - backend automatically sets role to 'user'
            const response = await apiRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password
                })
            });
            
            // Store authentication
            authToken = response.token;
            currentUser = response.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            showToast('Account created successfully! Welcome to WildWatch!', 'success');
            
            // Update navigation
            renderNavigation();
            
            // Redirect to dashboard
            loadPage('dashboard');
            
        } catch (error) {
            showToast(error.message, 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}