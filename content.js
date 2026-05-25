// A memory cache to store ratings so we don't spam the API 
const ratingCache = {}; 
// Keep track of who we are currently looking up to prevent race conditions 
const pendingRequests = new Set();

// Function to inject the rating UI next to the professor's name
// Function to inject the rating UI next to the professor's name
function injectRating(element, professorName, ratingData) {
    const badge = document.createElement("span");
    badge.style.marginLeft = "8px";
    badge.style.padding = "2px 6px";
    badge.style.borderRadius = "4px";
    badge.style.fontWeight = "bold";
    badge.style.color = "white";
    badge.style.fontSize = "0.9em";
    
    // Parse the scores as floats
    const score = parseFloat(ratingData.avgRating);
    const diffScore = parseFloat(ratingData.avgDifficulty);
    
    // --- NEW LOGIC: Apply Opposite Color Grading to Difficulty ---
    
    // Quality Rating (Standard: Higher is Green)
    if (score >= 4.0) badge.style.backgroundColor = "#27ae60"; // Green
    else if (score >= 3.0) badge.style.backgroundColor = "#f39c12"; // Yellow
    else badge.style.backgroundColor = "#c0392b"; // Red

    badge.innerText = `${ratingData.avgRating} / 5.0`;
    
    // Difficulty Rating (Opposite: Lower is Green)
    const diffBadge = document.createElement("span");
    diffBadge.style.marginLeft = "4px";
    diffBadge.style.padding = "2px 6px";
    diffBadge.style.borderRadius = "4px";
    diffBadge.style.fontWeight = "bold";
    diffBadge.style.color = "white";
    diffBadge.style.fontSize = "0.9em";
    diffBadge.innerText = `${ratingData.avgDifficulty} Diff`;

    // Green (Easy): 1.0 - 2.5
    if (diffScore <= 2.5) diffBadge.style.backgroundColor = "#27ae60"; 
    // Yellow (Medium): 2.6 - 3.5
    else if (diffScore <= 3.5) diffBadge.style.backgroundColor = "#f39c12";
    // Red (Hard): 3.6 - 5.0
    else diffBadge.style.backgroundColor = "#c0392b"; 

    // Create the tooltip card
    const tooltip = document.createElement("div");
    tooltip.style.position = "absolute";
    tooltip.style.backgroundColor = "#fff";
    tooltip.style.color = "#333";
    tooltip.style.border = "1px solid #ccc";
    tooltip.style.padding = "10px";
    tooltip.style.borderRadius = "5px";
    tooltip.style.width = "250px";
    tooltip.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    tooltip.style.zIndex = "100";
    tooltip.style.display = "none";
    tooltip.style.left = "50px";
    tooltip.style.top = "-50px";
    tooltip.innerHTML = `
        <h3>David L. Barker</h3>
        <p>Quality: ${ratingData.avgRating}/5</p>
        <p>Difficulty: ${ratingData.avgDifficulty}/5</p>
        <p>Would Take Again: ${ratingData.wouldTakeAgainPercent}%</p>
        <p>Total Ratings: ${ratingData.numRatings}</p>
        <h4>Rating Distribution</h4>
        <p>5 star: ${ratingData.ratingsDistribution.r5}</p>
        <p>4 star: ${ratingData.ratingsDistribution.r4}</p>
        <p>3 star: ${ratingData.ratingsDistribution.r3}</p>
        <p>2 star: ${ratingData.ratingsDistribution.r2}</p>
        <p>1 star: ${ratingData.ratingsDistribution.r1}</p>
    `;

    // Create a container for everything
    const container = document.createElement("div");
    container.style.display = "inline-block";
    container.style.position = "relative";
    container.appendChild(badge);
    container.appendChild(diffBadge);
    container.appendChild(tooltip);

    // Show tooltip on hover
    container.addEventListener("mouseenter", () => {
        tooltip.style.display = "block";
    });
    // Hide tooltip on mouse leave
    container.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
    });

    element.appendChild(container);
}

// --- REST OF content.js (MutationObserver logic, etc.) ---

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