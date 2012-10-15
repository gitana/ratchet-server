exports.init = function(registry)
{
	// add ourselves to the registry
	registry.registerGadget("list", {
	
    	read: function(store, config, req, res)
    	{
        	// TODO
        	/*
        	connect(req, res).listRepositories().then(function() {
           	res.send({ repositories: this.map });
       		});
       		*/
   		}

	});
};
