(function evoTSPwrapper($) {

    const baseUrl = 'https://0z2figs2v9.execute-api.us-east-1.amazonaws.com/prod';

    $(function onDocReady() {
        $('#generate-random-routes').click(randomRoutes);
        $("#get-route-by-id").click(getRouteById);
        $("#get-best-routes").click(getBestRoutes);
    });

    // This generates a single random route by POSTing the runId and generation to the `/routes` endpoint.
    // The showRoute() function is called when the request response comes in.
    function randomRoute(runId, gen) {
        $.ajax({
            method: 'POST',
            url: baseUrl + '/routes',
            data: JSON.stringify({
                runId: runId,
                gen: gen
            }),
            contentType: 'application/json',
            success: showRoute,
            error: function ajaxError(jqXHR, textStatus, errorThrown) {
                console.error('Error generating random route: ', textStatus, ', Details: ', errorThrown);
                console.error('Response: ', jqXHR.responseText);
                alert('An error occurred when creating a random route:\n' + jqXHR.responseText);
            }
        })
    }


    function randomRoutes() {
        const runId = $('#runId').val();
        const gen = $('#generation').val();
        const numToGenerate =$('#num-to-generate').val();
        $('#new-route-list').text(''); // Empty the previous route list
        async.times(numToGenerate, () => randomRoute(runId, gen));
    }

    // When a request for a new route is completed, add an `<li>…</li>` element
    // to `#new-route-list` with that routes information.
    function showRoute(result) {
        console.log('New route received from API: ', result);
        const routeId = result.routeId;
        const length = result.length;
        $('#new-route-list').append(`<li>We generated route ${routeId} with length ${length}.</li>`);
    }


    function showBestRoutes(bestRoutes) {
        console.log(bestRoutes);
        bestRoutes.forEach(route => {
            $('#best-route-list').append(`<li>Length: ${route.length} for Route Id: ${route.routeId}</li>`);
        })
    }


    function getBestRoutes() {
        const runId = $('#runId').val();
        const gen = $('#generation').val();
        const amount = $('#num-best-to-get').val();
        $('#best-route-list').text('');
        const queryString = $.param({ runId, gen, amount })
        $.ajax({
            method: 'GET',
            url: baseUrl + '/best?' + queryString,
            success: showBestRoutes,
            error: function ajaxError(jqXHR, textStatus, errorThrown) {
                console.error('Error getting best routes: ', textStatus, ', Details: ', errorThrown);
                console.error('Response: ', jqXHR.responseText);
                alert('An error occurred when creating a random route:\n' + jqXHR.responseText);
            }
        })
    }

    function showRouteDetail(routeDetail) {
        const {routeId, key, route, length } = routeDetail;
        $('#route-by-id-elements').append(`<li>Route Id: ${routeId}</li>`);
        $('#route-by-id-elements').append(`<li>Key: ${key}</li>`);
        $('#route-by-id-elements').append(`<li>Route: ${route}</li>`);
        $('#route-by-id-elements').append(`<li>Total Distance: ${length}</li>`);
    }


    function getRouteById() {
        const routeId = $('#route-Id').val();
        $('#route-by-id-elements').text('');
        $.ajax({
            method: 'GET',
            url: baseUrl + '/routes/' + encodeURIComponent(routeId),
            success: showRouteDetail,
            error: function ajaxError(jqXHR, textStatus, errorThrown) {
                console.error('Error getting round by id: ', textStatus, ', Details: ', errorThrown);
                console.error('Response: ', jqXHR.responseText);
                alert('An error occurred when creating a random route:\n' + jqXHR.responseText);
            }
        })
    }

}(jQuery));