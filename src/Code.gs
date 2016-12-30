//////////////////////////////////
// INIT APP: RUN ONCE MANUALLY  //
//////////////////////////////////
function setup() {
  ScriptApp.newTrigger("sweep")
    .timeBased().everyMinutes(1).create();
  //  .timeBased().everyHours(1).create();  // run every 1 hour
}

//////////////
// GLOBALS  //
//////////////

ssUrl = 'https://docs.google.com/a/newschool.edu/spreadsheets/d/18BpYKWlpBzu1j_5N9oYMSJJKg_YQ9E3EMje8bWGts5k/edit'

////////////////
// UTILITIES  //
////////////////

function doGet() {
  var html = HtmlService.createTemplateFromFile("main").evaluate();
  html.setTitle("WWM WebApp");
  return html; 
}
 
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .getContent();
}

function getUserEmail () {  // needs perms
  var email = Session.getActiveUser().getEmail();
  return(email);
}

function getLocation1 () {
  //var response = Maps.newGeocoder().geocode('11 main st.');
  //var map = Maps.newStaticMap().setCenter('11 main st.');
  var map = Maps.newStaticMap().setSize(400, 300).addMarker('76 9th Ave, New York NY');
  Logger.log(map.getMapUrl());
}

function getLocation (address) {
 var response = Maps.newGeocoder().geocode(address); // Gets the geographic coordinates
 
 Logger.log (response);
 return response['results'];
 //for (var i = 0; i < response.results.length; i++) {
 //  var result = response.results[i];
 //  Logger.log('%s: %s, %s', result.formatted_address, result.geometry.location.lat,
 //      result.geometry.location.lng);
 //}
}

//function getData(){
//  var spreadsheet = SpreadsheetApp.openByUrl(ssUrl);
//  var sheet = spreadsheet.getSheets()[0];
//  return sheet.getDataRange().getValues();
//}

function getSheetVals(name) {
  var spreadsheet = SpreadsheetApp.openByUrl(ssUrl);
  var sheet = spreadsheet.getSheetByName(name);
  
  try {  // see if there is data
    var data = sheet.getSheetValues(2, 1, -1, -1)  // data w/o headers
  } catch(e) {
    return null;
  }
  return data;
}

// Rows complete their lifecycle, move all matching to tripnum
// assuming it is being called from within a scriptlock
// Interesting: gotta count backwards in the for loop as deletes mess w numbering!
function moveEntriesToLog(tripNum) {
  var spreadsheet = SpreadsheetApp.openByUrl(ssUrl);
  var sheet = spreadsheet.getSheetByName('Requests');
  var values = sheet.getSheetValues(2, 1, -1, -1)  // data w/o headers
  var rRow = [];  // matching request row
  var cRow = [];  // matching confirm row
  
  var lock = LockService.getScriptLock(); // Get a script lock, because we're about to modify a shared resource.
  lock.waitLock(30000); // Wait for up to 30 seconds for other processes to finish.

  for (var ridx = values.length-1; ridx >= 0; ridx--) {
    if (values[ridx][0] == tripNum) {  // Save the last (hopefully only) row w this tripNum
      rRow = []
      for (var cidx = 0; cidx < values[ridx].length; cidx++)
        rRow.push(values[ridx][cidx]);
      Logger.log("Del Request Row: " + (ridx + 2));
      sheet.deleteRow(ridx + 2);  // 1 offset for hdr & base 0
    }
  }
  
  if (rRow.length == 0)
    rRow.push("ERROR:NO REQ DATA FOR TRIPNUM", tripNum);
  
  sheet = spreadsheet.getSheetByName('Confirmation');
  values = sheet.getSheetValues(2, 1, -1, -1)  // data w/o headers
  
  for (var ridx = values.length-1; ridx >= 0; ridx--) {
    if (values[ridx][0] == tripNum) {  // Save the last (hopefully only) row w this tripNum
      cRow = [];
      for (var cidx = 0; cidx < values[ridx].length; cidx++)
        cRow.push(values[ridx][cidx]);
      Logger.log("Del Confirmation Row: " + (ridx + 2));
      sheet.deleteRow(ridx + 2);  // 1 offset for hdr & base 0
    }
  }
  
  if (cRow.length == 0)
    cRow.push("ERROR:NO CONFIRMATION DATA FOR TRIPNUM", tripNum);
    
  var sheet = spreadsheet.getSheetByName('Log');
  sheet.appendRow(sanitizeData(rRow.concat(cRow)));
  
  lock.releaseLock();
}

