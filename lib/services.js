'use strict';

var findFiles = require('./findFiles'),
    logger = require('./logger');

var loaded_services = false;

var isReady = false,
    pending = [],
    services = null;

function initServices(err, files) {
    files = files || [];

    services = files.map(function(f) {
        return {
            name: f.substr(f.lastIndexOf('/') + 1, f.length).replace('--service.js', ''),
            service: require(f)
        };
    });

    services.forEach(function(s){
        s.service.on('connected', function(srv) {
            logger.success(srv.name, 'service ready');
            srv.connected = true;
            bootstrapServices();
        }.bind(this, s));
        
        s.service.on('serviceDown', function(srv) {
            logger.error(srv.name, 'service is down. Cannot start app');
            srv.connected = false;
            process.exit();
        }.bind(this, s));

        s.service.initialize();
    });
}

function bootstrapServices(cb, path) {
    if (isReady && cb) {
        return cb();
    }

    if (!loaded_services) {
        loaded_services = true;
        findFiles(path, '--service.js', initServices);
    }

    var connections;

    if (services) {
        connections = services.filter(function(s) {
            return s.connected;
        });
    }

    if (connections && connections.length === services.length) {
        isReady = true;
        pending.forEach(function(callback) {
            callback();
        });
    }
    else {
        if (cb) {
            pending.push(cb); 
        }
    }
}

module.exports = bootstrapServices;