/*
 * Copyright (c) 2015, Intel Corporation.
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms and conditions of the GNU Lesser General Public License,
 * version 2.1, as published by the Free Software Foundation.
 *
 * This program is distributed in the hope it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU Lesser General Public License for
 * more details.
 */

var OUTPUT_CMD = "commandOutput",
  PROTO = "http://",
  CURRENT_HOSTNAME = "",
  CURRENT_SSID = "",
  NEW_HOSTNAME = "",
  NEW_SSID = "",
  NEW_WIFI = "",
  REQUEST_INTERVAL = 10, // secs
  PROGRESS_BAR_INITIAL_WIDTH = 10, // px
  MAX_PROGRESS_BAR_LEN = 935, // px
  MAX_RETRY_TIME = 3, // min
  PROGRESS_BAR_INCREMENT = 0, // should be set in init
  PROGRESS_TEXT_HEADER_DISCONNECT = "Disconnected. Please connect to network '",
  PROGRESS_TEXT_HEADER_CONFIGURE = "Configuring your device",
  PROGRESS_TEXT_HEADER = PROGRESS_TEXT_HEADER_CONFIGURE,
  PROGRESS_TEXT_PREFIX = " (",
  PROGRESS_TEXT_SUFFIX = " mins remaining).",
  COMMAND_OUTPUT_BOX_ID = "cmdout",
  ERROR_BOX_ID = "errbox",
  PROGRESS = 0,
  DISCONNECT_ERROR_MESSAGE = "",
  CONFIGURE_ERROR_MESSAGE = "",
  CONFIGURE_FAIL_PROGRESS_TEXT = "Sorry, could not configure your device.",
  CONFIGURE_SUCCESS_PROGRESS_TEXT = "Configuration is complete.",
  MAX_RETRIES_ON_NAME_CHANGE_ONLY = 2,
  RETRIES_ON_NAME_CHANGE_ONLY = 0;

// maxtime: in minutes
// interval: in secs
// headertext: string that shows below progress bar (e.g. attempting to reach your device)
function initFeedbackLib(config) {
  PROGRESS = 0;

  if (config) {
    if (config.proto || config.proto === "")
      PROTO = config.proto;
    if (config.host)
      NEW_HOSTNAME = config.host;
    if (config.newwifi)
      NEW_WIFI = config.newwifi;
    if (config.maxtime)
      MAX_RETRY_TIME = config.maxtime;
    if (config.interval)
      REQUEST_INTERVAL = config.interval;
    if (config.headertext)
      PROGRESS_TEXT_HEADER = config.headertext;
    if (config.headertextDisconnect)
      PROGRESS_TEXT_HEADER_DISCONNECT = config.headertextDisconnect;
    if (config.cmdoutid)
      COMMAND_OUTPUT_BOX_ID = config.cmdoutid;
    if (config.errboxid)
      ERROR_BOX_ID = config.errboxid;
    if (config.currenthost)
      CURRENT_HOSTNAME = config.currenthost;
    if (config.currentssid)
      CURRENT_SSID = config.currentssid;
    if (config.ssid)
      NEW_SSID = config.ssid;
    if (config.configFailProgressText)
      CONFIGURE_FAIL_PROGRESS_TEXT = config.configFailProgressText;
    if (config.configSuccessProgressText)
      CONFIGURE_SUCCESS_PROGRESS_TEXT = config.configSuccessProgressText
  }

  resetProgressBarIncrement();

  if (config && config.errdisconnect)
    DISCONNECT_ERROR_MESSAGE = config.errdisconnect + getRerunSetupMessage(NEW_HOSTNAME, NEW_SSID);
  else
    DISCONNECT_ERROR_MESSAGE =
      "<b style='color: red'>Sorry, we were unable to reach your device.</b> Please try again by " +
      "reconnecting this machine to the '" + NEW_WIFI + "' network and clicking " +
      "<a href='http://" + NEW_HOSTNAME + "'>http://" + NEW_HOSTNAME + "</a>. You can also rerun this setup " +
      "by following the steps below. " +
      "If that fails, please connect to the device via its serial port and run <code>configure_edison " +
      "--wifi</code> on the command line. To learn about other configuration options, run <code>configure_edison " +
      "--help</code>." + "<br><br>" + getRerunSetupMessage(NEW_HOSTNAME, NEW_SSID);

  if (config && config.errsetup)
    CONFIGURE_ERROR_MESSAGE = config.errsetup + getRerunSetupMessage(CURRENT_HOSTNAME, CURRENT_SSID);
  else
    CONFIGURE_ERROR_MESSAGE =
      "<b style='color: red'>Sorry, we encountered an error while configuring your device.</b> " +
      "Please see messsages in the status area above for details. At this time, we recommend rerunning this setup " +
      "by following the steps below. If that fails, please connect to the device via its serial port " +
      "and run <code>configure_edison --setup</code> on the command line. " +
      "To learn about other configuration options, run <code>configure_edison --help</code>." + "<br><br>" +
      getRerunSetupMessage(CURRENT_HOSTNAME, CURRENT_SSID);

  updateProgressText();
}

