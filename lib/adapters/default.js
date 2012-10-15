var fs = require("fs");
var watch = require("watch");

var loadConfigObject = function(path)
{
	if (!fs.existsSync(path)) {
		console.log("Unable to find config file: " + path);
		return;
	}
	
	var data = fs.readFileSync(path);
	
	var object = null;
	try 
	{
		object = JSON.parse(data);
	}
	catch (err) 
	{
	    console.log("There has been an error parsing JSON for file: " + path)
	    console.log(err);
	}	
	
	return object;
};

var loadGadgets = function(path)
{
	var gadgets = {};
	
	if (!fs.existsSync(path)) {
		console.log("Unable to find gadgets directory: " + path);
		return;
	}
		
	// read all files under this path
	var filenames1 = fs.readdirSync(path);
	for (var i = 0; i < filenames1.length; i++)
	{
		var path1 = path + "/" + filenames1[i];
		
		var stats1 = fs.statSync(path1);
		if (stats1.isDirectory())
		{
			// the name of the file is the "gadget type"
			var gadgetType = filenames1[i];
			
			var filenames2 = fs.readdirSync(path1);
			for (var j = 0; j < filenames2.length; j++)
			{
				var path2 = path1 + "/" + filenames2[j];
				
				var stats2 = fs.statSync(path2);
				if (stats2.isFile())
				{
					var z = filenames2[j].indexOf(".json");
					if (z > -1)
					{
						var gadgetId = filenames2[j].substring(0, z);

						var gadget = loadConfigObject(path2);
						
						gadgets[gadgetType + "_" + gadgetId] = gadget;
						
						//console.log(" -> Registered gadget, type: " + gadgetType + ", id: " + gadgetId);
					}
				}
			}			
		}
	}
	
	//console.log(" -> Load gadgets completed");
	
	return gadgets;
};

/**
 * Loads page and gadget binding information.
 *
 * @param app
 * @return {Object}
 */
exports.init = function(app, callback)
{
	// look for the /config/ directory
	// load
	//    /config/pages.json
	//    /config/templates.json
	//    /config/views.json
	//
	// then parse views.json and load all gadgets from /config/gadgets/<gadgetType>/<gadgetId>.json

	var loadContext = function()
	{
		var context = {};
	
		context.application = loadConfigObject("./config/application.json");
		if (!context.application)
		{
			context.application = {};
			context.application.title = "Application Title";
			context.application.description = "Application Description";
		}

		context.pages = loadConfigObject("./config/pages.json");
		if (!context.pages)
		{
			context.pages = {};
		}	

		context.templates = loadConfigObject("./config/templates.json");
		if (!context.templates)
		{
			context.templates = {};
		}
	
		context.views = loadConfigObject("./config/views.json");	
		if (!context.views)
		{
			context.views = {};
		}
	
		// load all gadget definitions
		context.gadgets = loadGadgets("./config/gadgets");
		if (!context.gadgets)
		{
			context.gadgets = {};
		}
		
		return context;
	};
	
	var context = loadContext();

	// parse all views
	var store = wrapAsStore(context);
	callback.call(this, store);
	
	// watch all changes anywhere in "./config"
	// when changes occur, reload context
	(function(store) {
		
		watch.watchTree("./config", function(f, curr, prev) {

			var t1 = new Date().getTime();
			
			// reload context
			store.reloadContext(loadContext());
			
			var t2 = new Date().getTime();
			
			console.log("Reloaded context in: " + (t2-t1) + " ms");

		});
		
	})(store);
		
};

var merge = function(source, target)
{
	for (var k in source)
	{
		if (source[k].push)
		{
			if (!target[k])
			{
				target[k] = [];
			}
			
			// merge array
			for (var x = 0; x < source[k].length; x++)
			{
				target[k].push(source[k][x]);
			}
		}
		else if ((typeof source[k]) == "object")
		{
			if (!target[k])
			{
				target[k] = {};
			}
			
			// merge keys/values
			merge(source[k], target[k]);
		}
		else
		{
			// overwrite a scalar
			target[k] = source[k];				
		}
	}
};

var compileView = function(context, viewKey)
{
	var obj = {};
	
	var viewObj = context.views[viewKey];
	if (viewObj["extends"])
	{
		var parentObj = compileView(context, viewObj["extends"]);
		merge(parentObj, obj);
	}
	
	// copy ourselves in
	merge(viewObj, obj);

    // remove the "extends" property
    delete obj["extends"];
	
	return obj;
};

