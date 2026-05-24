// A Set to keep track of professors we've already searched to avoid spamming the API
const processedProfessors = new Set();

// Function to inject the rating UI next to the professor's name
function injectRating(element, professorName, ratingData) {
    // Create the badge element
    const badge = document.createElement("span");
    badge.style.marginLeft = "8px";
    badge.style.padding = "2px 6px";
    badge.style.borderRadius = "4px";
    badge.style.fontWeight = "bold";
    badge.style.color = "white";
    badge.style.fontSize = "0.9em";
    
    // Color coding based on the score
    const score = parseFloat(ratingData.avgRating);
    if (score >= 4.0) badge.style.backgroundColor = "#27ae60"; // Green
    else if (score >= 3.0) badge.style.backgroundColor = "#f39c12"; // Yellow
    else badge.style.backgroundColor = "#c0392b"; // Red

    badge.innerText = `${ratingData.avgRating} / 5.0`;
    
    // Add a hover tooltip with more info
    badge.title = `Difficulty: ${ratingData.avgDifficulty} | Would Take Again: ${ratingData.wouldTakeAgainPercent}% | Based on ${ratingData.numRatings} ratings`;

    // Append it right next to the professor's name
    element.appendChild(badge);
}

// Function to find professors on the page and ask the background script for data
function findAndRateProfessors() {
    const professorElements = document.querySelectorAll('span[data-bind*="text: $data.FacultyName"]'); 

    professorElements.forEach(element => {
        let rawName = element.innerText.trim();
        
        // Skip if empty, says "Staff", or we've already processed them
        if (!rawName || rawName === "TBD" || rawName.includes("Staff") || processedProfessors.has(rawName)) return;
        
        processedProfessors.add(rawName);

        // Flip "Last, First" into "First Last"
        let searchName = rawName;
        if (rawName.includes(",")) {
            let parts = rawName.split(","); // Splits into ["Taylor", " Steven J."]
            searchName = `${parts[1].trim()} ${parts[0].trim()}`; // Recombines into "Steven J. Taylor"
        }

        // Send the flipped name to our background.js file
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
    // Whenever the page changes, run our search function
    findAndRateProfessors();
});

// Start watching the entire body of the webpage for changes
observer.observe(document.body, { childList: true, subtree: true });