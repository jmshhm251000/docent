import json
import time

def scrape_nasdaq_stocks():
    """
    Scrape NASDAQ stock symbols and company names from stockanalysis.com
    Uses pagination to navigate through all pages
    """
    return scrape_with_playwright()

def scrape_with_playwright():
    """
    Use Playwright to scrape JavaScript-rendered content with pagination
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Playwright not installed. Installing...")
        import subprocess
        subprocess.check_call(['pip', 'install', 'playwright'])
        subprocess.check_call(['playwright', 'install', 'chromium'])
        from playwright.sync_api import sync_playwright
    
    url = "https://stockanalysis.com/list/nasdaq-stocks/"
    stocks = []
    page_num = 1
    
    print("Starting browser...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print(f"Navigating to {url}...")
        page.goto(url, wait_until='domcontentloaded', timeout=60000)
        
        # Wait for table to load
        print("Waiting for table to load...")
        page.wait_for_selector('table', timeout=30000)
        time.sleep(3)  # Give it a bit more time to fully render
        
        while True:
            print(f"\n--- Processing page {page_num} ---")
            
            # Extract stocks from current page
            print("Extracting stock data from current page...")
            rows = page.query_selector_all('table tbody tr')
            print(f"Found {len(rows)} rows on this page")
            
            page_stocks = 0
            for i, row in enumerate(rows, 1):
                try:
                    cells = row.query_selector_all('td')
                    if len(cells) >= 3:
                        # Structure: rank, symbol (link), company name, ...
                        symbol_cell = cells[1]  # Second cell contains symbol
                        name_cell = cells[2]    # Third cell contains company name
                        
                        # Get symbol from link or cell text
                        link = symbol_cell.query_selector('a')
                        if link:
                            symbol = link.inner_text().strip()
                        else:
                            symbol = symbol_cell.inner_text().strip()
                        
                        # Get company name
                        name = name_cell.inner_text().strip()
                        
                        if symbol and name and len(symbol) <= 10:  # Increased limit for longer symbols
                            stocks.append({
                                'symbol': symbol,
                                'name': name
                            })
                            page_stocks += 1
                except Exception as e:
                    print(f"Error processing row {i}: {e}")
                    continue
            
            print(f"Extracted {page_stocks} stocks from page {page_num}")
            print(f"Total stocks collected so far: {len(stocks)}")
            
            # Try to find and click the "Next" button
            try:
                # Use JavaScript to find and click the Next button (bypasses overlay issues)
                print("Looking for Next button...")
                clicked = page.evaluate('''
                    () => {
                        // Find all buttons
                        const buttons = Array.from(document.querySelectorAll('button'));
                        // Find the Next button
                        const nextBtn = buttons.find(btn => {
                            const text = btn.textContent.trim();
                            return text === 'Next' || text.includes('Next');
                        });
                        
                        if (nextBtn) {
                            // Check if disabled
                            if (nextBtn.disabled || nextBtn.hasAttribute('disabled')) {
                                return 'disabled';
                            }
                            // Click the button
                            nextBtn.click();
                            return 'clicked';
                        }
                        return 'not_found';
                    }
                ''')
                
                if clicked == 'disabled':
                    print("Next button is disabled. Reached the last page.")
                    break
                elif clicked == 'not_found':
                    print("Next button not found. Reached the last page.")
                    break
                elif clicked == 'clicked':
                    print("Clicked Next button via JavaScript...")
                    # Wait for the new page to load
                    time.sleep(2)  # Wait for navigation to start
                    page.wait_for_load_state('domcontentloaded', timeout=30000)
                    time.sleep(2)  # Give it time to render the new table
                    
                    # Verify the table has loaded
                    page.wait_for_selector('table', timeout=10000)
                    
                    page_num += 1
                else:
                    print("Unexpected result from Next button click.")
                    break
                    
            except Exception as e:
                print(f"Error navigating to next page: {e}")
                print("Assuming we've reached the last page.")
                break
        
        browser.close()
    
    print(f"\n=== Scraping complete ===")
    print(f"Total stocks found: {len(stocks)}")
    return stocks

if __name__ == "__main__":
    print("Starting NASDAQ stock scraper...")
    stocks = scrape_nasdaq_stocks()
    
    if stocks:
        print(f"\nSuccessfully scraped {len(stocks)} stocks!")
        
        # Save to JSON
        with open('nasdaq_stocks.json', 'w', encoding='utf-8') as f:
            json.dump(stocks, f, indent=2, ensure_ascii=False)
        print("Saved to nasdaq_stocks.json")
        
        # Save to TXT
        with open('nasdaq_stocks.txt', 'w', encoding='utf-8') as f:
            for stock in stocks:
                f.write(f"{stock['symbol']}\t{stock['name']}\n")
        print("Saved to nasdaq_stocks.txt")
        
        # Print first 10 as sample
        print("\nFirst 10 stocks:")
        for stock in stocks[:10]:
            print(f"{stock['symbol']}: {stock['name']}")
    else:
        print("No stocks found. Please check the script or website structure.")