var wrapAsStore = function(context)
{
	console.log("Configuration Store");
		
	// compile the views
//	console.log(" -> Compiling views");
	context.compiledViews = {};	
	for (var viewKey in context.views)
	{
		context.compiledViews[viewKey] = compileView(context, viewKey);
	}
//	console.log(" -> View compilation completed");
	
	// store page count
	context.pageCount = 0;
	for (var pageKey in context.pages)
	{
		context.pageCount++;
	}
	console.log(" -> Page count: " + context.pageCount);
	
	// store template count
	context.templateCount = 0;
	for (var templateKey in context.templates)
	{
		context.templateCount++;
	}	
	console.log(" -> Template count: " + context.pageCount);
		
	// view count
	context.viewCount = 0;
	for (var viewKey in context.views)
	{
		context.viewCount++;
	}
	console.log(" -> View count: " + context.viewCount);
	
	// compiled view count
	context.compiledViewCount = 0;
	for (var viewKey in context.compiledViews)
	{
		context.compiledViewCount++;
	}
	console.log(" -> Compiled view count: " + context.compiledViewCount);
	
	// gadget count
	context.gadgetCount = 0;
	for (var gadgetKey in context.gadgets)
	{
		context.gadgetCount++;
	}
	console.log(" -> Gadget count: " + context.gadgetCount);


	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////////////


    var createPageConfig = function(pageKey, page, callback)
    {
        var self = this;

        var config = {};

		// application
		config.application = context.application;
		
		// page
		config.pageKey = pageKey;
		config.page = page;
		config.page.key = pageKey;
		
		// view (for this page)
		config.view = context.compiledViews[config.page.view];
		
		// template (for this view)
		for (var templateKey in context.templates)
		{
			if (templateKey == config.view.template)
			{
				config.template = context.templates[templateKey];
				config.template.key = templateKey;
				config.templateKey = templateKey;
				break;
			}			
		}
		
		var bindRegion = function(config, regionObj, order)
		{
			var gadgetType = regionObj.type;
			var gadgetId = regionObj.id;
			
			// default value for gadget id is gadget type (simple mode)
			if (!gadgetId)
			{
				gadgetId = gadgetType;
			}

			config.bindings[gadgetType + "_" + gadgetId] = {
				"type": gadgetType,
				"id": gadgetId,
				"order": order
			};

			// copy in gadget info
			config.gadgets[gadgetType + "_" + gadgetId] = context.gadgets[gadgetType + "_" + gadgetId];
			config.gadgets[gadgetType + "_" + gadgetId].gadgetType = gadgetType;
			config.gadgets[gadgetType + "_" + gadgetId].gadgetId = gadgetId;							
		};
		
		// bindings and gadget configurations
		config.bindings = {};
		config.gadgets = {};
		for (var regionName in config.view.regions)
		{
			var order = 1;
			
			var regionObjectOrArray = config.view.regions[regionName];
			if (regionObjectOrArray.push)
			{
				for (var i = 0; i < regionObjectOrArray.length; i++)
				{
					bindRegion(config, regionObjectOrArray[i], order);
					order++;
				}
			}
			else
			{
				bindRegion(config, regionObjectOrArray, order);
			}
		}

		callback.call(self, config);
	};
	
    return {

        /**
         * Loads a page configuration for a given uri.
         *
         * @param uriOrKey
         * @param callback
         */
        loadPage: function(uriOrKey, callback)
        {
            var self = this;

			var found = null;
			var foundPageKey = null;
			
			for (var pageKey in context.pages)
			{
				var page = context.pages[pageKey];
				
				// check for uri match
				// page uris can have wildcards or {value} tokens in them
				// we convert the page uri to a regex
				var regex = page.uri;
				var i = 0;
				var j = -1;
				var k = -1;
				while (i < regex.length)
				{
					if (regex[i] == "{")
					{
						j = i;
					}
					
					if (regex[i] == "}")
					{
						k = i;
						regex = regex.substring(0, j) + "(.*)" + regex.substring(k+1);
						j = -1;
						k = -1;
						i = 0;
					}
					
					i++;
				}
				regex += "$";
				
				var pattern = new RegExp(regex);
				var matches = uriOrKey.match(pattern);				
				if (pageKey == uriOrKey || (matches && matches.length > 0))
				{
					found = page;
					foundPageKey = pageKey;
					break;
				}
			}
			
			// if no page, the error out?
			if (!found)
			{
				console.log("No page found for uriOrKey: " + uriOrKey);
			}
			
			createPageConfig.call(self, foundPageKey, found, function(config) {
				callback.call(self, config);
			});
			
        },


        /**
         * Loads all page configurations
         *
         * @param callback
         */
        loadPages: function(callback)
        {
            var self = this;

            var configs = {};

			// if no pages then just bail
			var pageCount = context.pageCount;
			if (pageCount == 0)
			{
				callback.call(self, configs);
				return;
			}
			
			for (var pageKey in context.pages)
			{
                createPageConfig.call(self, pageKey, context.pages[pageKey], function(config) {
                    configs[pageKey] = config;
                    pageCount--;

                    if (pageCount == 0)
                    {
                        callback.call(self, configs);
                    }
                });
            };
        },

        loadGadget: function(gadgetType, gadgetId, callback)
        {
			var gadget = context.gadgets[gadgetType + "_" + gadgetId];
			if (!gadget)
			{
				console.log("Unable to find gadget, type: " + gadgetType + ", id: " + gadgetId);
			}

			callback.call(this, gadget);
        },

		loadApplication: function(callback)
		{
			callback.call(this, context.application);
		},
		
		reloadContext: function(newContext)
		{
			for (var key in newContext)
			{
				context[key] = newContext[key];
			}
		}
    };
};
