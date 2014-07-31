var
  http = require('http'),
  fs = require('fs'),
  qs = require('querystring'),
  exec = require('child_process').exec,
  url = require('url');

function setHost(name, res, req) {
  if (!name || name.length < 5) {
    res.end(injectStatus("The name is too short. It must be at least 5 characters long.", true));
  } else {
    exec("configure_edison --changeName " + name, function () {
      if (req.headers.host.indexOf('.local') > -1) {
        res.writeHead(302, {
          'Location': "http://" + name + ".local/deviceNameChanged"
        });
        res.end();
      } else {
        res.end(injectStatus("Device name changed. To confirm, run 'hostname' on the device.", false));
      }
    });
  }
}

function setPass(password, res) {
  if (!password || password.length < 8) {
    res.end(injectStatus("The password is too short. It must be between 8 and 63 characters.", true));
  } else if (password.length > 63) {
    res.end(injectStatus("The password is too long. It must be between 8 and 63 characters.", true));
  } else {
    exec("configure_edison --changePassword " + password, function () {
      res.end(injectStatus("The device password has been changed.", false));
    });
  }
}

function setWiFi(params, res) {
  var exec_cmd = null, errmsg = null;

  if (!params.ssid) {
    errmsg = "Please specify the network name.";
  } else if (!params.protocol) {
    errmsg = "Please specify the network protocol (Open, WEP, etc.)";
  } else if (params.protocol === "OPEN") {
    exec_cmd = "configure_edison --changeWiFi OPEN " + params.ssid;
  } else if (params.protocol === "WEP") {
    if (params.netpass.length == 5 || params.netpass.length == 13)
      exec_cmd = "configure_edison --changeWiFi WEP " + params.ssid + " " + params.netpass;
    else
      errmsg = "The supplied password must be 5 or 13 characters long.";
  } else if (params.protocol === "WPA-PSK") {
    if (params.netpass) {
      exec_cmd = "configure_edison --changeWiFi WPA-PSK " + params.ssid + " " + params.netpass;
    } else {
      errmsg = "Please specify the network password.";
    }
  } else if (params.protocol === "WPA-EAP") {
      if (params.netuser && params.netpass)
        exec_cmd = "configure_edison --changeWiFi WPA-EAP " + params.ssid + " " + params.netuser + " " + params.netpass;
      else
        errmsg = "Please specify both the username and the password.";
  } else {
    errmsg = "The specified network protocol is not supported."
  }

  if (exec_cmd) {
    exec("hostname",
      function (error, stdout, stderr) {
        res.end(injectStatus("The Edison should have WiFi access soon. In about 30 seconds, connect to '"
          + params.ssid + "' and type '" + stdout.toString().trim() + ".local' in your browser.",
          false));
      });

    exec(exec_cmd, function () {
    });
  } else if (errmsg) {
    res.end(injectStatus(errmsg, true));
  } else {
    console.log(params);
    res.end(injectStatus("Unknown error occurred.", true));
  }
}

var site = __dirname + '/public';
var payload, urlobj;
var injectStatusAfter = '<h1>Edison Configuration</h1>';
var injectStatusAt = fs.readFileSync(site + '/index.html', {encoding: 'utf8'}).indexOf(injectStatusAfter)
  + injectStatusAfter.length;

function injectStatus(statusmsg, iserr) {
  var data = fs.readFileSync(site + '/index.html', {encoding: 'utf8'});

  var status = "";
  if (iserr)
    status = '<div class="status errmsg">' + statusmsg + '</div>';
  else
    status = '<div class="status">' + statusmsg + '</div>';

  return data.substring(0, injectStatusAt) + status + data.substring(injectStatusAt, data.length);
}

function pageNotFound(res) {
  res.statusCode = 404;
  res.end("The page at " + urlobj.pathname + " was not found.");
}

function handlePostRequest(req, res) {
  var params = qs.parse(payload);
  if (urlobj.pathname === '/setHost') {
    setHost(params.name, res, req);
  } else if (urlobj.pathname === '/setPass') {
    setPass(params.pass, res)
  } else if (urlobj.pathname === '/setWiFi') {
    setWiFi(params, res);
  } else {
    pageNotFound(res);
  }
}

function requestHandler(req, res) {

  urlobj = url.parse(req.url, true);
  payload = "";

  // POST request. Get payload.
  if (req.method === 'POST') {
    req.on('data', function (data) {
      payload += data;
    });
    req.on('end', function () {
      handlePostRequest(req, res);
    });
    return;
  }

  // GET request
  if (!urlobj.pathname || urlobj.pathname === '/')
    fs.readFile(site + '/index.html', function (err, data) {
      if (err)
        throw err;
      res.end(data);
    });
  else if (urlobj.pathname === '/deviceNameChanged') {
    res.end(injectStatus("Device name changed. To confirm, run 'hostname' on the device.", false));
  } else {
    if (!fs.existsSync(site + urlobj.pathname)) {
      pageNotFound(res);
      return;
    }
    fs.readFile(site + urlobj.pathname, function (err, data) {
      if (err)
        throw err;
      res.end(data);
    });
  }
}

http.createServer(requestHandler).listen(80);



