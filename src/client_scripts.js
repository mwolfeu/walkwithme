<!-- SPECIAL WIDGET CODE -->

<script>  // google maps widget code

      $.log = function(message){
        var $logger = $("#logger");
        $logger.html($logger.html() + "\n * " + message );
      }
      
      map_cur_input = "#loc_start"; // this is so broken 
      
      function map_set_input_val(addr) {
        $(map_cur_input).val(addr);
      }
      
      function map_init (field) {  // this IS a memory leak & maps canvas is so fragile w div hiding
        var options = {
          map: ".map_canvas"
        };
        
        $("#geocomplete").geocomplete(options)
          .bind("geocode:result", function(event, result){
            map_set_input_val(result.formatted_address);
          });
       
        $("#geocomplete").val("Union Square NY").trigger("geocode");
      }
      
</script>

<script>  // time date widget code

  var $fp = $( "#timeDate" ),
    now = moment( ).subtract( "seconds", 1 );
    
    $fp.filthypillow( {
      minDateTime: function( ) {
      return now;
    }   
  } );
  
  $fp.on( "focus", function( ) {
      $fp.filthypillow( "show" );
      } );
      
  $fp.on( "fp:save", function( e, dateObj ) {
      $fp.val( dateObj.format( "MMM DD YYYY hh:mm A" ) );
      $fp.filthypillow( "hide" );
      } );  
      
</script>

<!-- BESPOKE CODE -->
    
<script type="text/javascript">
  
  //////////////
  // GLOBALS  //
  //////////////
  
  var pgNum = 0;
  var userEmail = '';
    
  ///////////////////
  // STARTUP INIT  //
  ///////////////////

  window.onload = function(){
    google.script.run.withSuccessHandler(setUserEmail).getUserEmail();
    google.script.run.withSuccessHandler(writeReqRows).getReqRows(pgNum);
    f.addHeader("divReq", ['Id', 'Feedback', 'When', 'Start', 'End', 'Notes', 'Offer']);
    f.addHeader("gsReq",  ['Trip Number', 'Id',  'Epoch', 'Start', 'End', 'Notes']); // google sheet
    f.addHeader("gsUser", ['Id', 'Num Requested', 'Num Offered', 'Points', 'Num Feedback']);
    f.addHeader("gsConfirm",  ["Trip Number", "Confirmed Req", "Confirmed Off", "Offer Id", "Accepted"]);
    f.addHeader("divOffer", ["When", "Id", "Feedback", "Offer"]);
    f.addHeader("gsFeedback", ["Me", "Them", "My Confirm"]);
    f.addHeader("divFeedback", ["Confirmed On", "Id", "Feedback", "Option"]);

    $("#status").css('display','inline');// unhide default status page    
  }
  
  ////////////////
  // UTILITIES  //
  ////////////////
  
  // Field Enums for Sheet and Div Tables: Offers, Requests, Users, etc.
  f = {
    addHeader: function(tableName, fields) {
      this[tableName] = {};
      this[tableName]['headers'] = fields;
      for (var idx=0; idx < fields.length; idx++) {
        this[tableName][fields[idx].replace(/ /g, '_')] = idx; 
      }
    }
  };

  function setUserEmail (data) {
    userEmail = data;
    $('#request_leadin').html('Creating a new request for ' + userEmail + ':');
  }
  
  // Gen JS code for Dynamic Modal
  function genDynModalOnClickCode (key, text, onclickFooter) {
    if (typeof(onclickFooter)==='undefined') onclickFooter = "";
    var html = '';
    html += '<script>  $("#' + key + '").click(function() {  \
                       $("#modal_dyn").html("' + text + '"); \
                       $("#modal_dyn").modal({               \
                         fadeDuration: 100                   \
                       });                                   \
                      ' + onclickFooter + '                 \
                     }); <\/script>';
    return (html);
  }
  
  ///////////////////////////
  //  HTML TABLE CELL GEN  //
  ///////////////////////////

  function genHeaderHtml (headers) {
    var html = '';
    html += '<div class="divTableRow">';
    for (var idx=0; idx < headers.length; idx++) {
      html += '<div class="divTableCell">';
      html += headers[idx];
      html += '</div>';
    }
    html += '</div>';
    return (html);
  }