// timed function to clear aged out data
// for each trip you have until sweepTimeX to both confirm or request & confirm entry are deleted.
function sweep () {
  var timeNow = parseInt(new Date().getTime()/1000);
  timeNow = 1479514200;
  var secInHr = 3600;
  
  var spreadsheet = SpreadsheetApp.openByUrl(ssUrl);
  var sheet = spreadsheet.getSheetByName('Requests');
  
  var lock = LockService.getScriptLock(); // Get a script lock, because we're about to modify a shared resource.
  lock.waitLock(30000); // Wait for up to 30 seconds for other processes to finish.
 
  var values = sheet.getSheetValues(2, 1, -1, -1)  // data w/o headers
  
  // del all trips that are 1hr past their start time
  for (var ridx = values.length-1; ridx >= 0; ridx--) {
    if (values[ridx][2] < timeNow - secInHr) {  // past trip commence time
      
      gmail (values[ridx][1], requestExpired);
      
      Logger.log("Sweep Del Request Row: " + (ridx + 2));
      sheet.deleteRow(ridx + 2);  // 1 offset for hdr & base 0
    }
  }
  
  var requests = getSheetVals('Requests');  // re-get updated requests data
  var sheet = spreadsheet.getSheetByName('Confirmation');
  var values = sheet.getSheetValues(2, 1, -1, -1)  // data w/o headers

  // del all lines with no trips in Requests sheet
  for (var ridx = values.length-1; ridx >= 0; ridx--) {
    Logger.log("Looking for tripnum : " + values[ridx][0]);
    if (myIndexOf(requests, 0, values[ridx][0]) == -1) {  // if tripNum isn't in Requests
      Logger.log("Sweep Del Confirmation Row: " + (ridx + 2));
      sheet.deleteRow(ridx + 2);  // 1 offset for hdr & base 0
    }
    Logger.log("Array retval : " + myIndexOf(requests, 0, values[ridx][0]));
  }

  lock.releaseLock();
  Logger.log("Sweep Done");
}

// if exist: request row for (id, tripnum)
// get confirmation row for (tripnum)
// return confirmation sheet
// arg: tripnum
function verifyConfirmRow(tripNum) {
  var userEmail = getUserEmail();
  
  var trips = getSheetVals('Requests');
  if (trips == null)
    throw ("Error could not access sheet: Requests");
  
  var myReqs = myFilterByText(trips, 0, tripNum); // my requests
  var myReq =  myFilterByText(myReqs, 1, userEmail);
  if (myReq.length = 0)  // do i have a trip by that number?
    throw ("Error: request table entry can not be found.");  // for that trip Number
                  
  var spreadsheet = SpreadsheetApp.openByUrl(ssUrl);
  var sheet = spreadsheet.getSheetByName('Confirmation');
  
  return (sheet);
}

// because the one with ArrayLib inexplicably does substring matches instead of exact matches
function myIndexOf(data, col, val) {
  for (idx = 0; data != null && idx < data.length; idx++) {
    if (data[idx][col] == val)
      return (idx);
  }
  return (-1);
}

// because the one with ArrayLib inexplicably does substring matches instead of exact matches
// arraylib is hopelessly friggin broken: dewolf2 = wolf2...  really?!
function myFilterByText(data, col, val) {
  retArr = [];
  if (typeof(val) == "string" || typeof(val) == "number")
    val = [val];

  for (idx = 0; idx < data.length; idx++) {
    for (aidx = 0; aidx < val.length; aidx++) {
      if (data[idx][col] == val[aidx])
        retArr.push(data[idx]);
    }
  }
  return (retArr);
}

