# AU Eagle Service: Rate My Professors Integration

A Chrome Extension that seamlessly integrates Rate My Professors data directly into the American University Eagle Service registration portal. 

## The Problem
Registering for classes requires keeping multiple tabs open, constantly switching between the university portal and Rate My Professors to manually cross-reference instructors. 

## The Solution
This extension acts as a bridge. It injects a custom-built, interactive UI directly into the Eagle Service DOM. By querying the Rate My Professors GraphQL API in the background, it instantly overlays quality ratings, difficulty scores, and a detailed data-visualization tooltip of student sentiment for every available professor.

## Features
* **Instant Inline Ratings:** Color-coded Quality and Difficulty badges injected next to professor names.
* **Deep Analytics Hover Card:** A custom dark-theme tooltip displaying 'Would Take Again' percentage, total reviews, and a bar chart of the rating distribution.
* **Smart Caching:** Local memory cache prevents redundant API calls and rate-limiting.

## Built With
* JavaScript (Manifest V3)
* HTML / CSS
* GraphQL (Rate My Professors API)

## Local Installation (Developer Mode)
1. Clone this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Toggle on **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the folder containing these files.
5. Navigate to Eagle Service and watch the badges load!

## Chrome Extension Link