function genFieldId (userRow, tableName, rowNum) {
  var icon = 'https://openclipart.org/image/2400px/svg_to_png/247319/abstract-user-flat-3.png'
  var id = userRow[f.gsUser.Id];
  var numOff = userRow[f.gsUser.Num_Offered];
  var numReq = userRow[f.gsUser.Num_Requested];
  var key = tableName + rowNum + 'Id';
  var html = '';
  html += '<img title="' + id + '" class="icon_com" id="' + key + '" src="' + icon + '" alt="id">';
  var text = 'User name: ' + id + '<br><br>Trips Offered: ' + numOff + '<br>Trips Requested: ' + numReq;
  html += genDynModalOnClickCode (key, text);
  return (html);
}

// arg: request row or epoch number
function genFieldWhen (arg) {
  var html = '';
  if (typeof(arg) == 'number')
    var d = new Date(arg * 1000);
  else
    var d = new Date(arg[f.gsReq.Epoch] * 1000);
  html += d.toLocaleDateString();
  html += " "
  html += d.toLocaleTimeString();
  return (html);
}

function genFieldFeedback (userRow, tableName, rowNum, isActive) {
  if (typeof(isActive)==='undefined') isActive = false;
  var points = userRow[f.gsUser.Points];
  var numFeedback = userRow[f.gsUser.Num_Feedback];
  if (numFeedback == 0) numFeedback++;  // avoid div 0 errs
  var feedback = points / numFeedback;
  var html = '';
  
  if (isActive == false) // do normal static 
    var foot = ", readOnly: true}); <\/script>";
  else  // do active
    var foot = ", halfStar: true,  ratedFill: '#3D96F5'}); <\/script>";
  html += '<div id="' + tableName + rowNum + 'Rating"> FeedbackWidget </div>';
  html += '<script>  $("#' + tableName + rowNum + 'Rating").rateYo({ \
                       rating: ' + feedback + foot;
  return (html);
}

function genFieldLocation (reqRow, isSrc) {
  var tripNum = reqRow[f.gsReq.Trip_Number];
  if (isSrc) {
    var loc = reqRow[f.gsReq.Start];
    var tripNumLoc = tripNum + "LocStart";  // number and location
  } else {
    var loc = reqRow[f.gsReq.End];
    var tripNumLoc = tripNum + "LocEnd";
  }
  var html = '';
  var mapUrl = 'https://maps.google.com/maps/api/staticmap?sensor=false&size=400x300&markers=' + String(loc).replace(/[\W_]+/g, "+");  // Del spaces - form proper URL
  
  html += '<img Title="' + loc + '" class="icon_com" id="' + tripNumLoc + '" src="https://cdn3.iconfinder.com/data/icons/pyconic-icons-1-2/512/location-map-512.png" alt="Location">';
  var text = 'Address: ' + loc + ' <br> <img src=\\"' + mapUrl + '\\">';
  html += genDynModalOnClickCode (tripNumLoc, text);
  return (html);
}

