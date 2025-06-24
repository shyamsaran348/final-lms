#!/bin/bash

# Start the backend Flask server
cd lms-backend
nohup python3 app.py > backend.log 2>&1 &
BACKEND_PID=$!
cd ..

echo "Backend started with PID $BACKEND_PID (logs: lms-backend/backend.log)"

# Start the frontend HTTP server
nohup python3 -m http.server 8000 > frontend.log 2>&1 &
FRONTEND_PID=$!

echo "Frontend started with PID $FRONTEND_PID (logs: frontend.log)"

echo "\nProject is running:"
echo "  Backend:  http://localhost:5000"
echo "  Frontend: http://localhost:8000" 