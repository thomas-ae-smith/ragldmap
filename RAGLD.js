//
//
//  Rapid Assembly of Geo-centred Linked Data applications (RAGLD)
//
//  A toolkit to help support application developers utilise geographic
//  information. See http://www.ragld.com/ for further information
//
//  Javascript library providing mapping support and visualisation components.
//
//

// pass JQuery into the $ variable for convenience
(function (window, $, undefined) {

	var RAGLD, RAGLD_orig;

	if (typeof exports !== undefined + '') {
		RAGLD = exports;
	} else {
		RAGLD_orig = window.RAGLD;
		RAGLD = {};

		RAGLD.noConflict = function () {
			window.RAGLD = RAGLD_orig;
			return this;
		};

		window.RAGLD = RAGLD;
	}

	RAGLD.version = '0.1';

	// load and execute the vanilla leaflet script. 
	var LeafletLoaded = $.Deferred(function( defer ) {
		$.getScript( "http://cdn.leafletjs.com/leaflet-0.4.3/leaflet.js" ).then( defer.resolve, defer.reject );
	}).promise();


	// inject the required css to the host page
	$('head').append('<link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.4.3/leaflet.css" /> ' +
		'<!--[if lte IE 8]>' +
		'<link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.4.3/leaflet.ie.css" />' +
		'<![endif]-->');

	var methods = {};
	var RAGLDsources = [];
	var RAGLDmaps = [];
	var RAGLDmarkers = {'colours' : ['blue', 'green', 'red', 'yellow', 'purple'], 'auto' : 0};
	LeafletLoaded.done( function () {
		console.log("Making Markers");
		var RAGLDMarker = L.Icon.extend({
			options: {
				shadowUrl: 'assets/images/marker-shadow.png',
				iconSize:		[25, 41],
				shadowSize:		[41, 41],
				iconAnchor:		[13, 41],
				// shadowAnchor:	[4, 62],
				popupAnchor:	[0, -33]
			}
		});
		$.each(RAGLDmarkers.colours, function(index, value) {
			RAGLDmarkers[value] = new RAGLDMarker({iconUrl: 'assets/images/marker-icon-' + value + '.png'});
		})
	});

	function MapSource(anySource) {
		if (anySource instanceof MapSource) {
			console.log(anysource, "is already a mapsource")
			return anySource;
		}

		var deferred = $.Deferred();
		var mapSource =  L.featureGroup();
		mapSource.loaded = deferred.promise()
		mapSource.invalid = 0;
		mapSource.dataSource = RAGLD.dataSource(anySource); 	//TODO: don't like using RAGLD specifier internally
		mapSource.getLabel = function () {
			return this.dataSource.label;
		}

		$.when(mapSource.dataSource.loaded).then(function (dataSource) {
			console.log("Data received:", dataSource.data);
			var label = "", lat = "", lng = "", marker = {};
			console.log("Colour is " + dataSource.colour + " and marker is ", RAGLDmarkers[dataSource.colour]);
			$.each(dataSource.data, function(key, value) {
				try {
					lat = value['http://www.w3.org/2003/01/geo/wgs84_pos#lat'][0].value;
					lng = value['http://www.w3.org/2003/01/geo/wgs84_pos#long'][0].value;
					label = (value['http://www.w3.org/2000/01/rdf-schema#label'])? value['http://www.w3.org/2000/01/rdf-schema#label'][0].value : key.slice(key.lastIndexOf("/", key.lastIndexOf("/")-1));
					// console.log("Setting marker for " + label + " at [" + lat + "," + lng + "].");
					marker = L.marker([lat, lng], {icon: RAGLDmarkers[dataSource.colour]})
					marker.bindPopup("<a href=\"" + key + "\">" + label + "<\a>");
					mapSource.addLayer(marker);
				} catch (error) {
					mapSource.invalid += 1;
				}
			});

			if (mapSource.invalid) {
				$('<div class="warning"><p class="text-warning">Warning: Found ' + mapSource.invalid + " unusable items.</p></div>").insertAfter('.map');
			}

			deferred.resolve(mapSource);
		},
		function (error) {
			deferred.reject(error);
		});
		return mapSource;
	}

	function Map(id, options) {

		// set defaults
		var settings = $.extend( {
			'geoLocation'			: false,
			'cloudMade'				: false,
			'center'				: [50.936592, -1.398697],
			'zoom'					: 13,
			'onAddSource'			: 'zoomAll',

			'APIkey'				: '285675b50972436798d67ce55ab7ddde'	//TODO: remove. Included for testing purposes
		}, options);

		if (settings['cloudMade'] && 'APIkey' in settings) {
			settings = $.extend( {
					'tileString'		: 'http://{s}.tile.cloudmade.com/' + settings.APIkey + '/997/256/{z}/{x}/{y}.png',	//TODO: don't clobber map styles
					'attribution'		: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>'
				}, settings);
		} else {
			settings = $.extend( {
				'tileString'		: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
				'attribution'		: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a>'
			}, settings);
		}

		LeafletLoaded.done( function () {

			map = L.map( id, settings);		//L.map() creates a new object. 
			this.prototype = L.Map.prototype;

			RAGLDmaps.push(map);

			map.mapSources = {};

			this.prototype.addSource = function (anySource, lookAt) {	// anySource could be a MapSource, DataSource or URI string
				var map = this;

				// console.log("addsource.anysource is", anySource);
				var mapSource = MapSource(anySource);

				$.when(mapSource.loaded).then( function (mapSource) {
					console.log("Loaded mapSource ", mapSource.getLabel());
					if (!map.mapSources[mapSource.getLabel()]) {
						map.mapSources[mapSource.getLabel()] = mapSource;
						mapSource.addTo(map);
						map.layerControl.addOverlay(mapSource, mapSource.getLabel());


						console.log("settings:" , settings);
						if (lookAt || settings.onAddSource === "zoom") {
							map.zoomToSource(mapSource);
						} else if (settings.onAddSource === "zoomAll") {
							map.zoomToAllSources();
						}
					} else {
						console.log("MapSource" , mapSource.getLabel() , "already exists on this map." );
					}
				});


			};

			this.prototype.clearSources = function () {
				var map = this;
				$.each(map.mapSources, function(mapSource) {
					map.removeLayer(mapSource);
				});
				map.mapSources.length = 0; // forget about the existing contents.
			};

			this.prototype.removeSource = function () {
				//TODO
			}

			this.prototype.zoomToSource = function (mapSource) {
				var map = this;
				map.fitBounds(mapSource.getBounds());
			}

			this.prototype.zoomToAllSources = function () {
				console.log("zooming to all sources");
				var map = this;
				var bounds = new L.LatLngBounds();
					$.each(map.mapSources, function (key, value) {
						console.log("This layer: " + key);
						bounds.extend(value.getBounds());
					});
				map.fitBounds(bounds);
			}


			map.layerControl = L.control.layers().addTo(map).addBaseLayer(									//create and add a layer control
				L.tileLayer( settings.tileString, {										//create the base map layer
					attribution: settings.attribution,									//with attribution
				}).addTo(map), 															//add it to the map
				(settings['cloudMade'] && 'APIkey' in settings)? "CloudMade" : "OSM"	//label for the base layer
			);


			if ('source' in settings) {
				map.addSource(settings.source);
			}

			if ('sources' in settings) {
				console.log("sources", settings.sources);
				$.each(settings.sources, function(index, value) {
					// methods.showNewPoints(map, value)
					console.log("about to add", value);
					map.addSource(value);
				});
			}

			if (settings['geoLocation']) {
				try {
					navigator.geolocation.getCurrentPosition( function(position) {
						console.log("Current Geolocation:" + position);
						map.setView([position.coords.latitude, position.coords.longitude], settings.zoom);
						L.marker([position.coords.latitude, position.coords.longitude]).addTo(map)
						.bindPopup('Current<br>geo-location.').openPopup();
					})
				} catch (error) {
					console.log("Geolocation failed, remained at default position.");	//TODO: sensible defaults. maybe
				}
			} //if geoLocation

			return map;

		});
	}

	RAGLD.map = function (id, options) {
		return Map(id, options);
	};

	function DataSource(sourceURI, label, colour) {		//TODO: ensure that this could also accept a DataSource or other non-string
		//TODO: pre-existence checking
		var deferred = $.Deferred();
		var dataSource = this;
		dataSource.loaded = deferred.promise()

		dataSource.sourceURI = sourceURI;
		dataSource.label = label || ((sourceURI.indexOf("http://") == 0)? sourceURI.substr(7, 32)  + "..." : sourceURI.substr(0,35)); //TODO: ellipsis should only be added if actually truncated

		console.log("Label:" + dataSource.label);

		dataSource.colour = (function(colour) {
			if ($.inArray(colour, RAGLDmarkers.colours) >= 0) {
				return colour;
			}
			//TODO: candidate for map reduce, but not familar enough with it yet
			//this works for the moment, sorta.
			RAGLDmarkers.auto += 1;		//TODO loop around and use 
			return RAGLDmarkers.colours[RAGLDmarkers.auto-1];
		})(colour);
		console.log("Adding " + dataSource.colour + " source data from " , dataSource.sourceURI);

		try {
			$.getJSON(sourceURI, function(data) {
				console.log("Data retrieved:", data);
				dataSource.data = data;
				RAGLDsources.push(dataSource);
				deferred.resolve(dataSource);
			});
		} catch (error) {
			console.log("Loading JSON failed:" + error);
			deferred.reject(error);
		}

		return dataSource;
	};	//DataSource

	RAGLD.dataSource = function (anySource, colour) {
		if (anySource instanceof DataSource) {
			console.log(anySource, "is already a dataSource.");
			return anySource;		//TODO: setColour?
		}
		return new DataSource(anySource, colour);
	};

})( this, jQuery );