function genFieldSubmit (uniqKey, fcnCall, buttonText, color) {
  if (typeof(color)==='undefined') color = false;
  var html = '';
  
  if (!color)
    html += '<div class="appButton" id="' + uniqKey + '_B">' + buttonText + '</div>';
  else
    html += '<div class="appButton" style="background: ' + color + '" id="' + uniqKey + '_B">' + buttonText + '</div>';
      
  html += '<script>  $("#' + uniqKey + '_B' + '").click(function() {  \
                      ' + fcnCall + '}); <\/script>';                          
  
  // html += genDynModalOnClickCode (tableName + ridx + "Help", text, fcnFooter);
  return (html);
}

  ///////////////////////////////
  // GOOGLE CALLS & CALLBACKS  //
  ///////////////////////////////

  // TODO use text feedback from server side

  // Start process of making offer: Add offer to table. Send email to helper.
  function addOffer(tripNum) {
    google.script.run.withSuccessHandler(addOfferCB).addOffer(tripNum);  // TODO: sanity check
  }

  // Start process of accepting offer: Send status update emails
  function acceptOffer (tripNum, offerBy) {
    google.script.run.withSuccessHandler(acceptOfferCB).acceptOffer(tripNum, offerBy);
  }

  function addConfirm(tripNum) {
    google.script.run.withSuccessHandler(addConfirmCB).addConfirm(tripNum); // add confirm time for user
  }
  
  function addFeedback(widgetId, cTime) {
    var rating = $(widgetId).rateYo("rating");
    google.script.run.withSuccessHandler(addFeedbackCB).addFeedback(rating, cTime); // add to rating - delete listing - reload gui
  }
  
  function addOfferCB (text) {
    if (text == "DONE")
      text = 'Thanks for your offer!<p>Both parties have been notified via email. If chosen, you will receive a status update email at ' + userEmail + ' detailing the next steps. </p>'
    google.script.run.withSuccessHandler(writeReqRows).getReqRows(pgNum);
    $("#modal_dyn").html(text);
    $("#modal_dyn").modal({
      fadeDuration: 100
    });
  }   
  
  function acceptOfferCB (text) {
    if (text == "DONE")
      text = "You have accepted an offer!<p>Both parties have been notified of your acceptance via email. You will receive a status update email detailing the next steps. </p>";
    google.script.run.withSuccessHandler(writeOfferRowsForMe).getOfferRowsForMe(0); // reload rows
    $("#modal_dyn").html(text);
    $("#modal_dyn").modal({
      fadeDuration: 100
    });
  } 
  
  function addConfirmCB(text) {
    if (text == "DONE")
      text = "You have confirmed!<p>When the other party confirms within 10min you will be on your way!</p>";
    google.script.run.withSuccessHandler(writeOfferRowsForMe).getOfferRowsForMe(0); // reload rows
    google.script.run.withSuccessHandler(writeOfferRowsFromMe).getOfferRowsFromMe(0); // reload rows
    google.script.run.withSuccessHandler(writeFeedbackRows).getFeedbackRows(0);
    $("#modal_dyn").html(text);
    $("#modal_dyn").modal({
      fadeDuration: 100
    });
  }  
  
  function addFeedbackCB(text) {
    if (text == "DONE")
      text = "Your feedback has been received!<p>It will be aggregated into existing feedback.  Thanks for participating.</p>";
    google.script.run.withSuccessHandler(writeFeedbackRows).getFeedbackRows(0);
    $("#modal_dyn").html(text);
    $("#modal_dyn").modal({
      fadeDuration: 100
    });
  }  
  
  // Request Submission
  function addRequestCB (text) {
    if (text == "DONE")
      text = "Success:<p> Your request has been submitted.  You will receive replies via email.</p>";
    google.script.run.withSuccessHandler(writeReqRows).getReqRows(pgNum);  
    $("#modal_dyn").html(text);
    $("#modal_dyn").modal({
      fadeDuration: 100
    });  
    
    $("#timeDate, #loc_start, #loc_dest, #req_notes").val('');
    
    $(".content").each (function() {  // go back to status screen
      $( this ).css('display','none')
    });
    $("#status").css('display','inline-block');
    
  }
  
  /////////////////////////
  // HTML TABLE ROW GEN  //
  /////////////////////////

  // generate a Feedback table row interpreting data where necessary
  // data: array of table data
  //  f.addHeader("gsFeedback", ["Me", "Them", "My Confirm"]);
  //  f.addHeader("divFeedback", ["Confirmed On", "Id", "Feedback", "Option"]);