// val can be string number or array of either
function sanitizeData(val) {
  var singleton = false;
  
  retArr = [];
  if (typeof(val) == "string" || typeof(val) == "number") {
    val = [val];
    singleton = true;
  }
  
  for (idx = 0; idx < val.length; idx++) {
    if (val[idx][0] == '=') // starting w = in a sheet == equation... so... disable it.
      retArr.push(' ' + val[idx]);
    else 
      retArr.push(val[idx]);
  }
  
  if (singleton)
    return (retArr[0]);
  else
    return (retArr);
}

////////////////////////
// IMPORT SHEET DATA  //
////////////////////////

// add offer to Requests table & send email
function addOffer(tripNum) {  // SANITY CHECK THAT DATA MAKES SENSE!!!
  userEmail = getUserEmail();
  
  var spreadsheet = SpreadsheetApp.openByUrl(ssUrl);
  var sheet = spreadsheet.getSheetByName('Confirmation');
  
//  if (data == null)  // what does google return on fail?  not documented
//    throw "Error could not access sheet: Confirmation";
  
  var lock = LockService.getScriptLock(); // Get a script lock, because we're about to modify a shared resource.
  lock.waitLock(30000); // Wait for up to 30 seconds for other processes to finish.

  sheet.appendRow(sanitizeData([tripNum, 0, 0, userEmail, 0]));
  
  var data = getSheetVals('Requests');
  var rowNum = myIndexOf(data, 0, tripNum);
  if (rowNum != -1) {
    theirEmail = data[rowNum][1];
    gmail (theirEmail, requestOfferTo);
  }
  
  var data = getSheetVals('users');
  var sheet = spreadsheet.getSheetByName('Users');

  var userIdx = myIndexOf(data, 0, userEmail); // get idx of first instance
  if (userIdx != -1) { // bump up trips offered
    userIdx += 2;  // adjust for lack of headers & that row is not 0 based
    var cell = sheet.getRange(userIdx, 3); 
    var cellValue = cell.getValue();
    cell.setValue(sanitizeData(cellValue + 1));
  } else // make new user entry
    sheet.appendRow(sanitizeData([userEmail, 0, 1, 0, 0]));
  
  lock.releaseLock();
  
  gmail (userEmail, requestOfferFrom);
  return ("DONE");
}

// change Confirm->Accept to 1   if trip is mine and offering user exists & send email
function acceptOffer(tripNum, offeredBy) { 
  var user = getUserEmail();
  
  var sheet = verifyConfirmRow(tripNum);
  var offers = getSheetVals('Confirmation');

  var lock = LockService.getScriptLock(); // Get a script lock, because we're about to modify a shared resource.
  lock.waitLock(30000); // Wait for up to 30 seconds for other processes to finish.
  
  // if we got here, all is verified
  for (ridx=0; ridx < offers.length; ridx++) { // find & change the cell
    if (offers[ridx][0] == tripNum && offers[ridx][3] == offeredBy) {
      var cell = sheet.getRange(ridx + 2, 5);  // offset for headers and base 0
      cell.setValue(sanitizeData(user));  // put my addy in collumn
      
      gmail (user, pleaseConfirm);
      gmail (offeredBy, pleaseConfirm);    
    }
  }
  
  lock.releaseLock();
  
  return ("DONE");
}

