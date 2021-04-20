(function evoTSPwrapper($) {

    const baseUrl = 'https://0z2figs2v9.execute-api.us-east-1.amazonaws.com/dev';

    $(function onDocReady() {
        $('#generate-random-routes').click(randomRoutes);
        $("#get-route-by-id").click(getRouteById);
    });

    // This generates a single random route by POSTing the runId and generation to the `/routes` endpoint.
    // The showRoute() function is called when the request response comes in.
    function randomRoute(runId, generation) {
        $.ajax({
            method: 'POST',
            url: baseUrl + '/routes',
            data: JSON.stringify({
                runId: runId,
                generation: generation
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


    function randomRoutes(event) {
        const runId = $('#runId-text-field').val();
        const generation = $('#generation-text-field').val();
        const numToGenerate =$('#num-to-generate').val();
        $('#new-route-list').text(''); // Empty the previous route list
        async.times(numToGenerate, () => randomRoute(runId, generation));
    }

    // When a request for a new route is completed, add an `<li>…</li>` element
    // to `#new-route-list` with that routes information.
    function showRoute(result) {
        console.log('New route received from API: ', result);
        const routeId = result.routeId;
        const length = result.length;
        $('#new-route-list').append(`<li>We generated route ${routeId} with length ${length}.</li>`);
    }

    function showRouteDetail(routeDetail) {
        const {routeId, key, route, length } = routeDetail;
        $('#route-by-id-elements').append(`<li>Route Id: ${routeId}</h5>`);
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
                console.error('Error generating random route: ', textStatus, ', Details: ', errorThrown);
                console.error('Response: ', jqXHR.responseText);
                alert('An error occurred when creating a random route:\n' + jqXHR.responseText);
            }
        })
    }

}(jQuery));