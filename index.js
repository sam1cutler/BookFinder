'use strict';

/********** Define strings for the APIs **********/

const apiStore = {
    // TasteDive API.
    apiKey1: '391102-BookReco-Z2ZG9UZJ',
    baseTasteDiveEndpoint: 'https://tastedive.com/api/similar?',

    // NYTimes API
    apiKey2: 'reKLNnPSUMVZmXe2dGGr9gAaLmAOVhGy',
    baseNytEndpoint: 'https://api.nytimes.com/svc/books/v3/reviews.json?',

    // OpenLibrary API
    baseOpenLibraryEndpoint: 'https://openlibrary.org/api/books?'
}


/********** Initialize empty results-tracking attributes **********/

let resultsAttributes = {
    // object of TasteDive search results, associated with simply-named IDs
    tastediveResultsSimpleList: {},

    // string that will be set to either "author" or "book" when the search is submitted
    tastediveSearchType: ''
}




/********** TEMPLATE GENERATION FUNCTIONS **********/

// Create the HTML string for each item in the TasteDive results list
function createResultsListItemString(resultObject,i,summaryInfo) {

    // Create a shorthand name replacing spaces with plus signs, for Alibris/Indiebound URLs
    const resultHitShorthand = resultObject.Name.replace(/ /g, '+').replace(/'/g, '%27');

    // Create a "targetID" for to link the "request for reviews" button to  
    const targetID = `tasteDiveResult-${i}`;

    // Add an object (key:value targetID:searchResultName) to master results List
    resultsAttributes.tastediveResultsSimpleList[targetID] = resultObject.Name;

    return `
        <li>
            <div class='result-big-box group'>
                <div class='main-hit-title item'>
                    <h4 class='result-header-name'>${resultObject.Name}</h4>
                </div>

                <div class='result-medium-box item'>
                ${summaryInfo}
                </div>

                <button type='button' id='js-reviews-button-${targetID}' class='js-book-review-button item nyt-button' value='${targetID}'>Search for relevant New York Times book reviews.</button>
                
                <div id='js-reviews-target-${targetID}' class='result-medium-box reviews-box item hidden'></div>

                <div class='result-medium-box item buttons-box buttons-group'>
                    <a href='https://www.alibris.com/booksearch?mtype=B&keyword=${resultHitShorthand}' target='_blank' class='link-out-icon'>Shop for used books.</a>
                    <a href='https://www.indiebound.org/search/book?keys=${resultHitShorthand}' target='_blank' class='link-out-icon'>Shop at local bookstores.</a>
                </div>
            </ul>
        </li>`;
}

// Create the HTML string containing Wiki teaser + link, if available from Tastedive results
function createGoodResultsListItemString(resultObject) {
    return `
    <p class='thing-summary'>${resultObject.wTeaser}</p></br>
    <p class="wiki-ref-link"><a href="${resultObject.wUrl}" target='_blank'>Learn more...</a>.</p>`;
}

// Create the HTML string containing "no teaser" message + formatted Google search, if Wiki info UNavailable from Tastedive results
function createSparseResultsSummary(resultObject) {
    // Create a Google search URL
    const googleSearchQuery = encodeURIComponent(resultObject.Name);
    const googleSearchUrl = 'https://www.google.com/search?q='+googleSearchQuery;
    
    return `<p class='thing-summary'>Could not find information about this result, but you can try <a href='${googleSearchUrl}' target='_blank'>doing a Google search</a>.</p>`;
}


/********** RENDER FUNCTIONS **********/

// Create TasteDive Results List + insert into the DOM.
function displayGoodTasteDiveResults(resultsArray, searchTermName) {

    // Provide to user the successfully-parsed name of what they searched for
    const successfulMessage = `
        <h3>Here are recommendations based on your search for...</h3>
        <div class='result-medium-box search-summary-box'><h2>${searchTermName}</h2></div>`;
    $('.js-successful-search-message').html(successfulMessage);

    // Create the HTML string containing the results list
    let resultsListHtmlString = '';

    for (let i=0 ; i<resultsArray.length ; i++) {

        // Initialize empty "summary info" string
        let summaryInfoHtml = '';

        // Determine whether there is a Wikipedia link / summary for the search result
        if (!resultsArray[i].wUrl) {
            summaryInfoHtml = createSparseResultsSummary(resultsArray[i]);
        } else {
            summaryInfoHtml = createGoodResultsListItemString(resultsArray[i]);
        }
        resultsListHtmlString += createResultsListItemString(resultsArray[i],i,summaryInfoHtml);
    };

    // Scroll back to the top of the page
    $(window).scrollTop(0);
    
    // Hide the TasteDive search form and (in case it had been revealed) "tips" section
    $('.submission-section').addClass('hidden');
    $('.search-tips-div').addClass('hidden');

    // Add the results list to the relevant list element + reveal it
    $('.js-results-list').append(resultsListHtmlString);
    $('.results-section').removeClass('hidden');

    // Reveal the OpenLibrary lookup section and restart buttons section
    $('.open-library-section').removeClass('hidden');
    $('.fresh-search').removeClass('hidden');
}

// Logic to determine how to handle the TasteDive search results
function handleTasteDiveResults(responseJson) {

    if (responseJson.Similar.Results.length === 0) {
        $('.js-error-message').html('<h4>This search did not get any results. Please try again.');
        $('.js-error-message').removeClass('hidden');
        $('.search-tips-div').removeClass('hidden');
    } else {
        $('.js-error-message').empty();
        displayGoodTasteDiveResults(responseJson.Similar.Results, responseJson.Similar.Info[0].Name);
    };
}

// Create NYT reviews results list
function displayNytResults(reviewResultsArray) {

    let nytReviewHTML = `
        <h3>New York Times book reviews:</h3>
        <ul>`;

    // Define lower of two values: either the # of search results, or 5 (to avoid huge list of reviews)
    const numberReviewsToShow = Math.min(reviewResultsArray.length, 5);

    for (let i=0 ; i<numberReviewsToShow ; i++) {
        nytReviewHTML += `<li><a href='${reviewResultsArray[i].url}' target="_blank">${reviewResultsArray[i].book_title}</a></li>`
    };

    nytReviewHTML += '</ul>';

    return nytReviewHTML;
}

// Create OpenLib results list
function displayOpenLibResults(results, queryISBNs) {
    const ISBNcall = `${queryISBNs}`;

    const openLibHTML = `
        <div class='buttons-group'>
            <img src="${results[ISBNcall].thumbnail_url}" alt="open-library thumbnail preview">
            <div>
                <a href='${results[ISBNcall].info_url}' target="_blank"><button>Open Library Book</button></a>
            </div>
        </div>`;

    return openLibHTML;
}


// Handle NYTimes Books API search results
function handleNytResults(responseJson,queryID) {

    let nytReviewHTML = ''

    if (responseJson.results.length === 0) {
        nytReviewHTML = '<p><i>Sorry, could not find any relevant reviews.</i></p>';
        $(`#js-reviews-target-${queryID}`).addClass('no-nyt-reviews-message');
    } else {
        nytReviewHTML = displayNytResults(responseJson.results);
    };
    
    // Fill in reviews list and reveal the DOM element
    $(`#js-reviews-target-${queryID}`).html(nytReviewHTML);
    $(`#js-reviews-target-${queryID}`).removeClass('hidden');

    // Hide the "search" button
    $(`#js-reviews-button-${queryID}`).addClass('hidden');
}

// Handle OpenLibrary API search results
function handleOpenLibraryResults(responseJson, queryISBNs) {

    let openLibHTML = ''

    if (responseJson.length === 0) {
        openLibHTML = 'Sorry, could not find relevant search results. Please check the ISBN number[s].';
    } else {
        openLibHTML = displayOpenLibResults(responseJson, queryISBNs);
    };

    $('.open-library-results').html(openLibHTML);
    $('.open-library-results').removeClass('hidden');
}

// Handle clicks of the reset search form button
function handleResetForm() {

    // Empty contents of the results list and hide the results section
    $('.js-successful-search-message').empty();
    $('.js-results-list').empty();
    $('.results-section').addClass('hidden');

    // Empty contents of the Tastedive search field, reveal search section and search tips, hide 'primary instruction' welcome message.
    $('#tastedive-search-field').val('');
    $('.submission-section').removeClass('hidden');
    $('.search-tips-div').removeClass('hidden');
    $('.primary-instruction').addClass('hidden');

    // Empty contents of and hide the Open Library section
    $('#js-isbn-field').val('');
    $('.open-library-section').addClass('hidden');

    // Empty Open Library search results and hide its section
    $('.open-library-results-list').empty();
    $('.open-library-results').addClass('hidden');

    // Hide the reset button and error message sections
    $('.fresh-search').addClass('hidden');
    $('.js-error-message').addClass('hidden');

    // Scroll to the top of the page.
    $(window).scrollTop(0);

    // Reset results list object and searchType thing
    resultsAttributes.tastediveResultsSimpleList = {};
    resultsAttributes.tastediveSearchType = '';
}


/********** API REQUEST STRING GENERATION FUNCTIONS **********/

// Create the query string for the GET request.

function formatTasteDiveQueryParams(queryParams) {

    // Initialize empty start to queryString.
    let queryString = 'q=';

    // Add the search type.
    queryString += queryParams.requestedType+':'

    // Add the primary search term, replacing spaces with + signs.
    queryString += queryParams.requestedReference.replace(/ /g, '%20');

    // Add the info parameter to get verbose responses
    queryString += '&info=1';

    // Add additional query parameters: 
    queryString += '&type=author';   // => specify types in response (this doesn't seem to actually work as claimed, probably remove eventually)
    queryString += '&callback';      // => specify JSONP format
    queryString += queryParams.key;  // => add the API key

    return queryString;
}

function formatNytQueryParams(queryParams) {

    // true query term omits the end-of-the-string tag for author/title type
    const coreQuery = queryParams.requestedReference.replace(/ /g, '+');

    // Determine whether searching for an author or title
    let searchType = '';
    if (resultsAttributes.tastediveSearchType === 'author') {
        searchType = 'author=';
    } else if (resultsAttributes.tastediveSearchType === 'book') {
        searchType = 'title=';
    };

    const queryString = searchType+coreQuery+'&api-key='+queryParams.key;

    return queryString;
}

function formatOpenLibQueryParams(queryParams) {

    const queryString = `bibkeys=${queryParams}&format=json`;

    return queryString;
}

/********** API REQUEST FUNCTIONS **********/

// Submit the TasteDive API GET request.
function getTastediveRecommendations(searchTerm, searchType) {

    const params = {
        key: apiStore.apiKey1,
        requestedReference: searchTerm,
        requestedType: searchType
    };

    const queryString = formatTasteDiveQueryParams(params);
    const URLtoBeFetched = apiStore.baseTasteDiveEndpoint+queryString;

    fetchJsonp(URLtoBeFetched)
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error(response.statusText);
        })
        .then(responseJson => handleTasteDiveResults(responseJson))
        .catch(err => {
            $('#js-error-message').text(`Something went wrong: ${err.message}`);
        });
}

