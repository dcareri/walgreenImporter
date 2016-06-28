var csv = require('fast-csv');
var fs = require('fs');
var AWS = require("aws-sdk");

console.log("starting the message data importer");

// define which campaign we are working on
var campaignID = "Infusion2016";
var regionMessageTable = "dev_region_event_rules";
var campaignRulesTable = "dev_campaigns"

// get access to Dynamo and a unique ID generator
AWS.config.update( {
    region: "us-east-1"
});
var dynamoTable = new AWS.DynamoDB.DocumentClient();


// read the region event data messages which are in json formtat
var regionMessageData = require("C:\\latest sa source\\walgreenImporter\\campaigndata\\infusion message data V1.json");

console.log("just read the data message file");
console.log(regionMessageData);

// read the campaign ruless which are in json formtat
var campaignRulesData = require("C:\\latest sa source\\walgreenImporter\\campaigndata\\infusion operational rules V1.json");

console.log("just read the campaign rules json file");
console.log(campaignRulesData);

// read the qualifcation ruless which are in json formtat
console.log("starting to read the campaign qualification rules json file");
var qualificationRulesData = require("C:\\latest sa source\\walgreenImporter\\campaigndata\\infusion qualification rules V1.json");

console.log("just read the campaign qualification rules json file");
console.log(qualificationRulesData);

// process the region event locations (a list of geofences) by creating an entry in the region even table for each geofence
// Also need to customize the data messages associated with each geofence with the text description of the location from above

// read the geofence defintion file which is in comma delimited file format
// The file has column headers as named below. We skip the columns we don't care about
var stream = fs.createReadStream("C:\\Users\\dcare\\Documents\\infusion campaign\\test list of regions.csv");

csv
 .fromStream(stream, { headers : [, "fullRegionID", , "geofenceType", , "storeLocationtext"] })
 .on("data", function (geofenceDefinition) {
    // we read one row
    console.log(geofenceDefinition);
       
    // for each geofence we want to build a new or update an existing entry in dynamo
    // Each geofence item in dynamo will contain:
    //      a unique ID usign the current time
    //      the name of the campaign which in this case is infusion2016
    //      the fullRegionID which identifies the geofence
    //      the geofenceType which specifies the type of geofence, in this case driveToStore or storeEntry
    //      the set of 4 messages defined for the geofence customized by inserting the storeLocationText in each message

    // start by customizing the four messages with this geofences location text
    for (var i = 0; i < 4; i++) {
        console.log(regionMessageData.Messages[i].messageText);
        regionMessageData.Messages[i].messageText = regionMessageData.Messages[i].messageText.replace("%1", geofenceDefinition.storeLocationtext);
        console.log(regionMessageData.Messages[i].messageText);
    }
    
    
    // add the record to the database. If one currently exisits we will update it
    console.log("Adding or updating a new item...");
    var paramsRegion = {
        TableName: regionMessageTable,
        Item: {
            "campaignId": campaignID,
            "triggerType": geofenceDefinition.geofenceType,
            "regionId": geofenceDefinition.fullRegionID,
            "messageSet" : JSON.stringify(regionMessageData)        
        }
    };

    dynamoTable.put(paramsRegion, function (err, data) {
        if (err) {
            console.error("Unable to add region item. Error JSON:", JSON.stringify(err, null, 2));
        } 
    });
    
    console.log("Added region item:");

})
 .on("end", function () {
	
	// done with the region event table, now load the campaign definition table
	 var paramsCampaign = {
        TableName: campaignRulesTable,
	        Item: {
                    "campaignId": campaignID,
                    "campaignName": campaignID,
                    "alertLimit": 10,
                    "startDate": "2016-01-01 00:00:00",
                    "endDate":      "2016-12-31 23:59:59",
                    "isActive": true,
                    "messageLimit": 10,
                    "minTimeBetweenComms" : 10,
                    "operationalRules": JSON.stringify(campaignRulesData),
                    "qualificationRules": JSON.stringify(qualificationRulesData),
                    "messageSet" : "{\"Messages\" : {} }"       
                    }
		};
	
	
		console.log("writing to the campaign db");      
		dynamoTable.put(paramsCampaign, function (err, data) {
			if (err) {
				console.error("Unable to add campaign definition. Error JSON:", JSON.stringify(err, null, 2));
			} else {
				console.log("Added campaign definition:");
			}
		});


});


