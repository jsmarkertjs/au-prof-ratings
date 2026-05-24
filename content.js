// A memory cache to store ratings so we don't spam the API 
const ratingCache = {}; 
// Keep track of who we are currently looking up to prevent race conditions 
const pendingRequests = new Set();

// Function to inject the rating UI next to the professor's name
function injectRating(element, professorName, ratingData) {
    const badge = document.createElement("span");
    badge.style.marginLeft = "8px";
    badge.style.padding = "2px 6px";
    badge.style.borderRadius = "4px";
    badge.style.fontWeight = "bold";
    badge.style.color = "white";
    badge.style.fontSize = "0.9em";
    
    const score = parseFloat(ratingData.avgRating);
    
    // --- NEW LOGIC: Handle 0 scores or missing data 
    if (score === 0 || isNaN(score)) {
        badge.style.backgroundColor = "#7f8c8d"; // Neutral gray
        badge.innerText = "Not Found";
        badge.title = "This professor does not have any ratings on Rate My Professors yet.";
    } else {
        // Normal color coding for valid scores
        if (score >= 4.0) badge.style.backgroundColor = "#27ae60"; // Green
        else if (score >= 3.0) badge.style.backgroundColor = "#f39c12"; // Yellow
        else badge.style.backgroundColor = "#c0392b"; // Red

        badge.innerText = `${ratingData.avgRating} / 5.0`;
        badge.title = `Difficulty: ${ratingData.avgDifficulty} | Would Take Again: ${ratingData.wouldTakeAgainPercent}% | Based on ${ratingData.numRatings} ratings`;
    }

    element.appendChild(badge);
}

// Function to find professors on the page and ask the background script for data
function findAndRateProfessors() {
    const professorElements = document.querySelectorAll('span[data-bind*="text: $data.FacultyName"]'); 

    professorElements.forEach(element => {
        // Skip if this specific HTML element already has a badge attached
        if (element.classList.contains("rmp-processed")) return;
        
        let rawName = element.innerText.trim();
        if (!rawName || rawName === "TBD" || rawName.includes("Staff")) return;

        let searchName = rawName;
        if (rawName.includes(",")) {
            let parts = rawName.split(","); 
            searchName = `${parts[1].trim()} ${parts[0].trim()}`; 
        }

        // SCENARIO 1: We already have the score in our cache!
        if (ratingCache[searchName]) {
            element.classList.add("rmp-processed"); // Mark HTML as processed
            injectRating(element, rawName, ratingCache[searchName]); // Inject instantly
            return;
        }

        // SCENARIO 2: We are currently waiting for the API to return this score
        if (pendingRequests.has(searchName)) return;

        // SCENARIO 3: We have never seen this name before, fetch it!
        pendingRequests.add(searchName);
        
        chrome.runtime.sendMessage({ action: "fetchRating", name: searchName }, (response) => {
            pendingRequests.delete(searchName); // Remove from waiting list

            let ratingData;
            if (response && response.success) {
                ratingData = response.data;
            } else {
                ratingData = { avgRating: 0 }; // Triggers the gray "Not Found" badge
            }

            // Save the newly found data to our local cache
            ratingCache[searchName] = ratingData;

            // Re-trigger the scanner! 
            // It will now see Scenario 1 for all instances of this professor.
            findAndRateProfessors(); 
        });
    });
}

// Set up the MutationObserver to watch for dynamically loaded class lists
const observer = new MutationObserver((mutations) => {
    findAndRateProfessors();
});

// Start watching the entire body of the webpage for changes
observer.observe(document.body, { childList: true, subtree: true });