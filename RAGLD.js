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



// inject the required css to the host page
$('head').append('<link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.4.3/leaflet.css" /> ' +
	'<!--[if lte IE 8]>' +
	'<link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.4.3/leaflet.ie.css" />' +
	'<![endif]-->');

var root = this;

// load and execute the vanilla leaflet script
$.getScript("http://cdn.leafletjs.com/leaflet-0.4.3/leaflet.js", function() {
// pass JQuery into the $ variable for convenience
(function( root, $ ){
	var methods = {};
	var RAGLDsources = [];
	var RAGLDmaps = [];
	var markers = (function() {
		var markers = {};
		markers.colours = ['blue', 'green', 'red', 'yellow', 'purple'];
		markers.auto = 0;
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
		$.each(markers.colours, function(index, value) {
			markers[value] = new RAGLDMarker({iconUrl: 'assets/images/marker-icon-' + value + '.png'});
		})
		return markers;
	})();

	function Map(id, options) {

		// set defaults
		var settings = $.extend( {
			'geoLocation'			: false,
			'cloudMade'				: false,
			'center'				: [50.936592, -1.398697],
			'zoom'					: 13,

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

		map = L.map( id, settings);		//L.map() creates a new object. 
		this.prototype = L.Map.prototype;
		
		RAGLDmaps.push(map);

		map.mapSources = [];

		this.prototype.addSource = function (sourceURI) {
			var map = this;
			$.when(methods.dataSource(sourceURI)).then( function(newSource) {
				console.log("Data received:", newSource.data);
				var label = "", lat = "", lng = "", invalid = 0;
				console.log("Colour is " + newSource.colour + " and marker is ", markers[newSource.colour]); //TODO use of newSource is confusing with source
				$.each(newSource.data, function(key, value) {
					try {
						lat = value['http://www.w3.org/2003/01/geo/wgs84_pos#lat'][0].value;
						lng = value['http://www.w3.org/2003/01/geo/wgs84_pos#long'][0].value;
						label = (value['http://www.w3.org/2000/01/rdf-schema#label'])? value['http://www.w3.org/2000/01/rdf-schema#label'][0].value : key.slice(key.lastIndexOf("/", key.lastIndexOf("/")-1));
							// console.log("Setting marker for " + label + " at [" + lat + "," + lng + "].");
							L.marker([lat, lng], {icon: markers[newSource.colour]}).addTo(map).bindPopup("<a href=\"" + key + "\">" + label + "<\a>");
						} catch (error) {
							invalid += 1;
						}
					});

				if (invalid) {
					$('<div class="warning"><p class="text-warning">Warning: Found ' + invalid + " unusable items.</p></div>").insertAfter('.map');
				}
			});

		};
		this.prototype.clearSources = function () {

		};


		L.tileLayer( settings.tileString, {
			attribution: settings.attribution,
		}).addTo(map);


		if ('source' in settings) {
			methods.showNewPoints(map, settings.source);
		}

		if ('sources' in settings) {
			console.log("sources", settings.sources);
			$.each(settings.sources, function(index, value) {
				// methods.showNewPoints(map, value)
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
	}

	this.map = function (id, options) {
		return Map(id, options);
	};

	console.log("GotScript. This is ", this, " root is ", root);
	console.log("markers are ", markers);

	$.fn.RAGLD = function( method ) {

		// if a method is specified and valid, call that
		if ( methods[method] ) {
			return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {	//else if no method named, call init
			return methods.createMap.apply( this, arguments );
		} else {												//otherwise, complain.
			$.error( 'Method ' +  method + ' does not exist on jQuery.RAGLD' );
		};
	};

	methods = {
		createMap : function( options ) {
			map = map( this[0], options);
			return;
		},	//createMap

		dataSource : function( sourceURI, colour ) {
			var deferred = $.Deferred();

			var newSource = {};
			newSource.source = sourceURI;

			newSource.colour = (function(colour) {
				if ($.inArray(colour, markers.colours) >= 0) {
					return colour;
				}
				//TODO: candidate for map reduce, but not familar enough with it yet
				//this works for the moment, sorta.
				markers.auto += 1;
				return markers.colours[markers.auto-1];
			})(colour);
			console.log("Adding " + newSource.colour + " source data from " + sourceURI);

			try {
				$.getJSON(sourceURI, function(data) {
					console.log("Data retrieved:", data);
					newSource.data = data;
					RAGLDsources.push(newSource);
					deferred.resolve(newSource);
				});
			} catch (error) {
				console.log("Loading JSON failed:" + error);
				deferred.reject(error);
			}

			return deferred.promise();
		},	//dataSource

		showNewPoints : function( map, sourceURI ) {
			console.log("Map is ", map);
			$.when(methods.dataSource(sourceURI)).then( function(newSource) {
				console.log("Data received:", newSource.data);
				var label = "", lat = "", lng = "", invalid = 0;
				console.log("Colour is " + newSource.colour + " and marker is ", markers[newSource.colour]); //TODO use of newSource is confusing with source
				$.each(newSource.data, function(key, value) {
					try {
						lat = value['http://www.w3.org/2003/01/geo/wgs84_pos#lat'][0].value;
						lng = value['http://www.w3.org/2003/01/geo/wgs84_pos#long'][0].value;
						label = (value['http://www.w3.org/2000/01/rdf-schema#label'])? value['http://www.w3.org/2000/01/rdf-schema#label'][0].value : key.slice(key.lastIndexOf("/", key.lastIndexOf("/")-1));
							// console.log("Setting marker for " + label + " at [" + lat + "," + lng + "].");
							L.marker([lat, lng], {icon: markers[newSource.colour]}).addTo(map).bindPopup("<a href=\"" + key + "\">" + label + "<\a>");
						} catch (error) {
							invalid += 1;
						}
					});

				if (invalid) {
					$('<div class="warning"><p class="text-warning">Warning: Found ' + invalid + " unusable items.</p></div>").insertAfter('.map');
				}
			});

		}	//showPoints
	};

})( root, jQuery );
});