function writeFeedbackRows (jsonData)  {    
  var data = JSON.parse(jsonData);   
  var fb = data[0]; // feedback table array
  var u = data[1]; // user dict
  var html = '';
    
  html = genHeaderHtml(f.divFeedback.headers);
  if (fb.length == 0) {
    $('#feedbackTable').html('There is no one to give feedback on yet.');
    return;
  }
    
  for (var ridx = 0; ridx < fb.length; ridx++) {  // each row of the table
    var fbRow = fb[ridx]; // row of confirm table
    var userRow = u[fbRow[f.gsFeedback.Them]];
    
    html += '<div class="divTableRow">';
    var id = '';
    var cTime = fbRow[f.gsFeedback.My_Confirm];
    
    for (var cidx=0; cidx < f.divFeedback.headers.length; cidx++) {  // each col of the div table
      html += '<div class="divTableCell">';  // gen id trips taken / offered dyn mod
      
      switch (cidx) {
        case f.divFeedback.Confirmed_On:
          var request = cTime;
          html += genFieldWhen(request);
          break;
            
        case f.divFeedback.Id:
          html += genFieldId(userRow, 'Feedback', ridx);
          break;
         
        case f.divFeedback.Feedback:
          html += genFieldFeedback(userRow, 'Feedback', ridx, true);
          break;
          
        case f.divFeedback.Option:
          var offerBy = userRow[0];
          var key = 'Feedback' + ridx    
          html += genFieldSubmit (key, 'addFeedback("' + '#' + key + 'Rating","' + cTime + '");', "Send It", "#3D96F5");
          break;
      }
      html += '</div>';
   }
   html += '</div>';
  }
  
  if (html == '')
      return;
    
  $('#feedbackTable').html(html);
}
  
  // generate a OFFERS FROM table row interpreting data where necessary
  // data: array of table data
function writeOfferRowsFromMe (jsonData)  {    
  var data = JSON.parse(jsonData);   
  var r = data[0]; // request table array
  var o = data[1]; // my offers dict
  var u = data[2]; // user dict
  var html = '';
  
  html = genHeaderHtml(f.divOffer.headers);
  if (r.length == 0) {
    $('#offerFromTable').html("There are no current accepted offers from you");
    return;
  }
  
  for (var ridx = 0; ridx < r.length; ridx++) {  // each row of the table
    var rRow = r[ridx]; // row of table
    var userRow = u[rRow[f.gsReq.Id]];
    
    html += '<div class="divTableRow">';
    var id = '';
    var tripNum = rRow[f.gsReq.Trip_Number];
    var confirm = o[tripNum];
      
    for (var cidx=0; cidx < f.divOffer.headers.length; cidx++) {  // each col of the div table
      html += '<div class="divTableCell">';  // gen id trips taken / offered dyn mod
      
      switch (cidx) {
        case f.divOffer.When:
          html += genFieldWhen(rRow);
          break;
            
        case f.divOffer.Id:
          html += genFieldId(userRow, 'OffersFrom', ridx);
          break;
         
        case f.divOffer.Feedback:
          html += genFieldFeedback(userRow, 'OffersFrom', ridx);
          break;
          
        case f.divOffer.Offer:
          var offerBy = userRow[0];
          var key = 'OffersFrom' + ridx;
          html += genFieldSubmit (key, 'addConfirm("' + tripNum + '");', "Confirm", "#FA3A00");
          break;
      }
      html += '</div>';
   }
   html += '</div>';
  }
  
  if (html == '')
      return;
    
  $('#offerFromTable').html(html);
}

  // generate a OFFERS FOR table row interpreting data where necessary
  // data: array of table data
function writeOfferRowsForMe (jsonData)  {    
  var data = JSON.parse(jsonData);   
  var c = data[0]; // confirmation table array
  var r = data[1]; // request dict
  var u = data[2]; // user dict
  var html = '';
  
  html = genHeaderHtml(f.divOffer.headers);
  if (c.length == 0) {
    $('#offerForTable').html("There are no current offers for you");
    return;
  }
    
  for (var ridx = 0; ridx < c.length; ridx++) {  // each row of the table
    var cRow = c[ridx]; // row of confirm table
    var userRow = u[cRow[f.gsConfirm.Offer_Id]];
    
    html += '<div class="divTableRow">';
    var id = '';
    var tripNum = cRow[f.gsConfirm.Trip_Number];
    var request = r[tripNum];
      
    for (var cidx=0; cidx < f.divOffer.headers.length; cidx++) {  // each col of the div table
      html += '<div class="divTableCell">';  // gen id trips taken / offered dyn mod
      
      switch (cidx) {
        case f.divOffer.When:
          var request = r[tripNum];
          html += genFieldWhen(request);
          break;
            
        case f.divOffer.Id:
          html += genFieldId(userRow, 'Offers', ridx);
          break;
         
        case f.divOffer.Feedback:
          html += genFieldFeedback(userRow, 'Offers', ridx);
          break;
          
        case f.divOffer.Offer:
          var offerBy = userRow[0];
          var key = 'Offers' + ridx;
          if (cRow[f.gsConfirm.Accepted] == 0) {
            html += genFieldSubmit (key, 'acceptOffer("' + tripNum + '","' + offerBy + '");',  "Accept");
          } else {
            html += genFieldSubmit (key, 'addConfirm("' + tripNum + '");', "Confirm", "#FA3A00");
          }
          break;
      }
      html += '</div>';
   }
   html += '</div>';
  }
  
  if (html == '')
      return;
    
  $('#offerForTable').html(html);
}

