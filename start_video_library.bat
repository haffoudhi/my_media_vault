@echo off
title Video Library Project
echo Opening Video Library in your browser...

:: Launch the browser in the background
start http://localhost:3000

:: Run the server in THIS window
echo Starting the Server...
node server.js

pause