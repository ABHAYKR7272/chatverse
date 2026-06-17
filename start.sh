#!/bin/bash
echo ""
echo "  ██████╗██╗  ██╗ █████╗ ████████╗██████╗ ██╗██╗  ██╗"
echo " ██╔════╝██║  ██║██╔══██╗╚══██╔══╝██╔══██╗██║╚██╗██╔╝"
echo " ██║     ███████║███████║   ██║   ██████╔╝██║ ╚███╔╝ "
echo " ██║     ██╔══██║██╔══██║   ██║   ██╔══██╗██║ ██╔██╗ "
echo " ╚██████╗██║  ██║██║  ██║   ██║   ██║  ██║██║██╔╝ ██╗"
echo "  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝"
echo ""
echo "  Starting CHATRIX v2.0..."
echo ""

# Start server
cd "$(dirname "$0")/server"
node index.js &
SERVER_PID=$!

sleep 2

# Start client
cd "../client/chatrix-ui"
npm run dev &
CLIENT_PID=$!

echo ""
echo "  Server: http://localhost:3001"
echo "  App:    http://localhost:5173"
echo ""
echo "  Press Ctrl+C to stop both"

cleanup() {
  echo "Stopping CHATRIX..."
  kill $SERVER_PID 2>/dev/null
  kill $CLIENT_PID 2>/dev/null
  exit 0
}
trap cleanup INT TERM
wait
