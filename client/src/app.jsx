import { useState, useEffect } from 'preact/hooks';
import axios from 'axios';

// Update API URL to match your backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
console.log('API_URL:', API_URL);
const ROTATION_INTERVAL = 60000; // 1 minute in milliseconds
const FULL_LIST_UPDATE_INTERVAL = 300000; // 5 minutes
const MAJORITY_THRESHOLD = 0.6; // 60% of stocks need to be down to trigger warning


export function App() {
  const [stocks, setStocks] = useState({});
  const [currentSymbol, setCurrentSymbol] = useState('AAPL');
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [marketWarning, setMarketWarning] = useState(false);

  // Calculate market warning status
  useEffect(() => {
    if (Object.keys(stocks).length === 0) return;

    const stockData = Object.values(stocks);
    const downStocks = stockData.filter(stock => {
      const change = Number(stock['Global Quote']?.['09. change']);
      return change < 0;
    });

    const downPercentage = downStocks.length / stockData.length;
    setMarketWarning(downPercentage >= MAJORITY_THRESHOLD);
  }, [stocks]);

  // Fetch all stocks data every 5 minutes
  useEffect(() => {
    const fetchAllStocks = async () => {
      try {
        console.log('Fetching all stocks...');
        const response = await axios.get(`${API_URL}/stocks`);
        console.log('Stocks response:', response.data);
        
        if (!response.data || !response.data.stocks) {
          throw new Error('Invalid response format from server');
        }
        
        setStocks(response.data.stocks);
        setLastUpdated(new Date(response.data.lastUpdated));
        setError(null);
      } catch (err) {
        console.error('Stock fetch error:', err);
        setError(err.response?.data?.message || err.message || 'Failed to fetch stock data');
      }
    };

    fetchAllStocks();
    const interval = setInterval(fetchAllStocks, FULL_LIST_UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Fetch selected stock data when symbol changes
  useEffect(() => {
    const fetchSelectedStock = async () => {
      try {
        console.log(`Fetching stock ${currentSymbol}...`);
        // Instead of fetching individual stock, we'll use the data from the full list
        const response = await axios.get(`${API_URL}/stocks`);
        console.log('Stocks response:', response.data);
        
        if (!response.data || !response.data.stocks) {
          throw new Error('Invalid response format from server');
        }
        
        setStocks(response.data.stocks);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        console.error('Selected stock fetch error:', err);
        setError(err.response?.data?.message || err.message || 'Failed to fetch stock data');
      }
    };

    fetchSelectedStock();
  }, [currentSymbol]);


  // Rotate through stocks
  useEffect(() => {
    if (!autoRotate || Object.keys(stocks).length === 0) return;

    const symbols = Object.keys(stocks);
    const rotate = () => {
      setCurrentSymbol(current => {
        const currentIndex = symbols.indexOf(current);
        const nextIndex = (currentIndex + 1) % symbols.length;
        return symbols[nextIndex];
      });
    };

    const interval = setInterval(rotate, ROTATION_INTERVAL);
    return () => clearInterval(interval);
  }, [stocks, autoRotate]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatChange = (change, changePercent) => {
    const sign = Number(change) >= 0 ? '+' : '';
    return `${sign}${change} (${changePercent})`;
  };

  const formatVolume = (volume) => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(volume);
  };

  const getCurrentStock = () => {
    return stocks[currentSymbol]?.['Global Quote'] || null;
  };

  const stockData = getCurrentStock();

  return (
    <div class="container">
      {marketWarning && (
        <div class="market-warning">
          ⚠️ Market Warning: Majority of stocks are down
        </div>
      )}
      <header>
        <div class="header-top">
          <h1>Stock Monitor</h1>
          <div class="auto-rotate">
            <label>
              <input
                type="checkbox"
                checked={autoRotate}
                onChange={(e) => setAutoRotate(e.target.checked)}
              />
              Auto
            </label>
          </div>
        </div>
        <div class="stock-selector">
          <select 
            value={currentSymbol}
            onChange={(e) => {
              setCurrentSymbol(e.target.value);
              setAutoRotate(false);
            }}
          >
            {Object.entries(stocks).map(([symbol, data]) => {
              const quote = data['Global Quote'];
              const name = quote?.['01. symbol'] || symbol;
              const fullName = quote?.company_name || name;
              return (
                <option value={symbol}>
                  {name} - {fullName}
                </option>
              );
            })}
          </select>
        </div>
      </header>

      <main>
        {error && <div class="error">{error}</div>}
        
        {stockData && (
          <div class="stock-info">
            <div class="stock-header">
              <div class="symbol">{currentSymbol}</div>
              <div class="company-name">
                {stockData.company_name || stockData['01. symbol']}
              </div>
            </div>

            <div class="price-container">
              <div class="current-price">
                {formatPrice(stockData['05. price'])}
              </div>
              <div class={`price-change ${Number(stockData['09. change']) >= 0 ? 'positive' : 'negative'}`}>
                {formatChange(stockData['09. change'], stockData['10. change percent'])}
              </div>
            </div>

            <div class="details">
              <div class="detail-row">
                <span class="label">Open</span>
                <span class="value">{formatPrice(stockData['02. open'])}</span>
              </div>
              <div class="detail-row">
                <span class="label">High</span>
                <span class="value">{formatPrice(stockData['03. high'])}</span>
              </div>
              <div class="detail-row">
                <span class="label">Low</span>
                <span class="value">{formatPrice(stockData['04. low'])}</span>
              </div>
              <div class="detail-row">
                <span class="label">Vol</span>
                <span class="value">{formatVolume(stockData['06. volume'])}</span>
              </div>
            </div>
          </div>
        )}

        {/* Temporarily hide crypto section until endpoints are ready */}
        {/* <div class="crypto-section">...</div> */}

        <div class="last-updated">
          Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
        </div>
      </main>
    </div>
  );
}