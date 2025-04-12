# Stock-Pi Monitor

A lightweight stock monitoring application designed for Raspberry Pi 3B with a 3.5-inch screen.

## Features

- Real-time stock price monitoring
- Responsive design optimized for 3.5-inch screen
- Efficient caching to minimize API calls
- Lightweight implementation using Preact and Fastify

## Prerequisites

- Node.js 18+ installed on your Raspberry Pi
- Alpha Vantage API key (get one at https://www.alphavantage.co/)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/stock-pi.git
cd stock-pi
```

2. Install dependencies:
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Configure environment variables:
```bash
# In the server directory
cp .env.example .env
```
Edit `.env` and add your Alpha Vantage API key.

## Running the Application

1. Start the server:
```bash
cd server
npm start
```

2. Start the client (in development):
```bash
cd client
npm run dev
```

For production:
```bash
cd client
npm run build
```

## Auto-start on Raspberry Pi

To make the application start automatically when your Raspberry Pi boots:

1. Create a systemd service file:
```bash
sudo nano /etc/systemd/system/stock-pi.service
```

2. Add the following content:
```ini
[Unit]
Description=Stock-Pi Monitor
After=network.target

[Service]
WorkingDirectory=/path/to/stock-pi/server
ExecStart=/usr/bin/npm start
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
```

3. Enable and start the service:
```bash
sudo systemctl enable stock-pi
sudo systemctl start stock-pi
```

## License

MIT