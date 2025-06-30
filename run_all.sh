#!/bin/bash

# Activate virtual environment if it exists
if [ -d "venv" ]; then
  echo "Activating Python virtual environment..."
  source venv/bin/activate
fi

echo "Starting Flask backend on http://localhost:5001/ ..."
cd lms-backend
python3 app.py &
BACKEND_PID=$!
cd ..

echo "Starting static frontend on http://localhost:5500/course-recommendations/index.html ..."
python3 -m http.server 5500 &
FRONTEND_PID=$!

# Optionally, open the browser automatically (uncomment if desired)
open "http://localhost:5500/course-recommendations/index.html"

echo "\nBoth servers are running. Press Ctrl+C to stop."

# Wait for both servers to exit
wait $BACKEND_PID $FRONTEND_PID 