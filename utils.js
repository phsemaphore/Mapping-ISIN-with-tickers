import fs from 'fs';
import path from 'path';

/**
 * Utility functions for the Gurufocus scraper
 */

/**
 * Sleep function to add delays between requests
 * @param {number} ms - Milliseconds to sleep
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Save data to JSON file
 * @param {Object} data - Data to save
 * @param {string} filename - Filename without extension
 * @param {string} directory - Directory to save the file (default: './data')
 */
export function saveToJSON(data, filename, directory = './data') {
    // Create directory if it doesn't exist
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
    
    const filepath = path.join(directory, `${filename}.json`);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`📁 Data saved to: ${filepath}`);
}

/**
 * Save data to CSV file
 * @param {Array} data - Array of objects to save as CSV
 * @param {string} filename - Filename without extension
 * @param {string} directory - Directory to save the file (default: './data')
 */
export function saveToCSV(data, filename, directory = './data') {
    if (!Array.isArray(data) || data.length === 0) {
        console.warn('⚠️ No data to save to CSV');
        return;
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
    
    // Get headers from first object
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const value = row[header];
                // Escape commas and quotes in CSV
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    
    const filepath = path.join(directory, `${filename}.csv`);
    fs.writeFileSync(filepath, csvContent);
    console.log(`📁 Data saved to: ${filepath}`);
}

/**
 * Wait for an element to be visible and ready
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector to wait for
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 */
export async function waitForElement(page, selector, timeout = 10000) {
    try {
        await page.waitForSelector(selector, { visible: true, timeout });
        return true;
    } catch (error) {
        console.warn(`⚠️ Element not found: ${selector}`);
        return false;
    }
}

/**
 * Get current timestamp for filenames
 * @returns {string} Formatted timestamp
 */
export function getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
           now.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
}

/**
 * Clean text by removing extra whitespace and special characters
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
export function cleanText(text) {
    if (typeof text !== 'string') return text;
    return text.trim().replace(/\s+/g, ' ').replace(/[^\w\s.-]/g, '');
}

/**
 * Parse numeric values from text (handles percentages, currency, etc.)
 * @param {string} text - Text containing numeric value
 * @returns {number|null} Parsed number or null if not parseable
 */
export function parseNumeric(text) {
    if (typeof text !== 'string') return null;
    
    // Remove common non-numeric characters but keep decimal points and minus signs
    const cleaned = text.replace(/[$,%\s]/g, '').replace(/[()]/g, '');
    const number = parseFloat(cleaned);
    
    return isNaN(number) ? null : number;
}

/**
 * Create multiple incognito browser contexts for parallel scraping
 * @param {Browser} browser - Puppeteer browser instance
 * @param {number} count - Number of contexts to create
 * @returns {Promise<Array>} Array of incognito browser contexts
 */
export async function createIncognitoContexts(browser, count = 1) {
    const contexts = [];
    for (let i = 0; i < count; i++) {
        const context = await browser.createIncognitoBrowserContext();
        contexts.push(context);
        console.log(`🔒 Created incognito context ${i + 1}/${count}`);
    }
    return contexts;
}

/**
 * Close multiple browser contexts safely
 * @param {Array} contexts - Array of browser contexts to close
 */
export async function closeContexts(contexts) {
    for (const context of contexts) {
        try {
            await context.close();
        } catch (error) {
            console.warn('⚠️ Error closing context:', error.message);
        }
    }
    console.log(`🔒 Closed ${contexts.length} browser contexts`);
} 