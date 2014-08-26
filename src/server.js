var
  http = require('http'),
  fs = require('fs'),
  qs = require('querystring'),
  exec = require('child_process').exec,
  url = require('url');

var supportedExtensions = {
  "css"   : "text/css",
  "xml"   : "text/xml",
  "htm"   : "text/html",
  "html"  : "text/html",
  "js"    : "application/javascript",
  "json"  : "application/json",
  "txt"   : "text/plain",
  "bmp"   : "image/bmp",
  "gif"   : "image/gif",
  "jpeg"  : "image/jpeg",
  "jpg"   : "image/jpeg",
  "png"   : "image/png"
}

var STATE_DIR = '/var/lib/edison_config_tools';

function getContentType(filename) {

  var i = filename.lastIndexOf('.');
  if (i < 0) {
    return 'application/octet-stream';
  }

  return supportedExtensions[filename.substr(i+1).toLowerCase()] || 'application/octet-stream';
}

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

function setPass(params, res) {
  if (params.pass1 === params.pass2) {
    if (params.pass1.length == 0) {
      res.end(injectStatus("The password cannot be empty. Please try again.", true))
      return;
    }
    exec("configure_edison --changePassword " + params.pass1, function () {
      res.end(injectStatus("The device password has been changed.", false));
    });
  } else {
    res.end(injectStatus("Passwords do not match. Please try again.", true));
  }
}

function setWiFi(params, res) {
  var exec_cmd = null, errmsg = null;

  if (!params.ssid) {
    errmsg = "Please specify the network name.";
  } else if (!params.protocol) {
    errmsg = "Please specify the network protocol (Open, WEP, etc.)";
  } else if (params.protocol === "OPEN") {
    exec_cmd = "configure_edison --changeWiFi OPEN '" + params.ssid + "'";
  } else if (params.protocol === "WEP") {
    if (params.netpass.length == 5 || params.netpass.length == 13)
      exec_cmd = "configure_edison --changeWiFi WEP '" + params.ssid + "' '" + params.netpass + "'";
    else
      errmsg = "The supplied password must be 5 or 13 characters long.";
  } else if (params.protocol === "WPA-PSK") {
    if (params.netpass) {
      exec_cmd = "configure_edison --changeWiFi WPA-PSK '" + params.ssid + "' '" + params.netpass + "'";
    } else {
      errmsg = "Please specify the network password.";
    }
  } else if (params.protocol === "WPA-EAP") {
      if (params.netuser && params.netpass)
        exec_cmd = "configure_edison --changeWiFi WPA-EAP '" + params.ssid + "' '" + params.netuser + "' '"
          + params.netpass + "'";
      else
        errmsg = "Please specify both the username and the password.";
  } else {
    errmsg = "The specified network protocol is not supported."
  }

  console.log(exec_cmd);

  if (exec_cmd) {
    res.end(injectStatus("Please wait while the device connects to '" + params.ssid + 
    "'. After about a minute, connect to '" + params.ssid + 
    "' and click the header above.", false, 'index.html', 'ALL_DISABLED'));

    exec(exec_cmd, function () {
    });
  } else if (errmsg) {
    res.end(injectStatus(errmsg, true));
  } else {
    console.log(params);
    res.end(injectStatus("Unknown error occurred.", true));
  }
}

function appendIP_callLast(res) {
  exec("configure_edison --showWiFiIP",
    function (error, stdout, stderr) {
      res.write('<ip>' + stdout + '</ip>');
      res.end('</status>');
    });
}

function appendLatestVersion(res) {
  exec("configure_edison --latest-version",
    function (error, stdout, stderr) {
      res.write('<latest_ver>' + stdout + '</latest_ver>');
      appendIP_callLast(res);
    });
}

function respondWithStatus(res) {
  res.write('<status>');
  exec("configure_edison --version",
    function (error, stdout, stderr) {
      res.write('<current_ver>' + stdout + '</current_ver>');
      appendLatestVersion(res);
    });
}

function doUpgrade() {
  exec("configure_edison --disableOneTimeSetup",
    function (error, stdout, stderr) {
      exec("configure_edison --upgrade",
        function (error, stdout, stderr) {
        });
    });
}

var site = __dirname + '/public';
var payload, urlobj;
var injectStatusAfter = '<h1>Edison One-time Setup</h1></a>';
var injectStatusAt = fs.readFileSync(site + '/index.html', {encoding: 'utf8'}).indexOf(injectStatusAfter)
  + injectStatusAfter.length;

function getFile(filename) {
  return fs.readFileSync(site + '/' + filename, {encoding: 'utf8'});
}

function injectStatus(statusmsg, iserr, filename, state) {
  var data = null;

  if (filename)
    data = getFile(filename);
  else
    data = getFile('index.html');

  var status = "";
  if (statusmsg) {
    if (iserr)
      status = '<div class="status errmsg">' + statusmsg + '</div>';
    else
      status = '<div class="status">' + statusmsg + '</div>';
  }

  if (state) {
    status += '<form id="input_state_form"><input name="input_state" type="hidden" value="' + state + '"></form>';
  } else {
    if (fs.existsSync(STATE_DIR + '/password-setup.done')) {
      status += '<form id="input_state_form"><input name="input_state" type="hidden" value="ALL_ENABLED"></form>';
    }
  }
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
    setPass(params, res)
  } else if (urlobj.pathname === '/setWiFi') {
    setWiFi(params, res);
  } else if (urlobj.pathname === '/doExit') {
    exec("configure_edison --showWiFiIP",
      function (error, stdout, stderr) {
        var myip = stdout.trim();
        if (myip === "none")
          res.end(getFile('exiting-without-wifi.html'));

        setTimeout(
          function () {
            exec("configure_edison --disableOneTimeSetup",
              function (error, stdout, stderr) {
                if (myip !== "none")
                  res.end(getFile('status.html'));
              })
          }, 5000);
      });
  } else if (urlobj.pathname === '/upgrade') {
    doUpgrade();
    res.end(getFile('doing_upgrade.html'));
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
  if (!urlobj.pathname || urlobj.pathname === '/') {
    if (fs.existsSync(STATE_DIR + '/one-time-setup.done')) {
      res.end(fs.readFileSync(site + '/status.html', {encoding: 'utf8'}));
    } else if (fs.existsSync(STATE_DIR + '/password-setup.done')) {
      res.end(injectStatus());
    } else {
      res.end(fs.readFileSync(site + '/index.html', {encoding: 'utf8'}));
    }
  }
  else if (urlobj.pathname === '/deviceNameChanged') {
    res.end(injectStatus("Device name changed. To confirm, run 'hostname' on the device.", false));
  } else if (urlobj.pathname === '/status') {
    res.setHeader('content-type', getContentType(".xml"));
    respondWithStatus(res);
  } else {
    if (!fs.existsSync(site + urlobj.pathname)) {
      pageNotFound(res);
      return;
    }
    fs.readFile(site + urlobj.pathname, function (err, data) {
      if (err)
        throw err;
      res.setHeader('content-type', getContentType(urlobj.pathname));
      res.end(data);
    });
  }
}

http.createServer(requestHandler).listen(80);



