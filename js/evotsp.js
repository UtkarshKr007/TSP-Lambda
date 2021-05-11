(function evoTSPWrapper($) {

  const baseUrl = "https://0z2figs2v9.execute-api.us-east-1.amazonaws.com/prod";
  var cityData;
  var lengthStoreThreshold = Infinity;
  var runId;
  var customCities = [];
  var region = "Minnesota";

  var best = {
    routeId: "", // The ID of the best current path
    bestPath: [], // The array of indices of best current path
    len: Infinity, // The length of the best current path
    coords: [], // The coordinates of the best current path
    lRoute: [[], []], // best route as lat-long data
  };

  function runEvolution() {
    // Generate a new runId and set the current generation to 0
    runId = generateUID(16);
    const initialGeneration = 0;
    $("#current-generation").text(initialGeneration);


    async.series([
      initializePopulation, // create the initial population
      runAllGenerations,    // Run the specified number of generations
      showAllDoneAlert,     // Show an "All done" alert.
    ]);

    function initializePopulation(cb) {
      const populationSize = parseInt($("#population-size-text-field").val());
      console.log(`Initializing pop for runId = ${runId} with pop size ${populationSize}, generation = ${initialGeneration}`);
      $("#new-route-list").text("");
      async.times(
        populationSize,
        (_, rr_cb) => randomRoute(runId, initialGeneration, rr_cb),
        cb
      );
    }

    function runAllGenerations(cb) {
      // get # of generations
      const numGenerations = parseInt($("#num-generations").val());

 
      async.timesSeries(
        numGenerations,
        runGeneration,
        cb
      );
    }

    function showAllDoneAlert(cb) {
      alert("All done! (but there could still be some GUI updates)");
      cb();
    }

    // Generate a unique ID; lifted from https://stackoverflow.com/a/63363662
    function generateUID(length) {
      return window
        .btoa(
          Array.from(window.crypto.getRandomValues(new Uint8Array(length * 2)))
            .map((b) => String.fromCharCode(b))
            .join("")
        )
        .replace(/[+/]/g, "")
        .substring(0, length);
    }
  }

  function randomRoute(runId, gen, cb) {
    $.ajax({
      method: 'POST',
      url: baseUrl + '/routes',
      data: JSON.stringify({region ,runId, gen}),
      success: (newRoute) => {displayRoute(newRoute), cb(null, newRoute)},
      error: (jqXHR, textStatus, errorThrown) => {
        console.error('Error getting random route: ', textStatus, ', Details: ', errorThrown);
        console.error('Response: ', jqXHR.responseText);
        alert('An error occurred when creating a random route:\n' + jqXHR.responseText);
        cb(errorThrown);
      }
    })
  }

  function runGeneration(generation, cb) {
    const popSize = parseInt($("#population-size-text-field").val());
    console.log(`Running generation ${generation}`);

    async.waterfall(
      [
        wait5seconds,
        updateGenerationHTMLcomponents,
        async.constant(generation), // Insert generation into the pipeline
        (gen, log_cb) => logValue("generation", gen, log_cb), // log generation
        getBestRoutes, // These will be passed on as the parents in the next steps
        (parents, log_cb) => logValue("parents", parents, log_cb), // log parents
        displayBestRoutes,    // display the parents on the web page
        updateThresholdLimit, // update the threshold limit to reduce DB writes
        generateChildren,
        (children, log_cb) => logValue("children", children, log_cb),
        displayChildren,      // display the children in the "Current generation" div
        updateBestRoute
      ],
      cb
    );

    function logValue(label, value, log_cb) {
      console.log(`In waterfall: ${label} = ${JSON.stringify(value)}`);
      if(label == "parents" || label == "children") {
        console.log(`${label} length is ${value.length}`);
      }
      log_cb(null, value);
    }


    function wait5seconds(wait_cb) {
      console.log(`Starting sleep at ${Date.now()}`);
      setTimeout(function () {
        console.log(`Done sleeping gen ${generation} at ${Date.now()}`);
        wait_cb(); // Call wait_cb() after the message to "move on" through the waterfall
      }, 5000);
    }

    function updateGenerationHTMLcomponents(reset_cb) {
      $("#new-route-list").text("");
      $("#current-generation").text(generation + 1);
      reset_cb();
    }

    function generateChildren(parents, genChildren_cb) {
      const numChildren = Math.floor(popSize / parents.length);

      async.concat( // each(
        parents,
        (parent, makeChildren_cb) => {
          makeChildren(parent.routeId, numChildren, makeChildren_cb);
        },
        genChildren_cb
      );
    }

    function updateThresholdLimit(bestRoutes, utl_cb) {
      if (bestRoutes.length == 0) {
        const errorMessage = 'We got no best routes back. We probably overwhelmed the write capacity for the database.';
        alert(errorMessage);
        throw new Error(errorMessage);
      }

      lengthStoreThreshold = bestRoutes[bestRoutes.length - 1].len;
      $("#current-threshold").text(lengthStoreThreshold);
      utl_cb(null, bestRoutes);
    }
  }

  function getBestRoutes(gen, callback) {
    const amount = $('#num-parents').val();
    const queryString = $.param({ runId, gen, amount })
    $.ajax({
        method: 'GET',
        url: baseUrl + '/best?' + queryString,
        success: (bestRoutes) => callback(null, bestRoutes),
        error: function ajaxError(jqXHR, textStatus, errorThrown) {
            console.error('Error getting best routes: ', textStatus, ', Details: ', errorThrown);
            console.error('Response: ', jqXHR.responseText);
            alert('An error occurred when creating a random route:\n' + jqXHR.responseText);
            // callback(errorThrown);
        }
    })
  }


  function makeChildren(routeId, numChildren, cb) {
    $.ajax({
      method: 'POST',
      url: baseUrl + '/mutate-route',
      data: JSON.stringify({region, routeId, numChildren, lengthStoreThreshold}),
      success: children => cb(null, children),
      error: function ajaxError(jqXHR, textStatus, errorThrown) {
        console.error('Error making children: ', textStatus, ', Details: ', errorThrown);
        console.error('Response: ', jqXHR.responseText);
        cb(errorThrown);
      }
    })
  }


  function getRouteById(routeId, callback) {
    $.ajax({
      method: 'GET',
      url: baseUrl + `/routes/${routeId}`,
      success: callback,
      error: function ajaxError(jqXHR, textStatus, errorThrown) {
        console.error('Error getting route by id: ', textStatus, ', Details: ', errorThrown);
        console.error('Response: ', jqXHR.responseText);
        alert('An error occurred when getting route by id:\n' + jqXHR.responseText);
      }
    })
  }

  function fetchCityData(callback) {
    $.ajax({
      method: 'GET',
      url: baseUrl + `/city-data?region=${region}`,
      success: callback,
      error: function ajaxError(jqXHR, textStatus, errorThrown) {
        console.error('Error fetching city data: ', textStatus, ', Details: ', errorThrown);
        console.error('Response: ', jqXHR.responseText);
        alert('An error occurred when fetching city data:\n' + jqXHR.responseText);
      }
    })
  }

 
  function displayBestPath() {
    $("#best-length").text(best.len);
    $("#best-path").text(JSON.stringify(best.bestPath));
    $("#best-routeId").text(best.routeId);
    $("#best-route-cities").text("");
    best.bestPath.forEach((index) => {
      const cityName = cityData[index].properties.name;
      $("#best-route-cities").append(`<li>${cityName}</li>`);
    });
  }

 
  function displayChildren(children, dc_cb) {
    children.forEach(child => displayRoute(child));
    dc_cb(null, children);
  }


  function displayRoute(childRoute) {
    $('#new-route-list').append(`<li>Length: ${childRoute.len} for Child Route: ${childRoute.routeId}</li>`);
  }

 
  function displayBestRoutes(bestRoutes, dbp_cb) {
    $('#best-route-list').text("");
    bestRoutes.forEach(route => {
      $('#best-route-list').append(`<li>Length: ${route.len} for Route Id: ${route.routeId}</li>`);
    });
    dbp_cb(null, bestRoutes);
  }


  function updateBestRoute(children, ubr_cb) {
    children.forEach(child => {
      if (child.len < best.len) {
        updateBest(child.routeId);
      }
    });
    ubr_cb(null, children);
  }

  function updateBest(routeId) {
    getRouteById(routeId, processNewRoute);

    function processNewRoute(route) {
  
      if (best.len > route.len && route == "") {
        console.log(`Getting route ${routeId} failed; trying again.`);
        updateBest(routeId);
        return;
      }
      if (best.len > route.len) {
        console.log(`Updating Best Route for ${JSON.stringify(route)}`);
        best.routeId = routeId;
        best.len = route.len;
        best.bestPath = route.route;
        displayBestPath(); // Display the best route on the HTML page
        best.bestPath[route.route.length] = route.route[0]; // Loop Back
        updateMapCoordinates(best.bestPath);
        mapCurrentBestRoute();
      }
    }
  }

  function mapCurrentBestRoute() {
    var lineStyle = {
      dashArray: [10, 20],
      weight: 5,
      color: "#0000FF",
    };

    var fillStyle = {
      weight: 5,
      color: "#FFFFFF",
    };

    if (best.lRoute[0].length == 0) {
      // Initialize first time around
      best.lRoute[0] = L.polyline(best.coords, fillStyle).addTo(myMap);
      best.lRoute[1] = L.polyline(best.coords, lineStyle).addTo(myMap);
    } else {
      best.lRoute[0] = best.lRoute[0].setLatLngs(best.coords);
      best.lRoute[1] = best.lRoute[1].setLatLngs(best.coords);
    }
  }

  function initializeMap(cities) {
    cityData = [];
    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];
      const cityName = city.cityName;
      var geojsonFeature = {
        type: "Feature",
        properties: {
          name: "",
          show_on_map: true,
          popupContent: "CITY",
        },
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      };
      geojsonFeature.properties.name = cityName;
      geojsonFeature.properties.popupContent = cityName;
      geojsonFeature.geometry.coordinates = swap(city.location);
      cityData[i] = geojsonFeature;
    }

    var layerProcessing = {
      pointToLayer: circleConvert,
      onEachFeature: onEachFeature,
    };

    myMap.fitBounds(cities.map(city => city.location));

    L.geoJSON(cityData, layerProcessing).addTo(myMap);

    function onEachFeature(feature, layer) {
      if (feature.properties && feature.properties.popupContent) {
        layer.bindPopup(feature.properties.popupContent);
      }
    }

    function circleConvert(feature, latlng) {
      return new L.CircleMarker(latlng, { radius: 5, color: "#FF0000" });
    }
  }

  function swap(arr) {
    return [arr[1], arr[0]];
  }

  function updateMapCoordinates(path) {
    for (var i = 0; i < path.length; i++) {
      best.coords[i] = swap(cityData[path[i]].geometry.coordinates);
    }
    best.coords[i] = best.coords[0]; // End where we started
  }

  function submitCustomCities() {
    initializeMap(customCities);
    var cities = cityData.map((data,index) => { return( {index, cityName: data.properties.name} )});
    var points = cityData.map(data => { return( {coordinates: data.geometry.coordinates} )});

    $.ajax({
      method: 'POST',
      url: baseUrl + '/city-data',
      data: JSON.stringify({cities, points}),
      success: (data) => {region = data.region, $("#run-evolution").prop('disabled', false)},
      error: (jqXHR, textStatus, errorThrown) => {
        console.error('Error posting custom routes: ', textStatus, ', Details: ', errorThrown);
        console.error('Response: ', jqXHR.responseText);
        alert('An error occurred when posting custom routes:\n' + jqXHR.responseText);
      }
    })
    
  }


  function onGeocoderResult(e) {

    var nameArray = e.result.place_name.split(",");
    const cityName = nameArray[0] + " " + getStateCode(nameArray[1].trim());
    const location = swap(e.result.geometry.coordinates);

    customCities.push({ cityName, location });
    $("#cities-list").append(`<li>${cityName}</li>`)
    myMap.flyTo(location, 6);
    if (customCities.length > 1 && customCities.length <= 10 ) {
      $("#submit-custom-cities").prop('disabled', false);
      $("#warning").text("");
    } else {
      $("#submit-custom-cities").prop('disabled', true);
      $("#warning").text("Use 2 to 10 cities");
    }
  }


  function useGeocoder() {
    $("#cities-option").hide();
    $("#cities-list").text(""); 

    var geocoder = new MapboxGeocoder({
      accessToken: "pk.eyJ1IjoidXRzMDA3IiwiYSI6ImNrbmUxeXQ3bzJjd2wybm4xbGphaWh4bXYifQ.RC2c1ZAAdwHBSgGyLRCcDg",
      countries: "us",
      types: "place"
    });

    geocoder.addTo("#geocoder");
    geocoder.on('result', (e) => onGeocoderResult(e));
    geocoder.on('clear', () => $('#result').text(""));

    $("#geo-controls").show();
  }

  function runDefaultSetup() {
    $("#cities-option").hide();
    fetchCityData(initializeMap);
    $("#run-evolution").prop('disabled', false).click(runEvolution);
  }

  $(function onDocReady() {
    $("#population-size-text-field").val(100);
    $("#num-parents").val(20);
    $("#num-generations").val(20);
    $("#run-default-setup").click(runDefaultSetup);
    $("#use-geocoder").click(useGeocoder);
    $("#submit-custom-cities").click(submitCustomCities);
    $("#run-evolution").click(runEvolution);
  });
})(jQuery);