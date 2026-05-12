'use strict';
var http = require('http');
var https = require('https');
var url = require('url');
var config = require('./config');
var logger = require('./logger');

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

function sendSlackAlert(name, remainingDays) {
    var webhookUrl = config.slack.webhookUrl;
    var parsed = url.parse(webhookUrl);
    var client = parsed.protocol === 'https:' ? https : http;

    var isUrgent = remainingDays <= 7;
    var isWarning = remainingDays <= config.licenseCheck.thresholdDays;
    var emoji = isUrgent ? ':rotating_light:' : isWarning ? ':warning:' : ':white_check_mark:';
    var color = isUrgent ? 'danger' : isWarning ? 'warning' : 'good';
    var status = isUrgent ? '긴급' : isWarning ? '경고' : '정상';
    var footer = isWarning
        ? '라이선스가 ' + remainingDays + '일 후 만료됩니다. 갱신이 필요합니다.'
        : '라이선스가 ' + remainingDays + '일 남았습니다.';

    var payload = JSON.stringify({
        text: emoji + ' *[ID RandD 라이선스 현황 - ' + status + ']* ' + name,
        attachments: [
            {
                color: color,
                fields: [
                    {
                        title: '서버',
                        value: name,
                        short: true
                    },
                    {
                        title: '남은 유효일',
                        value: remainingDays + '일',
                        short: true
                    }
                ],
                footer: footer
            }
        ]
    });

    return new Promise(function (resolve, reject) {
        var options = {
            hostname: parsed.hostname,
            path: parsed.path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        var req = client.request(options, function (res) {
            res.on('data', function () {});
            res.on('end', function () { resolve(); });
        });

        req.on('error', function (err) { reject(err); });
        req.write(payload);
        req.end();
    });
}

function checkLicense(endpoint) {
    var name = endpoint.name;
    var endpointUrl = endpoint.url;
    var metricKey = endpoint.metricKey || DEFAULT_METRIC_KEY;

    return fetchMetrics(endpointUrl)
        .then(function (metricsText) {
            var remainingDays = parseRemainingDays(metricsText, metricKey);

            if (remainingDays === null) {
                logger.log('warning', name + ': ' + metricKey + ' 지표를 찾을 수 없음');
                return;
            }

            logger.log('info', name + ': 라이선스 잔여일 = ' + remainingDays + '일');
            return sendSlackAlert(name, remainingDays);
        })
        .catch(function (err) {
            logger.log('error', name + ' 체크 실패: ' + err.message);
        });
}

function checkAllLicenses() {
    var endpoints = config.licenseCheck.endpoints;
    return Promise.all(endpoints.map(function (endpoint) {
        return checkLicense(endpoint);
    }));
}

module.exports = { checkAllLicenses: checkAllLicenses };
