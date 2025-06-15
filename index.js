import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class GuruFocusScraper {
    constructor(options = {}) {
        this.browser = null;
        this.page = null;
        this.context = null;
        this.useIncognito = options.incognito || false;
    }

    /**
     * Initialize the browser and page
     */
    async init() {
        console.log('🚀 Initializing Puppeteer browser...');
        
        const browserArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ];

        // Add incognito flag if requested (Method 1)
        if (this.useIncognito) {
            browserArgs.push('--incognito');
            console.log('🕵️ Running in incognito mode');
        }
        
        this.browser = await puppeteer.launch({
            headless: false, // Set to true for production
            defaultViewport: null,
            args: browserArgs
        });

        // Method 2: Create incognito context (more flexible approach)
        if (this.useIncognito) {
            console.log('🔒 Creating incognito browser context...');
            this.context = await this.browser.createIncognitoBrowserContext();
            this.page = await this.context.newPage();
        } else {
            this.page = await this.browser.newPage();
        }
        
        // Set user agent to avoid bot detection
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        console.log('✅ Browser initialized successfully');
    }

    /**
     * Navigate to Gurufocus website
     */
    async navigateToGurufocus() {
        console.log('🌐 Navigating to Gurufocus...');
        
        try {
            await this.page.goto('https://www.gurufocus.com', {
                waitUntil: 'networkidle2',
                timeout: 30000
            });
            
            console.log('✅ Successfully navigated to Gurufocus');
        } catch (error) {
            console.error('❌ Error navigating to Gurufocus:', error.message);
            throw error;
        }
    }

    /**
     * Close the browser
     */
    async close() {
        if (this.context) {
            await this.context.close();
            console.log('🔒 Incognito context closed');
        }
        if (this.browser) {
            await this.browser.close();
            console.log('🔒 Browser closed');
        }
    }

    /**
     * Add your scraping logic here
     */
    async scrapeData() {
        console.log('📊 Starting to scrape data...');
        
        // TODO: Add your specific scraping logic here
        // This is where you'll implement the actual data extraction
        
        console.log('✅ Data scraping completed');
    }
}

// Main execution
async function main() {
    // Enable incognito mode by passing options
    const scraper = new GuruFocusScraper({ 
        incognito: true  // Set to false to disable incognito mode
    });
    
    try {
        await scraper.init();
        await scraper.navigateToGurufocus();
        await scraper.scrapeData();
    } catch (error) {
        console.error('❌ Error in main execution:', error);
    } finally {
        await scraper.close();
    }
}

// Run the scraper
main().catch(console.error); 