function resetProgressBarIncrement() {
  PROGRESS_BAR_INCREMENT = (MAX_PROGRESS_BAR_LEN - PROGRESS_BAR_INITIAL_WIDTH)/(MAX_RETRY_TIME * 60) * REQUEST_INTERVAL;
}

function getRerunSetupMessage(hostname, ssid) {
  return "To rerun this setup, do the following: " +
    "<ol>" +
    "<li>Press the 'PWR' button for more than 2 seconds (NOTE: Pressing 'PWR' for more than 7 seconds will " +
    "switch off power to the board)</li> " +
    "<li>Wait approximately 15 seconds for the device's access point to start</li> " +
    "<li>Reconnect this machine to the '" + ssid + "' network</li> " +
    "<li>Visit '<a href='http://" + hostname + "'>http://" + hostname + "</a>' in your browser</li> " +
    "</ol> ";
}

function updateProgressBar(allok) {
  if ((PROGRESS * REQUEST_INTERVAL)/60 < MAX_RETRY_TIME) {
    document.getElementById("progressbar").style.width = "" + (PROGRESS_BAR_INITIAL_WIDTH +
    PROGRESS_BAR_INCREMENT * PROGRESS) + "px";
  } else {
    document.getElementById("progressbar").style.width = "" + MAX_PROGRESS_BAR_LEN + "px";
    if (!allok)
      document.getElementById("progressbar").style.backgroundColor = "red";
  }
}

function updateProgressText() {
    var minpassed = (PROGRESS * REQUEST_INTERVAL)/60;
    if (minpassed >= MAX_RETRY_TIME) {
      if (PROGRESS_TEXT_HEADER_DISCONNECT === PROGRESS_TEXT_HEADER) {
        document.getElementById("progresstext").value =
          "Sorry, could not reach your device.";
        document.getElementById(ERROR_BOX_ID).innerHTML = DISCONNECT_ERROR_MESSAGE;
      } else {
        document.getElementById("progresstext").value = CONFIGURE_FAIL_PROGRESS_TEXT;
        document.getElementById(ERROR_BOX_ID).innerHTML = CONFIGURE_ERROR_MESSAGE;
      }
      document.getElementById(ERROR_BOX_ID).style.display = "inherit";
    } else {
      document.getElementById("progresstext").innerHTML = PROGRESS_TEXT_HEADER + PROGRESS_TEXT_PREFIX +
      (MAX_RETRY_TIME - minpassed).toFixed(1) + PROGRESS_TEXT_SUFFIX;
    }
}

function maxOutProgressBar(progressText, allOK) {
  PROGRESS = (MAX_RETRY_TIME * 60)/REQUEST_INTERVAL;
  updateProgressBar(allOK);
  document.getElementById("progresstext").value = progressText;
}

