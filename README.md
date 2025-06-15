# 📊 Gurufocus Scraper

A Node.js web scraper built with Puppeteer to extract financial data from Gurufocus.com with incognito mode support.

## 🚀 Features

- **Puppeteer Integration**: Automated browser control for dynamic content scraping
- **Incognito Mode**: Privacy-focused scraping with isolated browser contexts
- **Data Export**: Built-in JSON and CSV export functionality
- **Anti-Detection**: User agent spoofing and browser fingerprint management
- **ES Modules**: Modern JavaScript module system
- **Utility Functions**: Helper functions for data processing and file operations

## 📦 Installation

Make sure you have Node.js (v16+) and pnpm installed.

```bash
# Clone the repository
git clone <your-repo-url>
cd gurufocus-scraper

# Install dependencies
pnpm install
```

## 🔧 Usage

### Basic Usage

```bash
# Run the scraper
pnpm start

# Run in development mode (with auto-reload)
pnpm dev
```

### Configuration Options

```javascript
// Enable incognito mode
const scraper = new GuruFocusScraper({ incognito: true });

// Disable incognito mode
const scraper = new GuruFocusScraper({ incognito: false });
```

## 📁 Project Structure

```
gurufocus-scraper/
├── index.js          # Main scraper application
├── utils.js          # Utility functions
├── package.json      # Project dependencies and scripts
├── .gitignore        # Git ignore rules
└── README.md         # Project documentation
```

## 🛠️ Development

### Environment Variables

The project supports environment variables for configuration. See the configuration options:

- `HEADLESS`: Run browser in headless mode (true/false)
- `TIMEOUT`: Request timeout in milliseconds
- `DELAY_BETWEEN_REQUESTS`: Delay between requests in milliseconds

### Adding Custom Scraping Logic

Implement your specific scraping logic in the `scrapeData()` method of the `GuruFocusScraper` class:

```javascript
async scrapeData() {
    console.log('📊 Starting to scrape data...');
    
    // Your custom scraping logic here
    const data = await this.page.evaluate(() => {
        // Extract data from the page
        return { /* your data */ };
    });
    
    // Save data using utility functions
    saveToJSON(data, 'gurufocus-data');
    saveToCSV(data, 'gurufocus-data');
    
    console.log('✅ Data scraping completed');
}
```

## 📊 Data Export

The scraper includes built-in export functions:

- **JSON Export**: `saveToJSON(data, filename)`
- **CSV Export**: `saveToCSV(data, filename)`

All exported files are saved in the `./data/` directory by default.

## 🔒 Privacy & Security

- **Incognito Mode**: Ensures no cookies or session data persist between runs
- **User Agent Spoofing**: Mimics real browser behavior
- **No Data Persistence**: Clean slate for each scraping session

## 📄 Dependencies

- **puppeteer**: Browser automation
- **cheerio**: HTML parsing (optional)
- **axios**: HTTP client (optional)
- **dotenv**: Environment variable management

## ⚠️ Legal Notice

This tool is for educational and personal use only. Please respect the website's robots.txt file and terms of service. Always ensure you have permission to scrape data from any website.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

ISC License - see package.json for details.

---

**Note**: Remember to customize the scraping logic in `index.js` according to your specific needs for Gurufocus data extraction. 