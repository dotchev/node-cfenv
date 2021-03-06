// Generated by CoffeeScript 1.7.1
(function() {
  var AppEnv, URL, cfenv, fs, getApp, getBind, getName, getPort, getServices, getURLs, pkg, ports, throwError, yaml, _;

  fs = require("fs");

  URL = require("url");

  pkg = require("../package.json");

  _ = require("underscore");

  ports = require("ports");

  yaml = require("js-yaml");

  cfenv = exports;

  cfenv.getAppEnv = function(options) {
    if (options == null) {
      options = {};
    }
    return new AppEnv(options);
  };

  AppEnv = (function() {
    function AppEnv(options) {
      if (options == null) {
        options = {};
      }
      this.isLocal = process.env.VCAP_APPLICATION == null;
      if (!this.isLocal) {
        try {
          JSON.parse(process.env.VCAP_APPLICATION);
        } catch (_error) {
          this.isLocal = true;
        }
      }
      this.app = getApp(this, options);
      this.services = getServices(this, options);
      this.name = getName(this, options);
      this.port = getPort(this);
      this.bind = getBind(this);
      this.urls = getURLs(this, options);
      this.url = this.urls[0];
    }

    AppEnv.prototype.toJSON = function() {
      return {
        app: this.app,
        services: this.services,
        isLocal: this.isLocal,
        name: this.name,
        port: this.port,
        bind: this.bind,
        urls: this.urls,
        url: this.url
      };
    };

    AppEnv.prototype.getServices = function() {
      var result, service, services, type, _i, _len, _ref;
      result = {};
      _ref = this.services;
      for (type in _ref) {
        services = _ref[type];
        for (_i = 0, _len = services.length; _i < _len; _i++) {
          service = services[_i];
          result[service.name] = service;
        }
      }
      return result;
    };

    AppEnv.prototype.getService = function(spec) {
      var matches, name, service, services;
      if (_.isRegExp(spec)) {
        matches = function(name) {
          return name.match(spec);
        };
      } else {
        spec = "" + spec;
        matches = function(name) {
          return name === spec;
        };
      }
      services = this.getServices();
      for (name in services) {
        service = services[name];
        if (matches(name)) {
          return service;
        }
      }
      return null;
    };

    AppEnv.prototype.getServiceURL = function(spec, replacements) {
      var credentials, key, password, purl, service, url, userid, value;
      if (replacements == null) {
        replacements = {};
      }
      service = this.getService(spec);
      credentials = service != null ? service.credentials : void 0;
      if (credentials == null) {
        return null;
      }
      replacements = _.clone(replacements);
      if (replacements.url) {
        url = credentials[replacements.url];
      } else {
        url = credentials.url || credentials.uri;
      }
      if (url == null) {
        return null;
      }
      delete replacements.url;
      purl = URL.parse(url);
      for (key in replacements) {
        value = replacements[key];
        if (key === "auth") {
          userid = value[0], password = value[1];
          purl[key] = "" + credentials[userid] + ":" + credentials[password];
        } else {
          purl[key] = credentials[value];
        }
      }
      return URL.format(purl);
    };

    AppEnv.prototype.getServiceCreds = function(spec) {
      var service;
      service = this.getService(spec);
      if (service == null) {
        return null;
      }
      return service.credentials || {};
    };

    return AppEnv;

  })();

  getApp = function(appEnv, options) {
    var e, envValue, locValue, string, _ref;
    string = process.env.VCAP_APPLICATION;
    envValue = {};
    if (string != null) {
      try {
        envValue = JSON.parse(string);
      } catch (_error) {
        e = _error;
        throwError("env var VCAP_APPLICATION is not JSON: /" + string + "/");
      }
    }
    if (!appEnv.isLocal) {
      return envValue;
    }
    locValue = options != null ? (_ref = options.vcap) != null ? _ref.application : void 0 : void 0;
    if (locValue != null) {
      return locValue;
    }
    return envValue;
  };

  getServices = function(appEnv, options) {
    var e, envValue, locValue, string, _ref;
    string = process.env.VCAP_SERVICES;
    envValue = {};
    if (string != null) {
      try {
        envValue = JSON.parse(string);
      } catch (_error) {
        e = _error;
        throwError("env var VCAP_SERVICES is not JSON: /" + string + "/");
      }
    }
    if (!appEnv.isLocal) {
      return envValue;
    }
    locValue = options != null ? (_ref = options.vcap) != null ? _ref.services : void 0 : void 0;
    if (locValue != null) {
      return locValue;
    }
    return envValue;
  };

  getPort = function(appEnv) {
    var port, portString;
    portString = process.env.VCAP_APP_PORT || process.env.PORT;
    if (portString == null) {
      if (appEnv.name == null) {
        return 3000;
      }
      portString = "" + (ports.getPort(appEnv.name));
    }
    port = parseInt(portString, 10);
    if (isNaN(port)) {
      throwError("invalid PORT value: /" + portString + "/");
    }
    return port;
  };

  getName = function(appEnv, options) {
    var pObject, pString, val, yObject, yString, _ref;
    if (options.name != null) {
      return options.name;
    }
    val = (_ref = appEnv.app) != null ? _ref.name : void 0;
    if (val != null) {
      return val;
    }
    if (fs.existsSync("manifest.yml")) {
      yString = fs.readFileSync("manifest.yml", "utf8");
      yObject = yaml.safeLoad(yString, {
        filename: "manifest.yml"
      });
      if (yObject.applications != null) {
        yObject = yObject.applications[0];
      }
      if (yObject.name != null) {
        return yObject.name;
      }
    }
    if (fs.existsSync("package.json")) {
      pString = fs.readFileSync("package.json", "utf8");
      try {
        pObject = JSON.parse(pString);
      } catch (_error) {
        pObject = null;
      }
      if (pObject != null ? pObject.name : void 0) {
        return pObject.name;
      }
    }
    return null;
  };

  getBind = function(appEnv) {
    var _ref;
    return ((_ref = appEnv.app) != null ? _ref.host : void 0) || "localhost";
  };

  getURLs = function(appEnv, options) {
    var protocol, uri, uris, urls, _ref;
    uris = (_ref = appEnv.app) != null ? _ref.uris : void 0;
    if (appEnv.isLocal) {
      uris = ["localhost:" + appEnv.port];
    } else {
      if (uris == null) {
        throwError("expecting VCAP_APPLICATION to contain uris when not runninng locally");
      }
    }
    protocol = options.protocol;
    if (protocol == null) {
      if (appEnv.isLocal) {
        protocol = "http:";
      } else {
        protocol = "https:";
      }
    }
    urls = (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = uris.length; _i < _len; _i++) {
        uri = uris[_i];
        _results.push("" + protocol + "//" + uri);
      }
      return _results;
    })();
    return urls;
  };

  throwError = function(message) {
    message = "" + pkg.name + ": " + message;
    console.log("error: " + message);
    throw new Error(message);
  };

}).call(this);
