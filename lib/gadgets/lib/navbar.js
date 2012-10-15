exports.init = function(registry)
{
	// add ourselves to the registry
	registry.registerGadget("navbar", {
	
    	runtime: function(store, config, gadget, runtime, callback)
    	{
        	// we create a map of page-keys to page urls
        	store.loadPages(function(configs) {

            	for (var i = 0; i < runtime.items.length; i++)
            	{
                	var item = runtime.items[i];
					if (!item.dropdown)
					{
						if (item.pageKey)
						{
                			var pageKey = item["pageKey"];
                			item["uri"] = configs[pageKey].page.uri;
						}
					}
					else
					{
						for (var j = 0; j < item.items; j++)
						{
							var sub = item.items[j];
							if (sub.pageKey)
							{
	                			var pageKey = sub["pageKey"];
	                			sub["uri"] = configs[pageKey].page.uri;								
							}
						}
					}
            	}

            	callback(runtime);
        	});

			// store the application information into model
			store.loadApplication(function(app) {
				runtime.app = {};
				runtime.app.title = app.title;
				if (!runtime.app.title)
				{
					runtime.app.title = "Application Title";
				}
				runtime.app.description = app.description;
				if (!runtime.app.description)
				{
					runtime.app.description = "Application Description";
				}
			});
    	}
	});
};