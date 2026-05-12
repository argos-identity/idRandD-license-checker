'use strict';
var os = require('os');
var hostname = os.hostname();
//console.log("hostname:"+ hostname);

var config = require('./config.json');

module.exports = config;