// Submit the NYTimes Books API GET request.
function fetchNyTimesReviews(queryID) {

    const queryTerm = resultsAttributes.tastediveResultsSimpleList[queryID];

    const params = {
        key: apiStore.apiKey2,
        requestedReference: queryTerm
    };

    const queryString = formatNytQueryParams(params);
    const URLtoBeFetched = apiStore.baseNytEndpoint+queryString;

    fetch(URLtoBeFetched)
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error(response.statusText);
        })
        .then(responseJson => handleNytResults(responseJson, queryID))
        .catch(err => {
            $('#js-error-message').text(`Something went wrong: ${err.message}`);
        });
}

// Submit the Open Library API GET request.
function fetchOpenLibraryBooks(queryISBNs) {

    const queryString = formatOpenLibQueryParams(queryISBNs);
    const URLtoBeFetched = apiStore.baseOpenLibraryEndpoint+queryString;

    fetch(URLtoBeFetched)
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error(response.statusText);
        })
        .then(responseJson => handleOpenLibraryResults(responseJson, queryISBNs))
        .catch(err => {
            $('#js-error-message').text(`Something went wrong: ${err.message}`);
        });
}

/********** EVENT HANDLER FUNCTIONS **********/

// Set up event listener on primary submission form
function watchTastediveSearchForm() {

    $('.tastedive-search-form').on('submit', function(event) {
        event.preventDefault();

        const searchTerm = $('#tastedive-search-field').val();
        const searchType = $('.tastedive-search-type').val();
        resultsAttributes.tastediveSearchType = searchType;

        getTastediveRecommendations(searchTerm, searchType);
    })
}

// Set up event listener on "Show NYT Reviews" button
function watchNyTimesReviewsRequest() {
    $('.results-section').on('click','.js-book-review-button', function(event) {
        event.preventDefault();
        const requestedFeature = $(this).val();
        fetchNyTimesReviews(requestedFeature);
    })
}

// Set up event listener on Open Library Search Form
function watchOpenLibraryRequest() {

    $('.open-library-section').on('submit','.open-library-form', function(event) {
        event.preventDefault();
        
        const requestedISBN = $('#js-isbn-field').val();
        fetchOpenLibraryBooks(requestedISBN);
    })
}

// Set up event listener on Reset Form
function watchResetForm() {

    $('.fresh-search').on('click', function(event) {
        handleResetForm();
    })
}

// Run the event-listeners-setup function
function handleLookupPage() {
    watchTastediveSearchForm();
    watchNyTimesReviewsRequest();
    watchOpenLibraryRequest();
    watchResetForm();
}

$(handleLookupPage);