// generate a REQUESTS table row interpreting data where necessary
  // data: array of table data
  function writeReqRows(jsonData) {   
    var data = JSON.parse(jsonData);
    var r = data[0]; // request array
    var u = data[1]; // user info array
    pgNum = data[2]; // update page number
    var html = '';
    
    if (r.length == 0) {
      $('#statusTable').html("There are no active requests");
      return;
    }
    
    html = genHeaderHtml(f.divReq.headers);
    
    for (var ridx = 0; ridx < r.length; ridx++) {  // each row of the table
      var rRow = r[ridx];
      var id = rRow[f.gsReq.Id];
      var tripNum = rRow[f.gsReq.Trip_Number];
      
      html += '<div class="divTableRow">';
      
      for (var cidx=0; cidx < f.divReq.headers.length; cidx++) {  // each col of the div table
        html += '<div class="divTableCell">';  
        
        switch (cidx) {
          case f.divReq.Id:
            html += genFieldId (u[id], "Requests", ridx);
            break;
            
          case f.divReq.Feedback:
            html += genFieldFeedback (u[id], "Requests", ridx)
            break;
            
          case f.divReq.When:
            html += genFieldWhen(rRow);
            break;
            
          case f.divReq.Start:
            html += genFieldLocation (rRow, true);
            break;
            
          case f.divReq.End:
            html += genFieldLocation (rRow, false);
            break;
            
          case f.divReq.Notes:
            if (rRow[f.gsReq.Notes] == '')
              rRow[f.gsReq.Notes] = 'No Additional Notes';
              
            html += '<img title="' + rRow[f.gsReq.Notes] + '" class="icon_com" id="' + tripNum + 'Notes" src="https://image.freepik.com/free-icon/comment-ios-7-interface-symbol_318-35334.png" alt="comments">';
            text = 'Comments:<p>' + rRow[f.gsReq.Notes] + '</p>';           
            html += genDynModalOnClickCode (tripNum + "Notes", text)
            break;
          
          case f.divReq.Offer:  
            var key = "Requests" + ridx;
            html += genFieldSubmit (key, 'addOffer("' + tripNum + '");', "Help");
            break; 
            
          default:  // just display the data as is
            html += rRow[cidx];
        }
        html += '</div>';
      } 
      html += '</div>';
    }
    
    if (html == '')
      return;
    
    $('#statusTable').html(html);
  } 

  ///////////////////
  // ENTRY FIELDS  //
  ///////////////////

  $("#loc_start").click(function() {
    $("#modal_map").modal({
      fadeDuration: 0
    });
    map_cur_input = this;
    map_init("src");
  });
  
  $("#loc_dest").click(function() {
    $("#modal_map").modal({
      fadeDuration: 0
    });
    map_cur_input = this;
    map_init("dst");
  });
  

  ////////////////////
  // BUTTON ACTIONS //
  ////////////////////
  
  $( "#navigate" ).change(function() {
    switch ($( "#navigate" ).val()) {
      case "req":
        $(".content").each (function() {
          $( this ).css('display','none')
        });
        $("#request").css('display','inline');
        break;
      case "ofb":
        $(".content").each (function() {
          $( this ).css('display','none')
        });
        $("#offers").css('display','inline-block');
        google.script.run.withSuccessHandler(writeFeedbackRows).getFeedbackRows(0);
        google.script.run.withSuccessHandler(writeOfferRowsForMe).getOfferRowsForMe(0);
        google.script.run.withSuccessHandler(writeOfferRowsFromMe).getOfferRowsFromMe(0);
        break;
   }
   $( "#navigate" ).val("main")
 });
  
  // "Help" modal setup
  $("#b_help").click(function() {
    $("#modal_help").modal({
      fadeDuration: 300
    });
  });
  
  // submit help request
  $("#b_request_sub").click(function() {
    if ($("#loc_start").val() == '' || $("#loc_dest").val() == '' ||  $("#timeDate").val() == '') {
      $("#modal_dyn").html("Error:<p> Please verify that you have filled in the time, start, and end fields.</p>");
      $("#modal_dyn").modal({
        fadeDuration: 100
      });      
      return;
    }
    var epochTime = new moment($("#timeDate").val(), "MMM D YYYY h:m a").unix();
    google.script.run.withSuccessHandler(addRequestCB).addRequest(epochTime, $("#loc_start").val(), $("#loc_dest").val(), $("#req_notes").val());
  });

  // title brings you back to status
  $("#b_title").click(function() {
    $(".content").each (function() {
      $( this ).css('display','none')
    });
    $("#status").css('display','inline-block');
    google.script.run.withSuccessHandler(writeReqRows).getReqRows(pgNum);
  });
  
  // request button setup
  //$("#b_status_req").click(function() {
  //  $(".content").each (function() {
  //    $( this ).css('display','none')
  //    });
  //  $("#request").css('display','inline');
  //});
  
  // view next button setup
  $("#b_status_vnext").click(function() {
    google.script.run.withSuccessHandler(writeReqRows).getReqRows(pgNum + 1);
  });
  
  // view previous button setup
  $("#b_status_vprev").click(function() {
    google.script.run.withSuccessHandler(writeReqRows).getReqRows(pgNum - 1);
  });
    
  // check out your offers
  //$("#b_offers").click(function() {
  //  $(".content").each (function() {
  //    $( this ).css('display','none')
   //   });
   // $("#offers").css('display','inline-block');
  //  google.script.run.withSuccessHandler(writeFeedbackRows).getFeedbackRows(0);
  //  google.script.run.withSuccessHandler(writeOfferRowsForMe).getOfferRowsForMe(0);
  //});
  
  // Confirmation page when starting a trip
  $("#b_confirm").click(function() {
    $(".content").each (function() {
      $( this ).css('display','none')
      });
    $("#confirm").css('display','inline');
  });
  
  // Feedback on users for trips taken
  $("#b_feedback").click(function() {
    $(".content").each (function() {
      $( this ).css('display','none')
      });
    $("#feedback").css('display','inline-block');
  });

  //$("#map_address").click(function() {
  //  $( this ).val("");
  //});

  // receive an array of possible addresses.  Poplate input widget.
  //function popMapInput (data) {
  //  var html='' 
  //  if (data.length > 0)
  //    alert(data[0]["formatted_address"]);
  //  else {
  //    $("#map_list").html("<option value=\"No Addresses Found\">");
  //  }
  //}
  $("#map_address").keyup(function() {
    $("#b_map_search").click();
  });
  
  $("#b_map_search").click(function() {
    //google.script.run.withSuccessHandler(popMapInput).getLocation($("#map_address"));
    var inputText = $('#map_address').val();
    var mapUrl = 'https://maps.google.com/maps/api/staticmap?sensor=false&size=400x300&markers=' + String(inputText).replace(/[\W_]+/g, "+");  // Del spaces - form proper URL
    $('#map_pic').attr("src",mapUrl);
  });
  
  $("#b_map_select").click(function() {
    var inputText = $('#map_address').val();
    $('#map_address').val('');
    $(map_cur_input).val(inputText);
    $("#map_close").click();
    //s$('#modal_map').attr("rel","modal:close");
  });

  
</script>

