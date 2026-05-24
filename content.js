// A Set to keep track of professors we've already searched to avoid spamming the API
const processedProfessors = new Set();

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
    
    // --- NEW LOGIC: Handle 0 scores or missing data ---
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
// Function to find professors on the page and ask the background script for data
function findAndRateProfessors() {
    const professorElements = document.querySelectorAll('span[data-bind*="text: $data.FacultyName"]'); 

    professorElements.forEach(element => {
        // --- NEW: Check if we already added a badge to THIS specific element ---
        if (element.classList.contains("rmp-processed")) return;
        
        let rawName = element.innerText.trim();
        
        if (!rawName || rawName === "TBD" || rawName.includes("Staff") || processedProfessors.has(rawName)) return;
        
        // We only add to the Set to prevent multiple API calls for the SAME name
        processedProfessors.add(rawName);

        // --- NEW: Mark this element as processed so we don't duplicate badges ---
        element.classList.add("rmp-processed");

        let searchName = rawName;
        if (rawName.includes(",")) {
            let parts = rawName.split(","); 
            searchName = `${parts[1].trim()} ${parts[0].trim()}`; 
        }

        chrome.runtime.sendMessage({ action: "fetchRating", name: searchName }, (response) => {
            if (response && response.success) {
                injectRating(element, rawName, response.data);
            } else {
                console.log(`Could not find RMP data for: ${searchName}`);
            }
        });
    });
}

// Set up the MutationObserver to watch for dynamically loaded class lists
const observer = new MutationObserver((mutations) => {
    findAndRateProfessors();
});

// Start watching the entire body of the webpage for changes
observer.observe(document.body, { childList: true, subtree: true });