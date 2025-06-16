import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

class GuruFocusISINMatcher {
    constructor(options = {}) {
        this.headless = options.headless !== true; // Default to headless
        this.delay = options.delay || 2000; // Default delay between requests
        this.results = [];
        this.browser = null;
        this.page = null;
    }

    /**
     * Read and parse the CSV file
     */
    readCSV(filePath) {
        try {
            const data = fs.readFileSync(filePath, 'utf-8');
            const lines = data.split('\n').filter(line => line.trim() !== '');
            const headers = lines[0].split(',');
            
            return lines.slice(1).map(line => {
                const values = line.split(',');
                return {
                    companyName: values[0]?.trim() || '',
                    isinCode: values[1]?.trim() || ''
                };
            }).filter(item => item.companyName && item.isinCode);
        } catch (error) {
            console.error('Error reading CSV file:', error);
            return [];
        }
    }

    /**
     * Initialize the browser
     */
    async initBrowser() {
        console.log('Initializing browser in private mode...');
        this.browser = await puppeteer.launch({
            headless: this.headless,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--incognito',  // Always run in private/incognito mode
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });
        
        // Create a new incognito context for extra privacy
        const context = await this.browser.createBrowserContext();
        this.page = await context.newPage();
        
        // Set a reasonable viewport and user agent
        await this.page.setViewport({ width: 1280, height: 720 });
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        console.log('Browser initialized in private mode ✓');
    }

    /**
     * Search for a company on GuruFocus
     */
    async searchCompany(companyName) {
        const searchUrl = `https://www.gurufocus.com/search?s=${encodeURIComponent(companyName)}`;
        console.log(`Searching for: ${companyName}`);
        console.log(`URL: ${searchUrl}`);

        try {
            await this.page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            await new Promise(resolve => setTimeout(resolve, this.delay));

            // Look for stock results in the "Stocks" section
            const stockLinks = await this.page.$$eval('a[href*="/stock/"]', links => 
                links.map(link => ({
                    url: link.href,
                    text: link.textContent?.trim() || ''
                }))
            );

            console.log(`Found ${stockLinks.length} stock links`);
            return stockLinks;
        } catch (error) {
            console.error(`Error searching for ${companyName}:`, error.message);
            return [];
        }
    }

    /**
     * Extract ISIN code from a GuruFocus stock page
     */
    async extractISINFromPage(url) {
        try {
            console.log(`Checking ISIN on: ${url}`);
            await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Look for ISIN in various possible locations
            let isin = null;

            // Method 1: Look for "ISIN" text followed by the code
            try {
                isin = await this.page.evaluate(() => {
                    const text = document.body.innerText;
                    const isinMatch = text.match(/ISIN\s*[:]\s*([A-Z]{2}[A-Z0-9]{10})/i);
                    return isinMatch ? isinMatch[1] : null;
                });
            } catch (e) {
                console.log('Method 1 failed, trying method 2');
            }

            // Method 2: Look for ISIN pattern in the page content
            if (!isin) {
                try {
                    isin = await this.page.evaluate(() => {
                        const text = document.body.innerText;
                        const isinMatch = text.match(/([A-Z]{2}[A-Z0-9]{10})/g);
                        return isinMatch ? isinMatch[0] : null;
                    });
                } catch (e) {
                    console.log('Method 2 failed, trying method 3');
                }
            }

            // Method 3: Look in specific sections that might contain ISIN
            if (!isin) {
                try {
                    isin = await this.page.evaluate(() => {
                        // Look for ISIN in tables, divs, or spans
                        const elements = document.querySelectorAll('td, div, span, p');
                        for (const element of elements) {
                            const text = element.innerText || element.textContent || '';
                            const isinMatch = text.match(/([A-Z]{2}[A-Z0-9]{10})/);
                            if (isinMatch) {
                                return isinMatch[1];
                            }
                        }
                        return null;
                    });
                } catch (e) {
                    console.log('Method 3 failed');
                }
            }

            console.log(`Found ISIN: ${isin || 'Not found'}`);
            return isin;
        } catch (error) {
            console.error(`Error extracting ISIN from ${url}:`, error.message);
            return null;
        }
    }

