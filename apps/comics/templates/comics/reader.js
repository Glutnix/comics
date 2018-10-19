var COMICS = function () {

    // Set up some global variables
    var MARKDOWN = window.markdownit();
    var NAVIGATION_UNKNOWN = "unknown";
    var NAVIGATION_INVALID = "invalid";
    var DATA_CACHE = {
        first: NAVIGATION_UNKNOWN,
        previous: NAVIGATION_UNKNOWN,
        current: NAVIGATION_UNKNOWN,
        next: NAVIGATION_UNKNOWN,
        last: NAVIGATION_UNKNOWN,
        comic: {
            "slug": "{{ comic.slug }}",
            "title": "{{ comic.title }}",
        }
    }
    var NUM_ACTIVE_REQUESTS = 0;

    // Make the current comic's data appear in the page
    function loadDataIntoDOM() {
        var comicData = DATA_CACHE.comic;
        var pageData = DATA_CACHE.current;

        // Browser State
        var newTitle = pageData.title + " | " + comicData.title;
        window.history.pushState(pageData, pageData.title, '/' + comicData.slug + '/' + pageData.slug + "/");
        document.title = pageData.title;

        // Compute Tag HTML
        var tagHTML = "";
        pageData.tag_types.forEach(function (tagType) {
            var tagStrings = "";
            tagType.tags.forEach(function (tag){
                if (tag.icon !== "") {
                    tagStrings += `
                    <a class="tag" href="${tag.url}">
                        <div style="background-image: url(${tag.icon});"></div>&nbsp;${tag.title}
                    </a>`;
                } else {
                    tagStrings += `<a class="tag" href="${tag.url}">${tag.title}</a>`;
                }
            });

            tagHTML += `
            <div class="tag-group">
                <p>${tagType.title}:</p>
                ${tagStrings}
            </div>`;
        });

        // Page Content
        document.getElementById("comic-title").innerHTML = pageData.title;
        document.getElementById("comic-tags").innerHTML = tagHTML;
        document.getElementById("comic-post-date").innerHTML = pageData.posted_at;
        document.getElementById("comic-post").innerHTML = MARKDOWN.render(pageData.post);
        document.getElementById("comic-transcript").innerHTML = MARKDOWN.render(pageData.transcript);
        document.getElementById("comic-image").src = pageData.image;  // TODO: Preload data so it's cached
        document.getElementById("comic-image").title = pageData.alt_text;
        document.getElementById("comic-image").style.opacity = 0.5;
        document.getElementById("comic-image-spinner").style.opacity = 1.0;

        var adminLink = document.getElementById("admin-edit-link");
        if (adminLink) {
            adminLink.href = pageData.admin;
        }
        // TODO: Should we scroll to the top of the page?

        // Navigation Buttons
        recalculateNavigationVisibility();

        // Tell Google Analytics that we successfully loaded the page
        if ("ga" in window && ga.getAll !== undefined) {
            tracker = ga.getAll()[0];
            if (tracker) {
                tracker.set('page', window.location.pathname);
                tracker.send('pageview');
            }
        }
    }

    // Make the navigation buttons appear or disappear
    function recalculateNavigationVisibility() {
        // TODO: Change these into CSS classes for "unready", "ready", "invalid"
        if (DATA_CACHE.next === NAVIGATION_INVALID) {
            document.getElementById("navigation-next").style.display = "none";
            document.getElementById("navigation-last").style.display = "none";
        } else {
            document.getElementById("navigation-next").style.display = "";
            document.getElementById("navigation-last").style.display = "";
        }
        if (DATA_CACHE.previous === NAVIGATION_INVALID) {
            document.getElementById("navigation-previous").style.display = "none";
            document.getElementById("navigation-first").style.display = "none";
        } else {
            document.getElementById("navigation-previous").style.display = "";
            document.getElementById("navigation-first").style.display = "";
        }

        if (NUM_ACTIVE_REQUESTS > 0) {
            document.getElementsByClassName("comic-navigation")[0].style.opacity = 0.5;
        } else {
            document.getElementsByClassName("comic-navigation")[0].style.opacity = 1.0;
        }

        document.getElementById("navigation-first").blur();
        document.getElementById("navigation-previous").blur();
        document.getElementById("navigation-next").blur();
        document.getElementById("navigation-last").blur();
    }

    function imageLoaded() {
        document.getElementById("comic-image").style.opacity = 1.0;
        document.getElementById("comic-image-spinner").style.opacity = 0.0;
    }

    // Kickstart the page load
    function initializePage() {
        // Get the initial params from the URL
        var data = new URL(document.location).pathname.split('/');
        var pageSlug = data[2];

        // Request the page data
        getPageData(DATA_CACHE.comic.slug, pageSlug, function (response) {
            DATA_CACHE.current = response;
            loadDataIntoDOM();

            // Preload the data for each of the navigation arrows
            getPageData(DATA_CACHE.comic.slug, DATA_CACHE.current.first, function (response) { DATA_CACHE.first = response; });
            getPageData(DATA_CACHE.comic.slug, DATA_CACHE.current.previous, function (response) { DATA_CACHE.previous = response; });
            getPageData(DATA_CACHE.comic.slug, DATA_CACHE.current.next, function (response) { DATA_CACHE.next = response; });
            getPageData(DATA_CACHE.comic.slug, DATA_CACHE.current.last, function (response) { DATA_CACHE.last = response; });
        });
    };

    // The next 4 functions perform the navigation. They look similar but are subtly different
    function firstButtonPressed() {
        if (NUM_ACTIVE_REQUESTS > 0) {
            console.log("Can't navigate, " + NUM_ACTIVE_REQUESTS + " active requests.");
            return;
        }

        if (DATA_CACHE.first === NAVIGATION_INVALID || DATA_CACHE.first === NAVIGATION_UNKNOWN) {
            console.log("Can't navigate, unknown destination.");
            return;
        }

        DATA_CACHE.current = DATA_CACHE.first;
        DATA_CACHE.previous = NAVIGATION_INVALID;
        DATA_CACHE.next = NAVIGATION_UNKNOWN;

        loadDataIntoDOM();

        getPageData(DATA_CACHE.comic.slug, DATA_CACHE.current.next, function (response) { DATA_CACHE.next = response; });
    }

    function previousButtonPressed() {
        if (NUM_ACTIVE_REQUESTS > 0) {
            console.log("Can't navigate, " + NUM_ACTIVE_REQUESTS + " active requests.");
            return;
        }

        if (DATA_CACHE.previous === NAVIGATION_INVALID || DATA_CACHE.previous === NAVIGATION_UNKNOWN) {
            console.log("Can't navigate, unknown destination.");
            return;
        }

        DATA_CACHE.next = DATA_CACHE.current;
        DATA_CACHE.current = DATA_CACHE.previous;
        DATA_CACHE.previous = NAVIGATION_UNKNOWN;

        loadDataIntoDOM();

        getPageData(DATA_CACHE.comic.slug, DATA_CACHE.current.previous, function (response) { DATA_CACHE.previous = response; });
    }

    function nextButtonPressed() {
        if (NUM_ACTIVE_REQUESTS > 0) {
            console.log("Can't navigate, " + NUM_ACTIVE_REQUESTS + " active requests.");
            return;
        }

        if (DATA_CACHE.next === NAVIGATION_INVALID || DATA_CACHE.next === NAVIGATION_UNKNOWN) {
            console.log("Can't navigate, unknown destination.");
            return;
        }

        DATA_CACHE.previous = DATA_CACHE.current;
        DATA_CACHE.current = DATA_CACHE.next;
        DATA_CACHE.next = NAVIGATION_UNKNOWN;

        loadDataIntoDOM();

        getPageData(DATA_CACHE.comic.slug, DATA_CACHE.current.next, function (response) { DATA_CACHE.next = response; });
    }

    function lastButtonPressed() {
        if (NUM_ACTIVE_REQUESTS > 0) {
            console.log("Can't navigate, " + NUM_ACTIVE_REQUESTS + " active requests.");
            return;
        }

        if (DATA_CACHE.last === NAVIGATION_INVALID || DATA_CACHE.last === NAVIGATION_UNKNOWN) {
            console.log("Can't navigate, unknown destination.");
            return;
        }

        DATA_CACHE.current = DATA_CACHE.last;
        DATA_CACHE.previous = NAVIGATION_UNKNOWN;
        DATA_CACHE.next = NAVIGATION_INVALID;

        loadDataIntoDOM();

        getPageData(DATA_CACHE.comic.slug, DATA_CACHE.current.previous, function (response) { DATA_CACHE.previous = response; });
    }

    // Make an AJAX request to get data
    function getPageData(comicSlug, pageSlug, callback) {
        if (pageSlug === null) {
            callback(NAVIGATION_INVALID);
            recalculateNavigationVisibility();
            return;
        }

        NUM_ACTIVE_REQUESTS += 1;
        recalculateNavigationVisibility();
        var url = "/" + comicSlug + "/data/" + pageSlug + "/";
        var request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (request.readyState == 4 && request.status == 200) {
                try {
                    var data = JSON.parse(request.responseText);
                } catch(err) {
                    console.log(err.message + " in " + request.responseText);
                    return;
                }

                // Run the callback and update the navigation state
                callback(data);
                NUM_ACTIVE_REQUESTS -= 1;
                recalculateNavigationVisibility();

                // Pre-warm the image cache
                preloadImage(data.image);
            }
        };
        request.open("GET", url, true);
        request.send();
    }

    function preloadImage(url) {
        var img = new Image();
        img.onload = function() {
            img.src = "";
            img = null;
        }
        img.src = url;
    }

    function checkKeycode(event) {
        // handling Internet Explorer stupidity with window.event
        // @see http://stackoverflow.com/a/3985882/517705
        var keyDownEvent = event || window.event;
        var keycode = (keyDownEvent.which) ? keyDownEvent.which : keyDownEvent.keyCode;
        var LEFT = 37;
        var RIGHT = 39;
        if (keycode === LEFT) {
            previousButtonPressed();
        } else if (keycode === RIGHT) {
            nextButtonPressed();
        }
        return false;
    }
    document.onkeydown = checkKeycode;

    // TODO: handle routing like this instead
    // window.onpopstate = function(event) {
    //     console.log("location: " + document.location + ", state: " + JSON.stringify(event.state));
    // };

    // Run the initialization and then publish any variables that need to be public.
    return {
        initializePage: initializePage,
        firstButtonPressed: firstButtonPressed,
        previousButtonPressed: previousButtonPressed,
        nextButtonPressed: nextButtonPressed,
        lastButtonPressed: lastButtonPressed,
        imageLoaded: imageLoaded,
    };
}();

document.addEventListener("DOMContentLoaded", function(event) {
    COMICS.initializePage();
});
