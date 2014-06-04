/*
 * grunt-esri-slurp
 * https://github.com/steveoh/grunt-esri-slurp
 *
 * Copyright (c) 2014 steveoh
 * Licensed under the MIT license.
 */

'use strict';
var fs = require('fs'),
  path = require('path'),

  async = require('async'),
  mkdirp = require('mkdirp'),
  request = require("request"),
  S = require('string'),
  ProgressBar = require('progress'),

  unwind = require('./unwinder');

module.exports = function(grunt) {
  grunt.registerTask('esri_slurp', 'download esri js api amd modules and create a package', function() {
    var options = this.options({
        packageLocation: path.join('src', 'esri'),
        version: '3.9'
      }),
      done = this.async();

    options.packageLocation = S(options.packageLocation).ensureRight(path.sep).s;

    grunt.log.subhead('downloading esri version ' + options.version + ' modules');

    mkdirp.sync(options.packageLocation);

    var esriVersionBaseUrl = 'http://js.arcgis.com/' + options.version + 'amd/js/esri/';
    grunt.verbose.writeln('esri base url: ' + esriVersionBaseUrl);

    var esriModules = require('./esriModules-' + options.version);

    var bar = new ProgressBar('downloading [:bar] :percent :etas', {
      total: esriModules.length,
      stream: process.stdout,
      width: 30
    });

    async.eachLimit(esriModules, 20, function(file, callback) {
      var subPath = S(path.dirname(file)).ensureRight('/').s,
        fileFolder = path.join(options.packageLocation, subPath),
        fileName = path.basename(file),
        httpUrl = esriVersionBaseUrl + subPath + fileName;

      if (!fs.existsSync(fileFolder)) {
        grunt.verbose.writeln(['creating folder ' + fileFolder]);

        mkdirp.sync(fileFolder);
      }

      grunt.verbose.writeln(['requesting ' + httpUrl]);

      request({
          uri: httpUrl,
          encoding: 'binary'
        },
        function(error, response, body) {

          if (body.length < 1) {
            callback(error, body);
            bar.total = bar.total - 1;

            return;
          }

          var newFile = path.join(options.packageLocation, file);

          grunt.verbose.writeln(['writing: ' + newFile]);

          var extension = path.extname(file);
          if (extension === '.js' || extension === '.css') {
            body = unwind(body);
          }

          fs.writeFile(newFile, body, 'binary');

          callback(error, body);

          bar.tick();
        });
    }, function(err) {
      if (err) {
        grunt.warn(err);
      }
      done();
    });
  });
};