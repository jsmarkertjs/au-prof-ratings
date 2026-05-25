// A memory cache to store ratings so we don't spam the API 
const ratingCache = {}; 
// Keep track of who we are currently looking up to prevent race conditions 
const pendingRequests = new Set();

// Function to inject the rating UI next to the professor's name
// Function to inject the rating UI next to the professor's name
function injectRating(element, professorName, ratingData) {
    // Create the main container
    const container = document.createElement("div");
    container.className = "rmp-container";

    const score = parseFloat(ratingData.avgRating);
    
    if (score === 0 || isNaN(score)) {
        // Not Found State
        const badge = document.createElement("span");
        badge.className = "rmp-badge";
        badge.style.backgroundColor = "#7f8c8d"; 
        badge.innerText = "Not Found";
        container.appendChild(badge);
    } else {
        // Quality Badge
        const qualityBadge = document.createElement("span");
        qualityBadge.className = "rmp-badge";
        if (score >= 4.0) qualityBadge.style.backgroundColor = "#27ae60"; 
        else if (score >= 3.0) qualityBadge.style.backgroundColor = "#f39c12"; 
        else qualityBadge.style.backgroundColor = "#c0392b"; 
        qualityBadge.innerText = `${ratingData.avgRating} / 5.0 Quality`; 

        // Difficulty Badge
        const diffBadge = document.createElement("span");
        diffBadge.className = "rmp-badge rmp-difficulty";
        diffBadge.innerText = `${ratingData.avgDifficulty} / 5.0 Difficulty`;

        // Build the Tooltip Card
        const tooltip = document.createElement("div");
        tooltip.className = "rmp-tooltip";
        
        // Tooltip Header & Stats
        let tooltipHTML = `
            <div class="rmp-tooltip-header">Based on ${ratingData.numRatings} ratings</div>
            <div class="rmp-stat"><strong>${ratingData.wouldTakeAgainPercent}%</strong> would take again</div>
            <div style="margin-top: 8px; font-weight: bold; font-size: 12px;">Rating Distribution:</div>
        `;

        // Calculate and build the distribution bars
        if (ratingData.ratingsDistribution) {
            const dist = ratingData.ratingsDistribution;
            // Find the highest vote count to scale the bars properly
            const maxVotes = Math.max(dist.r1, dist.r2, dist.r3, dist.r4, dist.r5, 1); 

            // Create a row for each star rating (5 down to 1)
            const starCounts = [dist.r5, dist.r4, dist.r3, dist.r2, dist.r1];
            let starLabel = 5;

            starCounts.forEach(count => {
                const percentOfMax = (count / maxVotes) * 100;
                tooltipHTML += `
                    <div class="rmp-dist-row">
                        <span>${starLabel} ★</span>
                        <div class="rmp-bar-bg"><div class="rmp-bar-fill" style="width: ${percentOfMax}%"></div></div>
                        <span style="width: 20px; text-align: right;">${count}</span>
                    </div>
                `;
                starLabel--;
            });
        }

        tooltip.innerHTML = tooltipHTML;

        // Add everything into the container
        container.appendChild(qualityBadge);
        container.appendChild(diffBadge);
        container.appendChild(tooltip);
    }

    // Append the entire container right next to the professor's name
    element.appendChild(container);
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