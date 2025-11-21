(function() {
    'use strict';

    // ==================== CONFIGURATION & UTILITIES ====================
    const Config = {
        API_BASE_URL: 'https://api.ivac.com.vn',
        RETRY_COUNT: 3,
        RETRY_DELAY: 1000,
        REQUEST_TIMEOUT: 30000
    };

    // Utility functions
    const Utils = {
        generateRequestId() {
            return 'req_' + Math.random().toString(36).substr(2, 9);
        },

        sanitizeHeaders(headers) {
            const sensitive = ['authorization', 'cookie', 'token', 'password'];
            const sanitized = { ...headers };
            sensitive.forEach(key => {
                if (sanitized[key]) sanitized[key] = '***';
            });
            return sanitized;
        },

        async sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        isTokenExpired(token) {
            if (!token) return true;
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.exp * 1000 < Date.now();
            } catch {
                return true;
            }
        }
    };

    // ==================== DOM-BASED ANTI-DETECTION SYSTEM ====================
    // This module provides human-like DOM manipulation to bypass Cloudflare
    // Instead of direct fetch() calls, we simulate real user interactions
    
    const DOMAutomation = {
        // Human-like typing simulation
        async typeIntoField(element, text, options = {}) {
            const { 
                minDelay = 50, 
                maxDelay = 150,
                triggerEvents = true 
            } = options;
            
            // Focus the field first (human behavior)
            element.focus();
            await this.randomDelay(100, 200);
            
            // Clear existing value
            element.value = '';
            
            // Type character by character
            for (let char of text) {
                element.value += char;
                
                // Trigger input events after each character
                if (triggerEvents) {
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new KeyboardEvent('keydown', { 
                        key: char, 
                        bubbles: true 
                    }));
                }
                
                // Random delay between keystrokes
                await this.randomDelay(minDelay, maxDelay);
            }
            
            // Trigger final events
            if (triggerEvents) {
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.dispatchEvent(new Event('blur', { bubbles: true }));
            }
            
            // Blur and wait
            element.blur();
            await this.randomDelay(200, 400);
        },
        
        // Random delay (human-like timing)
        randomDelay(min, max) {
            const delay = Math.floor(Math.random() * (max - min + 1)) + min;
            return new Promise(resolve => setTimeout(resolve, delay));
        },
        
        // Simulate button click with human-like behavior
        async clickButton(element) {
            // Move mouse to button area (simulate hover)
            element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            await this.randomDelay(100, 300);
            
            // Mouse down
            element.dispatchEvent(new MouseEvent('mousedown', { 
                bubbles: true,
                cancelable: true,
                view: window
            }));
            await this.randomDelay(50, 100);
            
            // Mouse up (click happens)
            element.dispatchEvent(new MouseEvent('mouseup', { 
                bubbles: true,
                cancelable: true,
                view: window
            }));
            
            // Actual click event
            element.click();
            await this.randomDelay(200, 500);
        },
        
        // Find form element by various selectors (with error handling)
        findElement(selectors) {
            for (let selector of selectors) {
                try {
                    // Try as CSS selector first
                    const element = document.querySelector(selector);
                    if (element) return element;
                } catch (e) {
                    // Invalid CSS selector, skip silently
                    continue;
                }
            }
            return null;
        },
        
        // Find element by text content (since :contains() is not valid CSS)
        findElementByText(text, tagName = '*') {
            const elements = document.querySelectorAll(tagName);
            for (let element of elements) {
                if (element.textContent && element.textContent.trim().toLowerCase().includes(text.toLowerCase())) {
                    return element;
                }
            }
            return null;
        },
        
        // Wait for element to appear
        async waitForElement(selector, timeout = 10000) {
            const startTime = Date.now();
            
            while (Date.now() - startTime < timeout) {
                const element = document.querySelector(selector);
                if (element) return element;
                await this.randomDelay(100, 200);
            }
            
            throw new Error(`Element not found: ${selector}`);
        },
        
        // Submit form natively (lets site's JS handle Cloudflare)
        async submitFormNatively(formElement) {
            // Trigger submit event
            formElement.dispatchEvent(new Event('submit', { 
                bubbles: true, 
                cancelable: true 
            }));
            
            // Some sites don't listen to submit event, try form.submit()
            // But first check if there's a submit button
            const submitBtn = formElement.querySelector('button[type="submit"], input[type="submit"]');
            if (submitBtn) {
                await this.clickButton(submitBtn);
            } else {
                formElement.submit();
            }
        }
    };
    
    // ==================== IVAC FORM AUTOMATION ====================
    // These functions find and interact with actual IVAC forms
    
    const IVACFormAutomation = {
        // Login with phone + password (DOM-based)
        async loginWithPassword(mobileNo, password, onProgress) {
            DOMTelemetry.log('attempt', 'Starting DOM-based login');
            
            try {
                onProgress?.('Finding IVAC login form...');
                
                // Find mobile number field
                const mobileField = DOMAutomation.findElement([
                    'input[name="mobile_no"]',
                    'input[name="mobile"]',
                    'input[name="phone"]',
                    'input[type="tel"]',
                    'input[placeholder*="mobile" i]',
                    'input[placeholder*="phone" i]'
                ]);
                
                if (!mobileField) {
                    DOMTelemetry.failure('Mobile field not found', new Error('No matching selectors'));
                    throw new Error('Mobile number field not found on page');
                }
                
                DOMTelemetry.success('Mobile field found');
                
                onProgress?.('Typing mobile number...');
                await DOMAutomation.typeIntoField(mobileField, mobileNo);
                
                // Find password field
                const passwordField = DOMAutomation.findElement([
                    'input[name="password"]',
                    'input[type="password"]',
                    'input[placeholder*="password" i]'
                ]);
                
                if (!passwordField) {
                    throw new Error('Password field not found on page');
                }
                
                onProgress?.('Typing password...');
                await DOMAutomation.typeIntoField(passwordField, password);
                
                // Find login button
                let loginBtn = DOMAutomation.findElement([
                    'button[type="submit"]',
                    'input[type="submit"]',
                    '.login-button',
                    '#login-button'
                ]);
                
                // If not found, try finding by text content
                if (!loginBtn) {
                    loginBtn = DOMAutomation.findElementByText('login', 'button') || 
                               DOMAutomation.findElementByText('sign in', 'button');
                }
                
                if (!loginBtn) {
                    throw new Error('Login button not found on page');
                }
                
                onProgress?.('Clicking login button...');
                await DOMAutomation.clickButton(loginBtn);
                
                onProgress?.('Login submitted - waiting for response...');
                
                // Wait for token to appear in localStorage (site's JS will set it)
                await this.waitForToken(onProgress);
                
                DOMTelemetry.success('DOM-based login completed successfully');
                return { success: true, message: 'Login successful' };
                
            } catch (error) {
                DOMTelemetry.failure('DOM-based login failed', error);
                return { success: false, error: error.message };
            }
        },
        
        // Wait for access token to appear (after site processes login)
        async waitForToken(onProgress, timeout = 15000) {
            const startTime = Date.now();
            
            while (Date.now() - startTime < timeout) {
                const token = localStorage.getItem('access_token');
                if (token) {
                    onProgress?.('Access token received!');
                    return token;
                }
                await DOMAutomation.randomDelay(500, 1000);
            }
            
            throw new Error('Login timeout - no access token received');
        },
        
        // Login with OTP (DOM-based)
        async loginWithOTP(mobileNo, password, otp, onProgress) {
            try {
                onProgress?.('Finding OTP form...');
                
                // Find OTP field
                const otpField = DOMAutomation.findElement([
                    'input[name="otp"]',
                    'input[name="code"]',
                    'input[placeholder*="otp" i]',
                    'input[placeholder*="code" i]'
                ]);
                
                if (!otpField) {
                    throw new Error('OTP field not found on page');
                }
                
                onProgress?.('Typing OTP...');
                await DOMAutomation.typeIntoField(otpField, otp);
                
                // Mobile and password might still be needed
                const mobileField = DOMAutomation.findElement(['input[name="mobile_no"]', 'input[type="tel"]']);
                if (mobileField && !mobileField.value) {
                    await DOMAutomation.typeIntoField(mobileField, mobileNo);
                }
                
                const passwordField = DOMAutomation.findElement(['input[name="password"]']);
                if (passwordField && !passwordField.value) {
                    await DOMAutomation.typeIntoField(passwordField, password);
                }
                
                // Find submit button
                let submitBtn = DOMAutomation.findElement([
                    'button[type="submit"]',
                    '.otp-submit',
                    '#otp-submit'
                ]);
                
                // If not found, try finding by text content
                if (!submitBtn) {
                    submitBtn = DOMAutomation.findElementByText('submit', 'button') || 
                                DOMAutomation.findElementByText('verify', 'button');
                }
                
                if (!submitBtn) {
                    throw new Error('OTP submit button not found');
                }
                
                onProgress?.('Submitting OTP...');
                await DOMAutomation.clickButton(submitBtn);
                
                // Wait for token
                await this.waitForToken(onProgress);
                
                return { success: true, message: 'OTP login successful' };
                
            } catch (error) {
                return { success: false, error: error.message };
            }
        },
        
        // Send OTP (DOM-based)
        async sendOTP(mobileNo, onProgress) {
            try {
                onProgress?.('Finding OTP request form...');
                
                // Find mobile field
                const mobileField = DOMAutomation.findElement([
                    'input[name="mobile_no"]',
                    'input[type="tel"]'
                ]);
                
                if (!mobileField) {
                    throw new Error('Mobile field not found');
                }
                
                await DOMAutomation.typeIntoField(mobileField, mobileNo);
                
                // Find send OTP button
                let sendBtn = DOMAutomation.findElement([
                    'button[type="submit"]',
                    '.send-otp',
                    '#send-otp',
                    '.btn-send'
                ]);
                
                // If not found, try finding by text content
                if (!sendBtn) {
                    sendBtn = DOMAutomation.findElementByText('send', 'button') || 
                              DOMAutomation.findElementByText('otp', 'button');
                }
                
                if (!sendBtn) {
                    throw new Error('Send OTP button not found');
                }
                
                onProgress?.('Requesting OTP...');
                await DOMAutomation.clickButton(sendBtn);
                
                return { success: true, message: 'OTP request sent' };
                
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
    };

    // ==================== API CLIENT ====================
    const APIClient = {
        async request(endpoint, options = {}) {
            const requestId = Utils.generateRequestId();
            const url = endpoint.startsWith('http') ? endpoint : `${Config.API_BASE_URL}${endpoint}`;
            
            const config = {
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-ID': requestId,
                    ...options.headers
                },
                timeout: Config.REQUEST_TIMEOUT
            };
            
            if (options.body) {
                config.body = JSON.stringify(options.body);
            }
            
            let lastError;
            
            for (let attempt = 1; attempt <= Config.RETRY_COUNT; attempt++) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), Config.REQUEST_TIMEOUT);
                    config.signal = controller.signal;
                    
                    const response = await fetch(url, config);
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    const data = await response.json();
                    return data;
                    
                } catch (error) {
                    lastError = error;
                    
                    if (attempt < Config.RETRY_COUNT) {
                        await Utils.sleep(Config.RETRY_DELAY * attempt);
                    }
                }
            }
            
            throw lastError;
        },
        
        async get(endpoint, headers = {}) {
            return this.request(endpoint, { method: 'GET', headers });
        },
        
        async post(endpoint, body, headers = {}) {
            return this.request(endpoint, { method: 'POST', body, headers });
        },
        
        async put(endpoint, body, headers = {}) {
            return this.request(endpoint, { method: 'PUT', body, headers });
        },
        
        async delete(endpoint, headers = {}) {
            return this.request(endpoint, { method: 'DELETE', headers });
        }
    };

    // ==================== AUTHENTICATION MANAGER ====================
    const AuthManager = {
        async loginWithPassword(mobileNo, password) {
            try {
                const result = await APIClient.post('/auth/login', {
                    mobile_no: mobileNo,
                    password: password
                });
                
                if (result.access_token) {
                    this.setToken(result.access_token);
                    return { success: true, data: result };
                }
                
                return { success: false, error: 'No access token received' };
                
            } catch (error) {
                return { success: false, error: error.message };
            }
        },
        
        async loginWithOTP(mobileNo, password, otp) {
            try {
                const result = await APIClient.post('/auth/otp-login', {
                    mobile_no: mobileNo,
                    password: password,
                    otp: otp
                });
                
                if (result.access_token) {
                    this.setToken(result.access_token);
                    return { success: true, data: result };
                }
                
                return { success: false, error: 'No access token received' };
                
            } catch (error) {
                return { success: false, error: error.message };
            }
        },
        
        async sendOTP(mobileNo) {
            try {
                const result = await APIClient.post('/auth/send-otp', {
                    mobile_no: mobileNo
                });
                
                return { success: true, data: result };
                
            } catch (error) {
                return { success: false, error: error.message };
            }
        },
        
        setToken(token) {
            localStorage.setItem('access_token', token);
        },
        
        getToken() {
            return localStorage.getItem('access_token');
        },
        
        clearToken() {
            localStorage.removeItem('access_token');
        },
        
        isAuthenticated() {
            const token = this.getToken();
            return !Utils.isTokenExpired(token);
        },
        
        getAuthHeaders() {
            const token = this.getToken();
            return token ? { 'Authorization': `Bearer ${token}` } : {};
        }
    };

    // ==================== TELEMETRY & LOGGING ====================
    const DOMTelemetry = {
        events: [],
        
        log(eventType, message, data = {}) {
            const event = {
                timestamp: new Date().toISOString(),
                type: eventType,
                message: message,
                data: data
            };
            
            this.events.push(event);
            
            // Keep only last 50 events
            if (this.events.length > 50) {
                this.events.shift();
            }
            
            // Silent logging (no console output for stealth)
            // But make available for debugging
            return event;
        },
        
        success(message, data) {
            return this.log('success', message, data);
        },
        
        failure(message, error) {
            return this.log('error', message, { 
                error: error?.message || String(error),
                stack: error?.stack 
            });
        },
        
        warning(message, data) {
            return this.log('warning', message, data);
        },
        
        getEvents() {
            return [...this.events];
        },
        
        clear() {
            this.events = [];
        }
    };

    // ==================== MAIN IVAC AUTOMATION CLASS ====================
    class IVACAutomation {
        constructor() {
            this.isAuthenticated = false;
            this.currentMethod = 'api'; // 'api' or 'dom'
        }
        
        // Unified login method that tries both API and DOM approaches
        async login(credentials, options = {}) {
            const { method = 'auto', onProgress } = options;
            const { mobileNo, password, otp } = credentials;
            
            // Determine which method to use
            let loginMethod = method;
            if (method === 'auto') {
                loginMethod = this.detectPreferredMethod();
            }
            
            onProgress?.(`Using ${loginMethod.toUpperCase()} login method...`);
            
            if (loginMethod === 'dom') {
                // Use DOM-based automation
                if (otp) {
                    return await IVACFormAutomation.loginWithOTP(mobileNo, password, otp, onProgress);
                } else {
                    return await IVACFormAutomation.loginWithPassword(mobileNo, password, onProgress);
                }
            } else {
                // Use API-based authentication
                if (otp) {
                    return await AuthManager.loginWithOTP(mobileNo, password, otp);
                } else {
                    return await AuthManager.loginWithPassword(mobileNo, password);
                }
            }
        }
        
        // Unified OTP sending
        async sendOTP(mobileNo, options = {}) {
            const { method = 'auto', onProgress } = options;
            
            if (method === 'dom' || (method === 'auto' && this.detectPreferredMethod() === 'dom')) {
                return await IVACFormAutomation.sendOTP(mobileNo, onProgress);
            } else {
                return await AuthManager.sendOTP(mobileNo);
            }
        }
        
        // Detect whether to use API or DOM method
        detectPreferredMethod() {
            // Check if we're on a page that has login forms
            const hasLoginForm = document.querySelector('input[type="password"], input[name="password"]');
            
            // If we have DOM access and forms are present, prefer DOM method for better anti-detection
            if (hasLoginForm && typeof document !== 'undefined') {
                return 'dom';
            }
            
            // Otherwise use API method
            return 'api';
        }
        
        // Make authenticated API requests
        async authenticatedRequest(endpoint, options = {}) {
            if (!AuthManager.isAuthenticated()) {
                throw new Error('Not authenticated');
            }
            
            const authHeaders = AuthManager.getAuthHeaders();
            const headers = { ...authHeaders, ...options.headers };
            
            return await APIClient.request(endpoint, {
                ...options,
                headers
            });
        }
        
        // Get telemetry data
        getTelemetry() {
            return DOMTelemetry.getEvents();
        }
        
        // Clear telemetry
        clearTelemetry() {
            DOMTelemetry.clear();
        }
        
        // Logout
        logout() {
            AuthManager.clearToken();
            this.isAuthenticated = false;
            DOMTelemetry.success('User logged out');
        }
    }

    // ==================== EXPORT & INITIALIZATION ====================
    // Export for use in main script
    window.IVACAutomation = IVACAutomation;
    window.DOMAutomation = DOMAutomation;
    window.IVACFormAutomation = IVACFormAutomation;
    window.AuthManager = AuthManager;
    window.APIClient = APIClient;
    window.DOMTelemetry = DOMTelemetry;
    
    // Auto-initialize
    window.ivacAutomation = new IVACAutomation();
    
})();