// change user confirm to Epoch    if other user confirm is 0 or within 10min of my confirm
// if delta > 10min  other user confirm = 0 & send email
function addConfirm (tripNum) {

  var sheet = verifyConfirmRow(tripNum);
  var offers = getSheetVals('Confirmation');
  
  var lock = LockService.getScriptLock(); // Get a script lock, because we're about to modify a shared resource.
  lock.waitLock(30000); // Wait for up to 30 seconds for other processes to finish.
  
  // if we got here, all is verified
  for (ridx=0; ridx < offers.length; ridx++) { // find & change the cell
    if (offers[ridx][0] == tripNum) {
      
      var myEmail = getUserEmail();
      var uOffer = sheet.getRange(ridx + 2, 4).getValue();   // get offering user address
      if (myEmail == uOffer) {  // test who is confirming
        var myCellNum = 3;
        var theirCellNum = 2;
        var theirEmail = sheet.getRange(ridx + 2, 5).getValue();  // maybe there maybe 0
      } else {  // we are the requesting user
        var myCellNum = 2;
        var theirCellNum = 3;
        var theirEmail = uOffer;
      }
      
      var myConfirmTime = parseInt(new Date().getTime()/1000);
      var theirConfirmTime = sheet.getRange(ridx + 2, theirCellNum).getValue();
      var timeoutSec = 600; // 10min
      
      if (theirConfirmTime == 0) {
        sheet.getRange(ridx + 2, myCellNum).setValue(sanitizeData(myConfirmTime)); // insert current epoch offset for headers and base 0
        lock.releaseLock();
        return ("DONE");
      } else {
        if (Math.abs(myConfirmTime - theirConfirmTime) <= timeoutSec) {  // inserting under timeout window
          sheet.getRange(ridx + 2, myCellNum).setValue(sanitizeData(myConfirmTime)); // insert current epoch offset for headers and base 0
          
          moveEntriesToLog(tripNum);  // trajectory finished! move info to logs now!
          var spreadsheet = SpreadsheetApp.openByUrl(ssUrl);
          var sheet = spreadsheet.getSheetByName('Feedback Queue');
          if (myEmail != theirEmail) {  // make sure somebody isn't gaming the ratings
            sheet.appendRow(sanitizeData([myEmail, theirEmail, myConfirmTime]));  // create feedback entries
            sheet.appendRow(sanitizeData([theirEmail, myEmail, theirConfirmTime])); 
          }
          
          lock.releaseLock();
          
          gmail (myEmail, bothConfirmed);
          gmail (theirEmail, bothConfirmed);
          
          return ("You are both confirmed for this trip! Don't forget to leave feedback!"); 
        } else {  // timeout exceeded
          sheet.getRange(ridx + 2, myCellNum).setValue(sanitizeData(myConfirmTime));
          sheet.getRange(ridx + 2, theirCellNum).setValue(0);
          lock.releaseLock();
          
          gmail (theirEmail, confirmExpired);
          
          return ("IMPORTANT: You are confirmed. The other user's confirmation has exceeded the timeout window.  The other user must confirm within 10min.");
        }
      } 
      lock.releaseLock();
      throw ("SANITY CHECK: addConfirm reached end.");
    }
  }
}

// change user feedback    if trip is mine, we both confirmed & send email
function addFeedback (rating, epoch) {  
  var userEmail = getUserEmail();
  var themAddr = '';
  if (rating > 5)
    return("Rating was greater than 5. Could not add.");
  
  var fbQ = getSheetVals('Feedback Queue');
  var spreadsheet = SpreadsheetApp.openByUrl(ssUrl);
  var sheet = spreadsheet.getSheetByName('Feedback Queue');

  var lock = LockService.getScriptLock(); // Get a script lock, because we're about to modify a shared resource.
  lock.waitLock(30000); // Wait for up to 30 seconds for other processes to finish.
  
  for (var ridx = fbQ.length-1; ridx >= 0; ridx--) {
    if (fbQ[ridx][0] == userEmail && fbQ[ridx][2] == epoch) { 
      Logger.log("Del Feedback Row: " + (ridx + 2));
      sheet.deleteRow(ridx + 2);  // 1 offset for hdr & base 0
      themAddr = fbQ[ridx][1];
    }
  }
  
  if (themAddr != '') {
    var users = getSheetVals('Users');
    var spreadsheet = SpreadsheetApp.openByUrl(ssUrl);
    var sheet = spreadsheet.getSheetByName('Users');
    
    for (var ridx = 0; ridx < users.length; ridx++) {
      uRow = users[ridx];
      if (uRow[0] == themAddr) {
        sheet.getRange(ridx + 2, 4).setValue(sanitizeData(uRow[3] + rating));
        sheet.getRange(ridx + 2, 5).setValue(sanitizeData(uRow[4] + 1));
      }
    }
  }
  
  lock.releaseLock();
  return ("DONE");
}

