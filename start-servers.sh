#!/bin/bash

# Colors for console output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting PlogGo servers...${NC}"

# Check if Python virtual environment exists
if [ ! -d "backend/.venv" ]; then
  echo -e "${BLUE}Creating Python virtual environment...${NC}"
  cd backend && python -m venv .venv
  cd ..
fi

# Start Flask classifier server in background
echo -e "${BLUE}Starting Flask classifier server...${NC}"
cd backend
source .venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1
export LITTER_CLASSIFIER_PORT=5002
export FLASK_DEBUG=True
python litter_classifier_server.py &
FLASK_PID=$!
cd ..
echo -e "${GREEN}Flask classifier server started with PID: $FLASK_PID${NC}"

# Wait for Flask server to start
echo -e "${BLUE}Waiting for Flask server to start...${NC}"
sleep 5

# Start Express server
echo -e "${BLUE}Starting Express server...${NC}"
cd backend-node
npm install > /dev/null 2>&1
npm run dev &
EXPRESS_PID=$!
cd ..
echo -e "${GREEN}Express server started with PID: $EXPRESS_PID${NC}"

# Function to handle exit
function cleanup {
  echo -e "${RED}Shutting down servers...${NC}"
  kill $FLASK_PID
  kill $EXPRESS_PID
  echo -e "${GREEN}Servers stopped${NC}"
  exit 0
}

# Trap exit signals
trap cleanup SIGINT SIGTERM

echo -e "${GREEN}Both servers are now running!${NC}"
echo -e "${BLUE}Flask classifier server: http://localhost:5002${NC}"
echo -e "${BLUE}Express main server: http://localhost:5000${NC}"
echo -e "${RED}Press Ctrl+C to stop all servers${NC}"

# Keep the script running
wait 