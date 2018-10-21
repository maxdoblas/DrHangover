/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const functions = require('firebase-functions')
const {BrowseCarouselItem, BrowseCarousel, dialogflow, Image, Permission } = require('actions-on-google');
const admin = require('firebase-admin')

admin.initializeApp({
    credential: admin.credential.applicationDefault()
})
const app = dialogflow({debug: true})
const db = admin.firestore()

const hdb = db.collection('Hangover')

var coordinates
app.intent('Init', (conv) => {
    conv.data.requestedPermission = 'DEVICE_PRECISE_LOCATION';
    return conv.ask(new Permission({
    context: 'to locate you',
    permissions: conv.data.requestedPermission,
}));
});


app.intent('user_info', (conv, params, permissionGranted) => {
    if (permissionGranted) {
        const { requestedPermission } = conv.data;
        if (requestedPermission === 'DEVICE_PRECISE_LOCATION') {
         
            coordinates = conv.device.location;
            // const city=conv.device.location.city;
            if (coordinates) {
                conv.ask("Are you at a party right now?")
            } else {
        // Note: Currently, precise locaton only returns lat/lng coordinates on phones and lat/lng coordinates
        // and a geocoded address on voice-activated speakers.
        // Coarse location only works on voice-activated speakers.
                return conv.close('Sorry, I could not figure out where you are.');
            }
 
        }
    } else {
        return conv.close('Sorry, permission denied.');
    }
});


app.intent('Add_location', conv => {
    db.collection("Hangover").add({
        Time: admin.firestore.FieldValue.serverTimestamp(),
        Location: coordinates,
        Message: conv.parameters['msg']
    })
    conv.close('Message added')
})

app.intent('Remember', conv => { 
    conv.ask("Let me help you?")
    
    
    var entries = [];
    var j = 0;
    var items = [];
    db.collection('Hangover').get().then(function(querySnapshot) {
            querySnapshot.forEach(function(doc) {
               entries.push(doc.data())
               doc.delete();
               });
        }).catch(function(error) {
        console.log("Error getting documents: ", error);
    })
    entries.sort(function(a,b){return b.time - a.time});
     
    for(var i = 0; i < entries.length; i++){
          var temp = entries.pop();
          var mapsUrl = 'https://www.openstreetmap.org/?mlat=' + temp.Location.latitude.toString() + '&mlon=' + temp.Location.longitude.toString();
          items[i] = new BrowseCarouselItem({title: temp.Time.toString(), url: mapsUrl, description: temp.Mesage, footer: 'Item 1 footer'});
    }
    if (items.length>1) conv.ask(new BrowseCarousel({items}));
    else conv.ask("Not enough data");
      
})

app.intent('Default Fallback Intent', conv => {
  conv.ask(`I didn't understand`)
  conv.ask(`I'm sorry, can you try again?`)
})

app.intent('Location_unknown',conv => {
    conv.ask('You\'re at coordinates {coordinates}')
})

app.intent('Goodbye', conv => {
  conv.close('See you later!')
})

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app)
