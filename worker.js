'use strict';
var util = require('./common');
var logger = require('./logger');
var schedule = require('node-schedule');
var licenseChecker = require('./license-checker');


//  Recurrence Rule Scheduling
//  일요일부터 토요일까지 오후23시 59분 정각에 실행될 스케줄링 등록
// 0 - Sunday, 1 - Monday, 2 - Tuesday, 3 - Wedsnesday, 4 - Thursday, 5 - Friday, 6 - Saturday
var rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [0, new schedule.Range(0, 6)];
rule.hour = 9;
rule.minute = 0;
rule.tz = 'Asia/Seoul';

schedule.scheduleJob(rule, function () {
    console.log('Recurrence Rule Scheduling : 매일 오전 09:00 (KST) 수행');
    jobController();
});
//schedule.cancel()


jobController();
function jobController() {
    logger.log('info', 'live daemon');
    Promise.all([
        licenseChecker.checkAllLicenses()
    ])
    .then(function () {
        logger.log('info', 'jobController 완료');
    })
    .catch(function (err) {
        logger.log('error', { message: err });
    });
}




