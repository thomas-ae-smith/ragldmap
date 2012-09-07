// inject the required css to the host page
$('head').append('<link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.4.3/leaflet.css" /> ' +
	'<!--[if lte IE 8]>' +
	'<link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.4.3/leaflet.ie.css" />' +
	'<![endif]-->');
// load and execute the vanilla leaflet script
$.getScript("http://cdn.leafletjs.com/leaflet-0.4.3/leaflet.js", function() {
// pass JQuery into the $ variable for convenience
(function( root, $ ){
	var methods = {
		initMap : function( options ) {

			var settings = $.extend( {
				'geo-location'			: true,
				'APIkey'				: '285675b50972436798d67ce55ab7ddde'
			}, options);


			return this.each(function() {
				//at the moment the plugin calls getscript again before each creation - hacky solution to async
				var this_ = this;	//sadly necessary due to above
				$.getScript("http://cdn.leafletjs.com/leaflet-0.4.3/leaflet.js", function(){
					var map = L.map( this_, settings);
					L.tileLayer('http://{s}.tile.cloudmade.com/' + settings.APIkey + '/997/256/{z}/{x}/{y}.png', {
						attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
						maxZoom: 18
					}).addTo(map);

					if (settings.source) {
						methods.setSource(map, settings.source);
					}

					try {
						navigator.geolocation.getCurrentPosition( function(position) {
							console.log("Current Geolocation:" + position);
							map.setView([position.coords.latitude, position.coords.longitude], 13);
							L.marker([position.coords.latitude, position.coords.longitude]).addTo(map)
							.bindPopup('Current<br>geo-location.').openPopup();
						})
					} catch (error) {
						console.log("Geolocation failed, set to default position.");
						map.setView([50.936592, -1.398697], 13);
					}
				});	//getscript
			});	//each
		},	//initMap

		setSource : function(map, source ) {
			console.log("Setting source to " + source);
			try {
				$.getJSON(source, function(data) {
					console.log("Data retrieved:" + data);
					console.log(data);
					var label = "", lat = "", lng = "", invalid = 0;
					$.each(data, function(key, value) {
						try {
							lat = value['http://www.w3.org/2003/01/geo/wgs84_pos#lat'][0].value;
							lng = value['http://www.w3.org/2003/01/geo/wgs84_pos#long'][0].value;
							label = (value['http://www.w3.org/2000/01/rdf-schema#label'])? value['http://www.w3.org/2000/01/rdf-schema#label'][0].value : key.slice(key.lastIndexOf("/", key.lastIndexOf("/")-1));
							L.marker([lat, lng]).addTo(map).bindPopup("<a href=\"" + key + "\">" + label + "<\a>");
						} catch (error) {
							invalid += 1;
						}
					});
					
					if (invalid) {
						$('<div class="text-warning">Found ' + invalid + " unusable items.</div>").insertAfter('.map');
					}

				});
			} catch (error) {
				console.log("Loading JSON failed:" + error);
			}
		}	//setSource
	};

	$.fn.RAGLDmap = function( method ) {

		// if a method is specified and valid, call that
		if ( methods[method] ) {
			return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {	//else if no method named, call init
			console.log("default"+this);
			return methods.initMap.apply( this, arguments );
		} else {												//otherwise, complain.
			$.error( 'Method ' +  method + ' does not exist on jQuery.RAGLDmap' );
		}

	};

})( this, jQuery );
});