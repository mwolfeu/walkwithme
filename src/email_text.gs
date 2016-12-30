function gmail (user, textArr) {  
  Logger.log(user + " " + textArr);
  GmailApp.sendEmail(user, textArr[0], textArr[1] + emailFooter);
}

postRequest = ["Thanks for submitting a request!", "Your request will stay visible for up to an hour after the departure time.  If an offer to accompany you is received, you will get a notification email.  When (and only when) you meet with the other person and are about to take off you should both confirm your trip.  This will help us keep track of the successful trips.  You both need to confirm within 10 min of each other. If you (or they) exceed this timeout, one or both of you will need to re-confirm.  Once that happens, you are on your way!  Dont forget to leave feedback once the trip is done."];

requestExpired = ["Your request has expired.", "We are sorry we couldn't find anyone this time. Please review the help info on the start page and be cautious. If you need help, contact one of the groups therein."];

requestOfferFrom = ["You made an offer", "Thanks for your generosity! You will receive an email if your offer is accepted!"];

requestOfferTo = ["You have an offer", "Please go to the offers page to check it out, accept it, and email trip logistics to the other person."];

pleaseConfirm = ["Please Confirm Your Trip", "An offer has been made and accepted. If you need to, you can email trip logistics to the other person now. When (and only when) you meet with the other person and are about to take off you should both confirm your trip.  This will help us keep track of the successful trips.  You both need to confirm within 10 min of each other. If you (or they) exceed this timeout, one or both of you will need to re-confirm.  Once that happens, you are on your way!  Dont forget to leave feedback once the trip is done."]; 

confirmExpired = ["Your confirmation has expired!", "Please re-confirm making sure to do so within 10 min of the other person. If you (or they) exceed this timeout, one or both of you will need to re-confirm.  Once this is done, feedback will be enabled."];

bothConfirmed = ["Both parties have confirmed the trip!","We hope you have a good trip! Dont forget to leave feedback once the trip is done."];

emailFooter = "\nBest,\nThe App Team";
