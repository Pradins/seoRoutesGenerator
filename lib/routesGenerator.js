var mongoose = require('mongoose');
var tunnel   = require('tunnel-ssh');
var async    = require('async');
var fs       = require('fs');
var request  = require('request');

var urls = [];
var config;

exports.generateRoutesFile = function(config_id, outputRoute, finalCB) {
    console.log('starting to generate the routes ... ');
    config = require('../config/' + config_id + '.js');
    init(config, finalCB);
}

function init(config, fcb) {

    var tnl = tunnel(config, function(error, server) {

        if(error){
            console.log("SSH connection error: " + error);
        } else {

            var conn = mongoose.connect('mongodb://' + config.localHost + ':' + config.localPort + '/' + config.dbName);

            mongoose.connection.on('open', function (ref) {
                async.eachSeries(config.models, function(item, cb) {

                    if(item.source == "db") {
                        console.log('tiro crida db');
                        getUrlsDB(conn, item, cb);
                    } else if (item.source == "api") {
                        console.log('tiro crida api');
                        getUrlsApi(item, cb);
                    } else if (item.source == 'dbAggegation') {
                        console.log('tiro agregacio');
                        getUrlsAggregation(conn, item, cb);
                    }
                }, function(err) {
                    writeUrlFile(urls, config, fcb);
                });
            });
        }
    });
}

function getUrlsApi(settings, callback) {

    var data = '';
    var tempRoutes = [];

    doRequest(settings, function(error, response) {

        if(error) {
            console.log('error processing request');
            callback();
        }

        data = JSON.parse(response);
        tempRoutes = Object.keys(data);

        for (var i = 0; i < tempRoutes.length; i++) {
            tempRoutes[i] = settings.routePath + '/' + tempRoutes[i];
        }

        console.log(settings.routePath + ' size: ' + tempRoutes.length)
        urls = urls.concat(tempRoutes);
        callback();
    });
}

function getUrlsAggregation(connection, settings, outerCallback) {

    var Recipe = connection.model(settings.model);
    var aggregation = settings.searchQuery;

    Recipe.aggregate(aggregation, function(err, result) {

        if ((result == null) || (result == undefined)) {
            outerCallback();
        } else {
            createRoutes(result, settings, function() {
                outerCallback();
            });
        }
    });
}

function getUrlsDB(connection, settings, outerCallback) {

    var Schema_test = new mongoose.Schema({});
    var Schema = connection.model(settings.model, Schema_test);

    var query = settings.searchQuery;
    var projection = String(settings.identificator);

    Schema.find(query, projection, function (err, result) {

        if (err) {
            console.log(err);
        } else {
            createRoutes(result, settings, function() {
                outerCallback();
            });
        }
    });
}

function createRoutes(result, settings, cb) {

    // http://stackoverflow.com/questions/20936486/node-js-maximum-call-stack-size-exceeded

    var tempRoutes = [];

    async.each(result, function(item, cb) {

        if (item._doc) {
            var completeName = settings.routePath + '/' + item._doc[settings.identificator];
        } else {
            var completeName = settings.routePath + '/' + item[settings.identificator];
        }

        tempRoutes.push(completeName);
        cb();
    }, function(err){
        urls = urls.concat(tempRoutes);
        console.log(settings.model  + ' size: ' + tempRoutes.length);
        cb();
    });
}

function doRequest(settings, cb) {

    request(settings.endpoint, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            cb(null, response.body);
        } else {
            cb(error, response.body);
        }
    });
}

function writeUrlFile(urlsArray, config, fcb) {

    if(config.staticRoutes) { //append the static routes to the generated routes array
        var static_routes = require('../config/static_routes/' + config.shardValue + '.js');
        urlsArray = urlsArray.concat(static_routes);
    }

    var jsonUrls = JSON.stringify(urlsArray);
    var outputFileName = 'seo/' + config.shardValue + '.json';

    fs.writeFile(outputFileName, jsonUrls, function (err) {
        if (err) {
            fcb(false, null);
            return console.log(err);
        }

        console.log('Urls file created !');

        // fcb(true, config.shardValue + '.json');
        fcb(true, urlsArray);
    });
}