function queryForDevice() {
  var xmlhttp;
  if (window.XMLHttpRequest) {
    xmlhttp=new XMLHttpRequest();
  } else {
    xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
  }
  xmlhttp.onreadystatechange = function () {
    if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
      document.getElementById(COMMAND_OUTPUT_BOX_ID).value = xmlhttp.responseText;
      maxOutProgressBar("Found device. Connecting in 5 seconds...", true);
      setTimeout(function () { location.replace(PROTO + NEW_HOSTNAME); }, 5000);
    } else if (xmlhttp.readyState === 4 && xmlhttp.status === 404) {
      console.log("Unexpected request sent to server. Command: /");
    }
  };

  // if wifi is not changing, then we are waiting for name change (otherwise we would have
  // ended in queryForCommandOutput()). In this case, query device only once more and then give up.
  function handleServerNonResponse() {
    PROGRESS++;
    updateProgressBar();
    updateProgressText();

    if ((PROGRESS * REQUEST_INTERVAL)/60 < MAX_RETRY_TIME) {
      // assuming setTimeout better than recursive call in terms of stack memory usage

      // if wifi is not changing, then increment RETRIES_ON_NAME_CHANGE_ONLY
      // if RETRIES_ON_NAME_CHANGE_ONLY equals 1 (or some max) give up. Give up means end by saying
      // configuration was a success.
      if (!NEW_WIFI) {
        if (RETRIES_ON_NAME_CHANGE_ONLY === MAX_RETRIES_ON_NAME_CHANGE_ONLY) {
          maxOutProgressBar(CONFIGURE_SUCCESS_PROGRESS_TEXT, true);
          return;
        } else {
          RETRIES_ON_NAME_CHANGE_ONLY++;
        }
      }
      setTimeout(queryForDevice, REQUEST_INTERVAL * 1000);
    }
  }

  xmlhttp.timeout = REQUEST_INTERVAL * 1000;
  xmlhttp.ontimeout = handleServerNonResponse;
  xmlhttp.onerror = handleServerNonResponse;

  xmlhttp.open("GET", PROTO + NEW_HOSTNAME + "/" + OUTPUT_CMD, true); // change to edison address
  xmlhttp.send();
}

function queryForCommandOutput() {
  var xmlhttp;
  if (window.XMLHttpRequest) {
    xmlhttp=new XMLHttpRequest();
  } else {
    xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
  }
  xmlhttp.onreadystatechange = function () {
    if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
      document.getElementById(COMMAND_OUTPUT_BOX_ID).value = xmlhttp.responseText;

      PROGRESS++;
      updateProgressBar();
      updateProgressText();

      if ((PROGRESS * REQUEST_INTERVAL)/60 < MAX_RETRY_TIME) {
        setTimeout(queryForCommandOutput, REQUEST_INTERVAL * 1000);
      }
    } else if (xmlhttp.readyState === 4 && xmlhttp.status === 404) {
      console.log("Sent unexpected request to server. Command: " + OUTPUT_CMD);
    }
  };

  function handleServerNonResponse() {
    PROGRESS++;
    updateProgressBar();

    // if name change is happening then check if wifi is changing as well
    // if wifi is changing, continue as normal. otherwise, don't change progress
    // text and call queryForDevice.
    // if name is not changing and wifi is not changing, then end now, by saying
    // config complete.
    if (CURRENT_HOSTNAME === NEW_HOSTNAME && !NEW_WIFI) { // wifi and hostname are not changing
      // todo: this assumption is not good. some day know if each command succeeded or failed (very hard to do)
      // todo: (contd...) knowing commands are successful or not is hard because device gets disconnected in both
      // todo: (contd...) success and failure cases.
      maxOutProgressBar(CONFIGURE_SUCCESS_PROGRESS_TEXT, true);
      return;
    }

    if (NEW_WIFI) { // wifi is changing
      PROGRESS_TEXT_HEADER = PROGRESS_TEXT_HEADER_DISCONNECT;
      PROGRESS_TEXT_PREFIX = NEW_WIFI + "' and wait while we attempt to reach your device" + PROGRESS_TEXT_PREFIX;
      updateProgressText();
    }

    if ((PROGRESS * REQUEST_INTERVAL)/60 < MAX_RETRY_TIME) {
      setTimeout(queryForDevice, 0);
    }
  }

  xmlhttp.timeout = REQUEST_INTERVAL * 1000;
  xmlhttp.ontimeout = handleServerNonResponse;
  xmlhttp.onerror = handleServerNonResponse;

  xmlhttp.open("GET", OUTPUT_CMD, true);
  xmlhttp.send();
}