    /**
     * Process a single company
     */
    async processCompany(company) {
        console.log(`\n=== Processing: ${company.companyName} (ISIN: ${company.isinCode}) ===`);
        
        const result = {
            companyName: company.companyName,
            expectedISIN: company.isinCode,
            foundISIN: null,
            matchingURL: null,
            status: 'not_found'
        };

        try {
            // Search for the company
            const stockLinks = await this.searchCompany(company.companyName);
            
            if (stockLinks.length === 0) {
                console.log('No stock links found');
                result.status = 'no_results';
                return result;
            }

            // Check each link for matching ISIN
            for (const link of stockLinks) {
                console.log(`Checking link: ${link.url}`);
                const foundISIN = await this.extractISINFromPage(link.url);
                
                if (foundISIN) {
                    result.foundISIN = foundISIN;
                    
                    if (foundISIN === company.isinCode) {
                        console.log(`✅ MATCH FOUND! ISIN: ${foundISIN}`);
                        result.matchingURL = link.url;
                        result.status = 'matched';
                        return result;
                    } else {
                        console.log(`❌ ISIN mismatch. Expected: ${company.isinCode}, Found: ${foundISIN}`);
                    }
                }
                
                // Add a delay between checking different links
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            result.status = 'no_match';
            console.log('No matching ISIN found in any of the results');
            
        } catch (error) {
            console.error(`Error processing ${company.companyName}:`, error.message);
            result.status = 'error';
            result.error = error.message;
        }

        return result;
    }

    /**
     * Process multiple companies
     */
    async processCompanies(companies, maxCompanies = null) {
        const companiesToProcess = maxCompanies ? companies.slice(0, maxCompanies) : companies;
        console.log(`Processing ${companiesToProcess.length} companies...`);

        for (let i = 0; i < companiesToProcess.length; i++) {
            const company = companiesToProcess[i];
            console.log(`\n[${i + 1}/${companiesToProcess.length}] Processing: ${company.companyName}`);
            
            const result = await this.processCompany(company);
            this.results.push(result);

            // Add delay between companies to be respectful to the server
            if (i < companiesToProcess.length - 1) {
                console.log(`Waiting ${this.delay}ms before next company...`);
                await new Promise(resolve => setTimeout(resolve, this.delay));
            }
        }
    }

    /**
     * Save results to a file
     */
    saveResults(filename = 'gurufocus_results.json') {
        try {
            const output = {
                timestamp: new Date().toISOString(),
                totalProcessed: this.results.length,
                matched: this.results.filter(r => r.status === 'matched').length,
                notMatched: this.results.filter(r => r.status === 'no_match').length,
                noResults: this.results.filter(r => r.status === 'no_results').length,
                errors: this.results.filter(r => r.status === 'error').length,
                results: this.results
            };

            fs.writeFileSync(filename, JSON.stringify(output, null, 2));
            console.log(`\nResults saved to ${filename}`);
            
            // Also save a CSV file with the matches
            const csvResults = this.results
                .filter(r => r.status === 'matched')
                .map(r => `${r.companyName},${r.expectedISIN},${r.matchingURL}`)
                .join('\n');
            
            if (csvResults) {
                const csvHeader = 'Company Name,ISIN Code,GuruFocus URL\n';
                fs.writeFileSync('gurufocus_matches.csv', csvHeader + csvResults);
                console.log('Matches saved to gurufocus_matches.csv');
            }

        } catch (error) {
            console.error('Error saving results:', error);
        }
    }

    /**
     * Print summary of results
     */
    printSummary() {
        console.log('\n=== SUMMARY ===');
        console.log(`Total processed: ${this.results.length}`);
        console.log(`Matched: ${this.results.filter(r => r.status === 'matched').length}`);
        console.log(`No match: ${this.results.filter(r => r.status === 'no_match').length}`);
        console.log(`No results: ${this.results.filter(r => r.status === 'no_results').length}`);
        console.log(`Errors: ${this.results.filter(r => r.status === 'error').length}`);

        const matches = this.results.filter(r => r.status === 'matched');
        if (matches.length > 0) {
            console.log('\n=== MATCHES ===');
            matches.forEach(match => {
                console.log(`${match.companyName} -> ${match.matchingURL}`);
            });
        }
    }

    /**
     * Close the browser
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    /**
     * Main execution method
     */
    async run(maxCompanies) {
        try {
            // Always use db_initial.csv as the reference file
            const csvPath = 'db_initial.csv';
            const companies = this.readCSV(csvPath);
            console.log(`Loaded ${companies.length} companies from ${csvPath}`);

            if (companies.length === 0) {
                console.log('No companies found in CSV file');
                return;
            }

            if (maxCompanies && maxCompanies > companies.length) {
                console.log(`Warning: Requested ${maxCompanies} companies, but only ${companies.length} available`);
                maxCompanies = companies.length;
            }

            // Initialize browser
            await this.initBrowser();

            // Process companies
            await this.processCompanies(companies, maxCompanies);

            // Save results and print summary
            this.saveResults();
            this.printSummary();

        } catch (error) {
            console.error('Error in main execution:', error);
        } finally {
            await this.close();
        }
    }
}

// Export the class and create a simple CLI interface
export default GuruFocusISINMatcher;

// CLI interface
if (process.argv[1] && process.argv[1].endsWith('gurufocus_isin_matcher.js')) {
    const maxCompanies = process.argv[2] ? parseInt(process.argv[2]) : null;
    const headless = !process.argv.includes('--visible');

    if (!maxCompanies) {
        console.log('GuruFocus ISIN Matcher');
        console.log('======================');
        console.log('Usage: node gurufocus_isin_matcher.js <number_of_companies> [--visible]');
        console.log('');
        console.log('Examples:');
        console.log('  node gurufocus_isin_matcher.js 5');
        console.log('  node gurufocus_isin_matcher.js 10 --visible');
        console.log('  node gurufocus_isin_matcher.js 0  # Process all companies');
        console.log('');
        console.log('Options:');
        console.log('  --visible    Show browser window (default: headless)');
        process.exit(1);
    }

    console.log('GuruFocus ISIN Matcher');
    console.log('======================');
    console.log(`CSV file: db_initial.csv (fixed)`);
    console.log(`Companies to process: ${maxCompanies === 0 ? 'All' : maxCompanies}`);
    console.log(`Browser mode: ${headless ? 'Headless' : 'Visible'}`);
    console.log('');

    const matcher = new GuruFocusISINMatcher({ headless });
    matcher.run(maxCompanies === 0 ? null : maxCompanies);
} 