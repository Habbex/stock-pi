import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const fastify = Fastify({
  logger: {
    level: 'debug',
    transport: {
      target: 'pino-pretty'
    }
  }
});

await fastify.register(cors, {
  origin: true
});

// Setup Finnhub configuration
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
if (!FINNHUB_API_KEY) {
  throw new Error('FINNHUB_API_KEY is required in .env file');
}

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
fastify.log.info(`Using Finnhub API key: ${FINNHUB_API_KEY.substring(0, 5)}...`);

// List of top global stocks
const TOP_STOCKS = [
  'AAPL',  // Apple
  'MSFT',  // Microsoft
  'GOOGL', // Alphabet (Google)
  'AMZN',  // Amazon
  'NVDA',  // NVIDIA
  'META',  // Meta Platforms
  'TSLA',  // Tesla
  'TSM',   // Taiwan Semiconductor
  'AVGO',  // Broadcom
  'ASML',  // ASML Holding
  'V',     // Visa
  'JPM',   // JPMorgan Chase
  'WMT',   // Walmart
  'MA',    // Mastercard
  'LVMUY', // LVMH Moët Hennessy
  'TCEHY', // Tencent
  'BABA',  // Alibaba
  'TM',    // Toyota Motor
  'SHEL',  // Shell
  'BHP'    // BHP Group
];

// Cache for stock data
const cache = new Map();
const CACHE_DURATION = 300000; // 5 minutes in milliseconds

// Helper function to fetch stock data
async function fetchStockData(symbol) {
  fastify.log.debug(`Fetching data for ${symbol}...`);
  
  try {
    const [quoteResponse, profileResponse] = await Promise.all([
      fetch(`${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`),
      fetch(`${FINNHUB_BASE_URL}/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`)
    ]);

    const [quote, profile] = await Promise.all([
      quoteResponse.json(),
      profileResponse.json()
    ]);

    fastify.log.debug(`Quote data for ${symbol}:`, quote);
    
    if (!quote || typeof quote.c === 'undefined') {
      fastify.log.error(`Invalid quote data for ${symbol}:`, quote);
      throw new Error('Invalid quote data received');
    }

    fastify.log.debug(`Profile data for ${symbol}:`, profile);
    return { quote, profile };
  } catch (error) {
    fastify.log.error(`Error fetching data for ${symbol}: ${error.message}`);
    throw error;
  }
}

// Function to format stock data
function formatStockData(symbol, data) {
  try {
    const { quote, profile } = data;
    
    if (!quote) {
      fastify.log.error(`Cannot format data for ${symbol}, missing quote data`);
      return null;
    }

    const formatted = {
      'Global Quote': {
        '01. symbol': symbol,
        '02. open': quote.o.toString(),
        '03. high': quote.h.toString(),
        '04. low': quote.l.toString(),
        '05. price': quote.c.toString(),
        '06. volume': quote.v ? quote.v.toString() : '0',
        '07. latest trading day': new Date(quote.t * 1000).toISOString().split('T')[0],
        '08. previous close': quote.pc.toString(),
        '09. change': quote.d.toString(),
        '10. change percent': quote.dp.toString() + '%',
        'company_name': profile && profile.name ? profile.name : symbol,
        'currency': profile && profile.currency ? profile.currency : 'USD'
      }
    };
    
    fastify.log.debug(`Formatted data for ${symbol}:`, formatted);
    return formatted;
  } catch (error) {
    fastify.log.error(`Error formatting data for ${symbol}: ${error.message}`);
    return null;
  }
}

// Function to update all stock data
async function updateAllStocks() {
  fastify.log.info('Starting stock data update...');
  
  for (const symbol of TOP_STOCKS) {
    try {
      fastify.log.info(`Updating ${symbol}...`);
      const data = await fetchStockData(symbol);
      const formattedData = formatStockData(symbol, data);
      
      if (formattedData) {
        cache.set(symbol, {
          data: formattedData,
          timestamp: Date.now()
        });
        fastify.log.info(`Successfully updated ${symbol}`);
      } else {
        fastify.log.error(`Failed to format data for ${symbol}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      fastify.log.error(`Failed to update ${symbol}: ${error.message}`);
    }
  }
  
  fastify.log.info('Stock data update completed');
  fastify.log.debug('Current cache:', Object.fromEntries(cache));
}

// Initial data load
updateAllStocks();

// Set up periodic updates every 5 minutes
setInterval(updateAllStocks, CACHE_DURATION);

// Routes
fastify.get('/', async (request, reply) => {
  return { status: 'Server is running' };
});

fastify.get('/api/stocks', async (request, reply) => {
  fastify.log.info('Fetching all stocks data');
  const stocks = {};
  
  for (const symbol of TOP_STOCKS) {
    const cachedData = cache.get(symbol);
    if (cachedData) {
      stocks[symbol] = cachedData.data;
    }
  }
  
  const timestamps = Array.from(cache.values()).map(c => c.timestamp);
  const lastUpdated = timestamps.length > 0 ? Math.min(...timestamps) : null;
  
  fastify.log.debug('Returning stocks data:', { 
    stockCount: Object.keys(stocks).length,
    lastUpdated 
  });
  
  return {
    stocks,
    lastUpdated
  };
});

fastify.get('/api/stock/:symbol', async (request, reply) => {
  const { symbol } = request.params;
  fastify.log.info(`Fetching data for ${symbol}`);
  
  if (!TOP_STOCKS.includes(symbol.toUpperCase())) {
    fastify.log.warn(`Invalid symbol requested: ${symbol}`);
    reply.code(404).send({ error: 'Stock not found in top stocks list' });
    return;
  }

  const cachedData = cache.get(symbol.toUpperCase());
  if (cachedData) {
    fastify.log.debug(`Returning cached data for ${symbol}`);
    return cachedData.data;
  }

  fastify.log.warn(`No data available for ${symbol}`);
  reply.code(404).send({ error: 'Stock data not available' });
});

// Add health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

// Start server
const port = process.env.PORT || 3000;
await fastify.listen({ port, host: '0.0.0.0' });
fastify.log.info(`Server listening at http://0.0.0.0:${port}`);
fastify.log.info('Server started successfully'); 