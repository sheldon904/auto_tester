class PageSpeedTester {
    constructor() {
        this.testResults = [];
        this.isRunning = false;
        this.currentTestIndex = 0;
        this.totalTests = 0;
        this.url = '';
        
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('startTestBtn').addEventListener('click', () => this.startTesting());
        document.getElementById('copyResultsBtn').addEventListener('click', () => this.copyResults());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
    }

    async startTesting() {
        const urlInput = document.getElementById('urlInput');
        const testCountInput = document.getElementById('testCount');
        
        this.url = urlInput.value.trim();
        this.totalTests = parseInt(testCountInput.value);

        if (!this.validateInputs()) {
            return;
        }

        this.isRunning = true;
        this.testResults = [];
        this.currentTestIndex = 0;

        this.showLoadingScreen();
        
        try {
            console.log('Starting test sequence...');
            await this.runAllTests();
            
            console.log('Tests completed, calculating averages...');
            this.calculateAverages();
            
            console.log('Showing results...');
            this.showResults();
            
        } catch (error) {
            console.error('Major error during testing:', error);
            this.showError('An error occurred during testing: ' + error.message + '. Check console for details.');
        } finally {
            this.isRunning = false;
        }
    }

    validateInputs() {
        const urlInput = document.getElementById('urlInput');
        const testCountInput = document.getElementById('testCount');
        
        if (!this.url) {
            alert('Please enter a valid URL');
            urlInput.focus();
            return false;
        }

        if (!this.url.match(/^https?:\/\/.+/)) {
            alert('URL must start with http:// or https://');
            urlInput.focus();
            return false;
        }

        if (this.totalTests < 1 || this.totalTests > 20) {
            alert('Number of tests must be between 1 and 20');
            testCountInput.focus();
            return false;
        }

        return true;
    }

    showLoadingScreen() {
        document.getElementById('formSection').classList.add('hidden');
        document.getElementById('resultsSection').classList.add('hidden');
        document.getElementById('resetBtn').classList.add('hidden');
        document.getElementById('loadingSection').classList.remove('hidden');
        
        this.updateProgress();
    }

    async runAllTests() {
        console.log(`Starting ${this.totalTests} tests for URL: ${this.url}`);
        
        for (let i = 0; i < this.totalTests; i++) {
            this.currentTestIndex = i;
            this.updateProgress(`Running test ${i + 1} of ${this.totalTests}...`);
            
            try {
                console.log(`--- Starting Test ${i + 1} ---`);
                const testResult = await this.runSingleTest(i + 1);
                console.log(`Test ${i + 1} completed successfully:`, testResult);
                
                this.testResults.push(testResult);
                this.updateProgress(`Completed test ${i + 1} of ${this.totalTests}`);
                this.updateIndividualResults();
                
                if (i < this.totalTests - 1) {
                    const waitTime = 35;
                    for (let countdown = waitTime; countdown > 0; countdown--) {
                        this.updateProgress(`Waiting ${countdown} seconds for cache to clear...`);
                        await this.sleep(1000);
                    }
                }
            } catch (error) {
                console.error(`Test ${i + 1} failed with error:`, error);
                
                const failedResult = {
                    testNumber: i + 1,
                    error: error.message,
                    desktop: null,
                    mobile: null,
                    timestamp: new Date().toISOString()
                };
                
                this.testResults.push(failedResult);
                console.log(`Added failed result:`, failedResult);
                
                this.updateProgress(`Test ${i + 1} failed: ${error.message}`);
                await this.sleep(2000);
            }
        }
        
        console.log(`All tests completed. Total results:`, this.testResults);
    }

    async runSingleTest(testNumber) {
        const testResult = {
            testNumber,
            timestamp: new Date().toISOString(),
            desktop: null,
            mobile: null
        };

        try {
            this.updateProgress(`Running desktop test ${testNumber}...`);
            const desktopResult = await this.callPageSpeedAPI('desktop');
            testResult.desktop = this.extractMetrics(desktopResult);
            
            await this.sleep(2000);
            
            this.updateProgress(`Running mobile test ${testNumber}...`);
            const mobileResult = await this.callPageSpeedAPI('mobile');
            testResult.mobile = this.extractMetrics(mobileResult);
            
        } catch (error) {
            console.error(`Error in test ${testNumber}:`, error);
            throw new Error(`Test ${testNumber} failed: ${error.message}`);
        }

        if (!testResult.desktop || !testResult.mobile) {
            throw new Error(`Test ${testNumber} returned incomplete data`);
        }

        return testResult;
    }

    async callPageSpeedAPI(strategy) {
        const cacheBuster = Date.now() + Math.random();
        const testUrl = this.url + (this.url.includes('?') ? '&' : '?') + `_cb=${cacheBuster}`;
        
        console.log(`Making API call for ${strategy} with URL: ${testUrl}`);
        
        // Use our serverless function endpoint
        const params = new URLSearchParams({
            url: testUrl,
            strategy: strategy
        });
        
        const apiEndpoint = `/api/pagespeed?${params}`;
        
        console.log(`Calling serverless endpoint: ${apiEndpoint}`);
        
        try {
            const response = await fetch(apiEndpoint, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
                console.error(`API Error:`, errorData);
                throw new Error(errorMessage);
            }

            const data = await response.json();
            
            if (!data.lighthouseResult || !data.lighthouseResult.audits) {
                console.error('Invalid API response:', data);
                throw new Error('Invalid response structure from PageSpeed API');
            }

            console.log(`${strategy} test completed successfully`);
            return data;
            
        } catch (error) {
            console.error(`PageSpeed API call failed for ${strategy}:`, error);
            throw error;
        }
    }

    extractMetrics(apiResponse) {
        if (!apiResponse || !apiResponse.lighthouseResult) {
            throw new Error('Invalid API response structure');
        }
        
        const lighthouse = apiResponse.lighthouseResult;
        const audits = lighthouse.audits;

        if (!audits) {
            throw new Error('No audits data in API response');
        }

        const metrics = {
            fcp: this.getMetricValue(audits['first-contentful-paint']),
            lcp: this.getMetricValue(audits['largest-contentful-paint']),
            cls: this.getMetricValue(audits['cumulative-layout-shift']),
            tbt: this.getMetricValue(audits['total-blocking-time']),
            speedIndex: this.getMetricValue(audits['speed-index']),
            performanceScore: lighthouse.categories?.performance?.score ? lighthouse.categories.performance.score * 100 : null
        };

        console.log('Extracted metrics:', metrics);
        return metrics;
    }

    getMetricValue(audit) {
        if (!audit || !audit.displayValue) {
            return null;
        }
        
        const value = audit.displayValue.replace(/[^\d.,]/g, '');
        return parseFloat(value.replace(',', '.')) || null;
    }

    updateProgress(message = '') {
        const progressText = document.getElementById('progressText');
        const progressFill = document.getElementById('progressFill');
        const progressCount = document.getElementById('progressCount');

        if (message) {
            progressText.textContent = message;
        }

        const completedTests = this.testResults.length;
        const progressPercentage = (completedTests / this.totalTests) * 100;
        
        progressFill.style.width = `${progressPercentage}%`;
        progressCount.textContent = `${completedTests} / ${this.totalTests} tests completed`;
    }

    updateIndividualResults() {
        const container = document.getElementById('individualResults');
        
        if (!document.getElementById('resultsSection').classList.contains('hidden')) {
            container.innerHTML = '';
            
            this.testResults.forEach(result => {
                if (!result.error) {
                    container.appendChild(this.createTestResultElement(result));
                }
            });
        }
    }

    createTestResultElement(result) {
        const element = document.createElement('div');
        element.className = 'test-result';
        
        const timestamp = new Date(result.timestamp).toLocaleTimeString();
        
        element.innerHTML = `
            <h4>Test ${result.testNumber} - ${timestamp}</h4>
            <div class="metrics-row">
                ${this.createDeviceMetrics('Desktop', result.desktop)}
                ${this.createDeviceMetrics('Mobile', result.mobile)}
            </div>
        `;
        
        return element;
    }

    createDeviceMetrics(deviceType, metrics) {
        if (!metrics) {
            return `<div class="metric"><div class="metric-label">${deviceType}</div><div class="metric-value">Error</div></div>`;
        }

        return `
            <div class="device-section">
                <h5>${deviceType}</h5>
                <div class="metric">
                    <div class="metric-label">FCP</div>
                    <div class="metric-value">${this.formatMetric(metrics.fcp, 's')}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">LCP</div>
                    <div class="metric-value">${this.formatMetric(metrics.lcp, 's')}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">CLS</div>
                    <div class="metric-value">${this.formatMetric(metrics.cls)}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">TBT</div>
                    <div class="metric-value">${this.formatMetric(metrics.tbt, 'ms')}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Speed Index</div>
                    <div class="metric-value">${this.formatMetric(metrics.speedIndex, 's')}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Score</div>
                    <div class="metric-value">${Math.round(metrics.performanceScore)}</div>
                </div>
            </div>
        `;
    }

    calculateAverages() {
        console.log('Calculating averages from results:', this.testResults);
        
        const validResults = this.testResults.filter(result => !result.error && result.desktop && result.mobile);
        console.log(`Found ${validResults.length} valid results out of ${this.testResults.length} total`);
        
        if (validResults.length === 0) {
            console.warn('No valid results found for averaging');
            this.averages = {
                desktop: null,
                mobile: null
            };
            return;
        }

        this.averages = {
            desktop: this.calculateDeviceAverages(validResults, 'desktop'),
            mobile: this.calculateDeviceAverages(validResults, 'mobile')
        };
        
        console.log('Calculated averages:', this.averages);
    }

    calculateDeviceAverages(results, device) {
        const metrics = ['fcp', 'lcp', 'cls', 'tbt', 'speedIndex', 'performanceScore'];
        const averages = {};

        metrics.forEach(metric => {
            const values = results
                .map(result => result[device]?.[metric])
                .filter(value => value !== null && value !== undefined);
            
            if (values.length > 0) {
                averages[metric] = values.reduce((sum, value) => sum + value, 0) / values.length;
            } else {
                averages[metric] = null;
            }
        });

        return averages;
    }

    showResults() {
        document.getElementById('loadingSection').classList.add('hidden');
        document.getElementById('resultsSection').classList.remove('hidden');
        document.getElementById('resetBtn').classList.remove('hidden');

        this.updateIndividualResults();
        this.displayAverages();
    }

    displayAverages() {
        const desktopContainer = document.getElementById('desktopAverages');
        const mobileContainer = document.getElementById('mobileAverages');

        desktopContainer.innerHTML = this.createAverageMetrics(this.averages.desktop);
        mobileContainer.innerHTML = this.createAverageMetrics(this.averages.mobile);
    }

    createAverageMetrics(averages) {
        if (!averages) {
            return '<div class="average-metric">No valid data</div>';
        }

        return `
            <div class="average-metric">
                <div class="metric-label">FCP</div>
                <div class="metric-value">${this.formatMetric(averages.fcp, 's')}</div>
            </div>
            <div class="average-metric">
                <div class="metric-label">LCP</div>
                <div class="metric-value">${this.formatMetric(averages.lcp, 's')}</div>
            </div>
            <div class="average-metric">
                <div class="metric-label">CLS</div>
                <div class="metric-value">${this.formatMetric(averages.cls)}</div>
            </div>
            <div class="average-metric">
                <div class="metric-label">TBT</div>
                <div class="metric-value">${this.formatMetric(averages.tbt, 'ms')}</div>
            </div>
            <div class="average-metric">
                <div class="metric-label">Speed Index</div>
                <div class="metric-value">${this.formatMetric(averages.speedIndex, 's')}</div>
            </div>
            <div class="average-metric highlight">
                <div class="metric-label">Performance Score</div>
                <div class="metric-value">${Math.round(averages.performanceScore)}</div>
            </div>
        `;
    }

    formatMetric(value, unit = '') {
        if (value === null || value === undefined) {
            return 'N/A';
        }
        
        if (unit === 's' && value < 10) {
            return `${value.toFixed(1)}${unit}`;
        } else if (unit === 'ms') {
            return `${Math.round(value)}${unit}`;
        } else if (unit === '') {
            return value.toFixed(3);
        } else {
            return `${Math.round(value)}${unit}`;
        }
    }

    copyResults() {
        const results = this.formatResultsForClipboard();
        
        navigator.clipboard.writeText(results).then(() => {
            const button = document.getElementById('copyResultsBtn');
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy results:', err);
            alert('Failed to copy results to clipboard');
        });
    }

    formatResultsForClipboard() {
        if (!this.averages || !this.averages.desktop || !this.averages.mobile) {
            return `PageSpeed Insights Batch Test Results\n` +
                   `URL: ${this.url}\n` +
                   `Tests: ${this.totalTests}\n` +
                   `Date: ${new Date().toLocaleDateString()}\n\n` +
                   `ERROR: No valid test results were obtained.\n` +
                   `Please check the console for detailed error information.`;
        }
        
        const url = this.url;
        const testCount = this.totalTests;
        const date = new Date().toLocaleDateString();
        
        let results = `PageSpeed Insights Batch Test Results\n`;
        results += `URL: ${url}\n`;
        results += `Tests: ${testCount}\n`;
        results += `Date: ${date}\n\n`;
        
        results += `AVERAGE RESULTS:\n`;
        results += `Desktop:\n`;
        results += `  FCP: ${this.formatMetric(this.averages.desktop.fcp, 's')}\n`;
        results += `  LCP: ${this.formatMetric(this.averages.desktop.lcp, 's')}\n`;
        results += `  CLS: ${this.formatMetric(this.averages.desktop.cls)}\n`;
        results += `  TBT: ${this.formatMetric(this.averages.desktop.tbt, 'ms')}\n`;
        results += `  Speed Index: ${this.formatMetric(this.averages.desktop.speedIndex, 's')}\n`;
        results += `  Performance Score: ${Math.round(this.averages.desktop.performanceScore)}\n\n`;
        
        results += `Mobile:\n`;
        results += `  FCP: ${this.formatMetric(this.averages.mobile.fcp, 's')}\n`;
        results += `  LCP: ${this.formatMetric(this.averages.mobile.lcp, 's')}\n`;
        results += `  CLS: ${this.formatMetric(this.averages.mobile.cls)}\n`;
        results += `  TBT: ${this.formatMetric(this.averages.mobile.tbt, 'ms')}\n`;
        results += `  Speed Index: ${this.formatMetric(this.averages.mobile.speedIndex, 's')}\n`;
        results += `  Performance Score: ${Math.round(this.averages.mobile.performanceScore)}\n`;
        
        return results;
    }

    showError(message) {
        const container = document.querySelector('.container');
        const existingError = container.querySelector('.error');
        
        if (existingError) {
            existingError.remove();
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        
        container.appendChild(errorDiv);
        
        document.getElementById('loadingSection').classList.add('hidden');
        document.getElementById('formSection').classList.remove('hidden');
    }

    reset() {
        this.testResults = [];
        this.isRunning = false;
        this.currentTestIndex = 0;
        this.totalTests = 0;
        this.url = '';
        
        document.getElementById('resultsSection').classList.add('hidden');
        document.getElementById('resetBtn').classList.add('hidden');
        document.getElementById('formSection').classList.remove('hidden');
        
        document.getElementById('urlInput').value = '';
        document.getElementById('testCount').value = '5';
        
        const existingError = document.querySelector('.error');
        if (existingError) {
            existingError.remove();
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PageSpeedTester();
});