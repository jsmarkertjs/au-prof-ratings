// Rate My Professors unique Base64 ID for American University
const AU_SCHOOL_ID = "U2Nob29sLTMy"; 

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchRating") {
    const professorName = request.name;

    // The GraphQL Query structure required by RMP
    const query = {
      query: `query TeacherSearchQuery($query: TeacherSearchQuery!) {
        newSearch {
          teachers(query: $query) {
            edges {
              node {
                id
                firstName
                lastName
                avgRating
                numRatings
                wouldTakeAgainPercent
                avgDifficulty
                ratingsDistribution {
                  r1
                  r2
                  r3
                  r4
                  r5
                }
              }
            }
          }
        }
      }`,
      variables: {
        query: {
          text: professorName,
          schoolID: AU_SCHOOL_ID
        }
      }
    };

    // Execute the fetch request to RMP
    fetch("https://www.ratemyprofessors.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic dGVzdDp0ZXN0" // Default public auth token for RMP
      },
      body: JSON.stringify(query)
    })
    .then(response => response.json())
    .then(data => {
      const teachers = data.data?.newSearch?.teachers?.edges;
      if (teachers && teachers.length > 0) {
        // Send the closest matching professor back to the webpage
        sendResponse({ success: true, data: teachers[0].node });
      } else {
        sendResponse({ success: false, error: "Professor not found" });
      }
    })
    .catch(err => sendResponse({ success: false, error: err.message }));

    return true; // Tells Chrome we will send the response asynchronously
  }
});