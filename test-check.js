'use strict';
var http = require('http');
var https = require('https');
var url = require('url');
var config = require('./config');

var DEFAULT_METRIC_KEY = 'idlivedoc_license_remaining_days';

function fetchMetrics(endpointUrl) {
    return new Promise(function (resolve, reject) {
        var parsed = url.parse(endpointUrl);
        var client = parsed.protocol === 'https:' ? https : http;

        var req = client.get(endpointUrl, function (res) {
            var body = '';
            res.setEncoding('utf8');
            res.on('data', function (chunk) { body += chunk; });
            res.on('end', function () { resolve(body); });
        });

        req.on('error', function (err) { reject(err); });
        req.setTimeout(10000, function () {
            req.abort();
            reject(new Error('Request timeout: ' + endpointUrl));
        });
    });
}

function parseRemainingDays(metricsText, metricKey) {
    var lines = metricsText.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.startsWith(metricKey + '{') || line.startsWith(metricKey + ' ')) {
            var parts = line.split('}');
            var valueStr = parts.length > 1 ? parts[parts.length - 1].trim() : line.split(' ').pop();
            var value = parseFloat(valueStr);
            if (!isNaN(value)) {
                return value;
            }
        }
    }
    return null;
}

var endpoints = config.licenseCheck.endpoints;

Promise.all(endpoints.map(function (endpoint) {
    var metricKey = endpoint.metricKey || DEFAULT_METRIC_KEY;
    return fetchMetrics(endpoint.url)
        .then(function (metricsText) {
            var remainingDays = parseRemainingDays(metricsText, metricKey);
            if (remainingDays === null) {
                console.log('[' + endpoint.name + '] ' + metricKey + ' 지표를 찾을 수 없음');
            } else {
                console.log('[' + endpoint.name + '] 라이선스 잔여일 = ' + remainingDays + '일');
            }
        })
        .catch(function (err) {
            console.log('[' + endpoint.name + '] 요청 실패: ' + err.message);
        });
})).then(function () {
    console.log('--- 테스트 완료 ---');
});