function addRequest(epoch, src, dst, notes) {  // SANITY CHECK THAT DATA MAKES SENSE!!!
  var userEmail = getUserEmail();
  var spreadsheet = SpreadsheetApp.openByUrl(ssUrl);
  var sheet = spreadsheet.getSheetByName('Requests');
  
  //if (sheet == null)
  //  throw "Error could not access sheet: Requests";
  
  var lock = LockService.getScriptLock(); // Get a script lock, because we're about to modify a shared resource.
  lock.waitLock(30000); // Wait for up to 30 seconds for other processes to finish.
  
  var appProps = PropertiesService.getScriptProperties();
  var tripNumber = Number(appProps.getProperty('nextTripNumber'));
  if (tripNumber == null) {
    appProps.setProperty('nextTripNumber', 0)
    tripNumber = 0;
  }
  
  sheet.appendRow(sanitizeData([tripNumber, userEmail, epoch, src, dst, notes]));
  
  var data = getSheetVals('Users');
  var sheet = spreadsheet.getSheetByName('Users');
  
  var userIdx = myIndexOf(data, 0, userEmail); // get idx of first instance
  if (userIdx >= 0) { // bump up trips requested
    userIdx += 2;  // adjust for lack of headers & that row is not 0 based
    var cell = sheet.getRange(userIdx, 2); 
    var cellValue = cell.getValue();
    cell.setValue(sanitizeData(cellValue + 1));
    
    Logger.log( userEmail + " " + userIdx + " "  + cellValue );
  } else // make new user entry
    sheet.appendRow(sanitizeData([userEmail, 1, 0, 0, 0]));
  
  appProps.setProperty('nextTripNumber', tripNumber + 1)
  lock.releaseLock();
  
  gmail (userEmail, postRequest)
  
  return ("DONE");  
}

/////////////////////////
// EXPORT SHEETS DATA  //
/////////////////////////

// Get X requests rows by page number
// pgNum: what page you want to see
function getReqRows (pgNum) {
  var maxDisplayRow = 10;

  data = getSheetVals('Requests');
  if (data == null)
    return JSON.stringify([[], [], 0]); 
  
  var uniqTripNum = ArrayLib.unique(data, 0);  // filter
  var sortTime = ArrayLib.sort(uniqTripNum, 2, true); // by ascending
  
  if (pgNum < 0) 
    pgNum = 0;
  
  while (pgNum != 0) {  // roll back till in range or 0
    if ( maxDisplayRow * pgNum > sortTime.length )
      pgNum--;
    else
      break;
  }
  
  data = getSheetVals('Users');
  if (data == null)
    return JSON.stringify([[], [], 0]); 
  
  var users = {};
  var requests = [];
  
  var startIdx = maxDisplayRow * pgNum;  
  
  for (var idx = startIdx; idx < sortTime.length && idx < startIdx + maxDisplayRow; idx++) {
    requests.push(sortTime[idx]);
    var id = sortTime[idx][1];  // get user id
    var userInfo = myFilterByText(data, 0, id);  // filter off col 0
    if (userInfo.length > 0) 
      users[id]=userInfo[0];
    else
      users[id]=[id,-1,-1,0,0];  // user entry does not exist: this should never happen
  }
  
  return JSON.stringify([requests, users, pgNum]);
}

// for every user in a col add dict entry
function getUserInfo (data, col) {
  userData = getSheetVals('Users');  
  if (userData == null)
    return null;
   
  var users = {};

  for (var idx=0; idx < data.length; idx++) {   
    var id = data[idx][col];  // get user id
    var userInfo = myFilterByText(userData, 0, id);  // look for the user
    if (userInfo.length > 0) 
      users[id]=userInfo[0];   // take the first one
    else
      users[id]=[id,-1,-1,0,0];  // user entry does not exist: this should never happen
  }
  
  return (users);
}

