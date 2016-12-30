# Walk With Me
<pre>
In response to the recent elections, I attended an action planning meeting hosted by (among others) New School Politics professor Deva Woodly.  

  Following up on the Nov 10th talk, it was expressed that there would be interest in an app which matched people who want
to travel to a location (but feel unsafe) with those who would accompany them.  I took time in the week following to research such an app and, not finding a suitable match, to write one.
 
  My app is mostly fleshed out by now with the exeception of a mobile interface. Provided are screenshots of the current revision.  We are currently in the initial stages of a university wide deployment and buildout of a support community.  Beta testing should begin in the next semester.

Functionality:
  Request a walking companion
  Offer accompaniment
  Confirmation & User Rating UI
  Google Maps ReST API to pick a start and end location
  Google Email API to send verification, confirmation, clarification emails

Required Libs:
  Moment
  JQuery
  Modal
  FilthyPillow
  RateYo
  
Backend:
  Google Apps Script with an instrumented spreadsheet to function as a DB store.
  
Authentication is performed by Google/NS Radius 
</pre>