function getFeedbackRows (pgNum) {
  var userEmail = getUserEmail();
  
  var pendingFb = getSheetVals('Feedback Queue');
  if (pendingFb == null)
    return JSON.stringify([[], []]); 
  
  var myPFb = myFilterByText(pendingFb, 0, userEmail); // my requests
  
  var userDict = getUserInfo(myPFb, 1);
  
  return (JSON.stringify([myPFb, userDict]));
}

function getOfferRowsFromMe (pgNum) {
  var userEmail = getUserEmail();
  var myTripNums = [];  
  var myOffDict = {};
 
  var req = getSheetVals('Requests');
  if (req == null)
    return(JSON.stringify([[], {}, {}])); // return empty 
  
  var offers = getSheetVals('Confirmation');
  if (offers == null)
    return(JSON.stringify([[], {}, {}])); // return empty 
  
  var offersFromMe = myFilterByText(offers, 3, userEmail); // offers from me
  
  for (var idx = 0; idx < offersFromMe.length; idx++) { // assemble offers dict
    myOffDict[offersFromMe[idx][0]] = offersFromMe[idx];
  }

  for (var idx = 0; idx < offersFromMe.length; idx++) {    // gather all tripnums in my offers
    myTripNums.push(String(offers[idx][0]));               
  }  
  
  var reqRows = myFilterByText(req, 0, myTripNums);  // request array
  
  var userDict = getUserInfo(reqRows, 1);  // assemble user dict
  
  Logger.log(offersFromMe);
  Logger.log(myOffDict);
  Logger.log(userDict);
  //return(JSON.stringify([offersFromMe, myOffDict, userDict]))
  return(JSON.stringify([reqRows, myOffDict, userDict]))

}

// Get X offers rows by page number
// pgNum: what page you want to see
function getOfferRowsForMe (pgNum) {
  var userEmail = getUserEmail();
  var trips = getSheetVals('Requests');
  if (trips == null)
    return(JSON.stringify([[], {}, {}])); // return empty 
  
  var myTripNums = [];  
  var myReqDict = {};
  var uniqTrips = ArrayLib.unique(trips, 0);                  // all trip nums uniq
  var myReq = myFilterByText(uniqTrips, 1, userEmail);        // my requests
  for (var idx = 0; idx < myReq.length; idx++) {               // gather all my req trip nums as strings
    myTripNums.push(String(myReq[idx][0]));
    myReqDict[myReq[idx][0]] = myReq[idx];                     // store by trip number
  }  
  
  if (!myTripNums.length)
    return(JSON.stringify([[], {}, {}]));
       
  var offers = getSheetVals('Confirmation');
  if (offers == null)
    return(JSON.stringify([[], {}, {}])); // return empty 
    
  var offers = myFilterByText(offers, 0, myTripNums);  // find offers for me
  var userDict = getUserInfo(offers, 3);
  
  //Logger.log(myOffers);
  //Logger.log(myReqDict);
  //Logger.log(userDict);
  
  return (JSON.stringify([offers, myReqDict, userDict]));
}
 
// Todo v0.1:
// firefox/safari  flex css issues 
// not awesome for tiny screens


// bugs:
// Acceptable: > 1 feedbacks for exact same epoch but different users could give rating to wrong user   
// FIXED: (gave min 1hr window after start time to confirm) if sweepTime is 2am and your trip starts at 1:59am you have one minute to both confirm or your trip is deleted
// FIXED: array lib indexOf matches substrings..  wolf@... == 2wolf@...


// Todo Noncritical or Ongoing:
// move away from array2d lib it is horrible
// use field enumerations instead of integers
// locks... locking only a portion of the script does not make sense.  does it lock the whole script?
// test: need scriptlocks around get? yes.  scriptlock only protects parts of scripts.
// request time&date br 
// offers not sorted by time
// test: empty cells cause table population errs 
// convert all spreadsheet opening to util fcns using throw
// can only confirm within window of trip
