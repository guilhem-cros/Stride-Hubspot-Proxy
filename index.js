'use strict';
require('dotenv').config()
const express = require('express');
const cors = require('cors')
const bodyParser = require('body-parser');
const requestify = require('requestify');
const {response} = require("express");
const {all} = require("express/lib/application");

const PORT = 8000;
const BASE_URL = 'https://api.hubapi.com';
const API_OPTIONS = {
    headers: { Authorization: "Bearer " + process.env.HUBSPOT_API_TOKEN, "Content-Type": "application/json" }
};

const delay = ms => new Promise(res => setTimeout(res, ms));


const app = express();

app.use(cors())

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));



//ROUTES

/**
 * Calls hubspot API. Get the lifecycle stages metrics for contacts for a specified period.
 * Two params are needed : fromTimestamp and toTimestamp, beginning and ending of the period as timestamp
 * Send the response of the API or an error status if an error occurs.
 */
app.get('/contacts/lifecyclestages/count/by/months', (req, res)=>{
    let URL = BASE_URL + '/contacts/search/v1/external/lifecyclestages?fromTimestamp='+req.query.from+"&toTimestamp="+req.query.to;
    delay(1200).then(
    requestify.get(URL, API_OPTIONS)
        .then((result)=>{
            if(result.code===200) {
                res.json(result.body);
            } else {
                res.status(result.code).json(result.body)
            }
        })
        .catch((err)=>{
            console.error("Stages by months : " + err.body);
            res.status(500).send("Proxy can't get lifecycle stages analytics : " + err.body.message);
        }));
});

/**
 * Calls hubspot API for each stage and get the contacts that are currently in this stage.
 * Send as response a list of objects containing the lifecycle stage name and its total number of contact associated.
 * Send an error if an error occurs.
 */
app.get('/contacts/lifecyclestages/total/count/', async (req, res) => {
    const URL = BASE_URL + '/crm/v3/objects/contacts/search';
    const lifecycleStagesNames = ["other", "lead", "opportunity", "subscriber", "customer"];
    const ret = [];

    try {
        for (let i = 0; i < lifecycleStagesNames.length; i++) {
            const lifecycleStage = lifecycleStagesNames[i];
            const body = {
                filterGroups: [
                    {
                        filters: [
                            {
                                propertyName: "lifecyclestage",
                                operator: "EQ",
                                value: lifecycleStage,
                            },
                        ],
                    },
                ],
                limit: 0,
            };

            await delay(1200);
            const result = await requestify.post(URL, body, API_OPTIONS);
            if (result.code === 200) {
                let body = JSON.parse(result.body);
                const stageCount = { lifecycleStage: lifecycleStage, count: body.total };
                ret.push(stageCount);
            } else {
                res.status(result.code).json(response.body);
                throw new Error(response.body);
            }
        }

        res.json(ret);
    } catch (err) {
        console.error("Count lifecycle stages : " + err.body);
        res.status(500).send("Proxy can't get lifecycle stages counts: " + err.body.message);
    }
});

/**
 * Calls hubspot API and get every deal in a specified period and that are ina specified stage.
 * If no stage is passed in query, returns every deal matching the period passed in query.
 * If the stage is closedwon : take the closedate as reference, if not, take the createdate
 * Send as response the list of deals matching the filters, sorted by date, containing several properties
 * like the amount, dates, etc.
 * If an error occurs : send an error
 */
app.get('/deals/by/stage', async (req, res) => {
    const URL = BASE_URL + '/crm/v3/objects/deals/search';
    const pageSize = 100; // Number of objects to fetch per request

    try {
        const dateFilter = (req.query.stage != undefined && req.query.stage === "closedwon") ? "closedate" : "createdate";
        const filters = [
            {
                propertyName: dateFilter,
                operator: "BETWEEN",
                highValue: req.query.to,
                value: req.query.since
            }
        ];

        if (req.query.stage !== undefined) {
            filters.push({
                propertyName: "dealstage",
                operator: "EQ",
                value: req.query.stage,
            });
        }

        let allDeals = []; // Array to store all the deals

        let pageNumber = 1;
        let hasMore = true;
        let after = 0;

        while (hasMore) {
            const body = {
                filterGroups: [
                    {
                        filters: filters,
                    },
                ],
                properties: ["amount", "montant_devise", "dealstage", "dealname", "createdate", "closedate"],
                sorts: [
                    {
                        propertyName: "createdate",
                        direction: "ASCENDING"
                    }
                ],
                limit: pageSize,
                after: pageNumber > 1 ? after : undefined,
            };

            await delay(1200);
            const result = await requestify.post(URL, body, API_OPTIONS);

            if (result.code === 200) {
                const data = JSON.parse(result.body);
                const deals = data.results;
                allDeals.push(...deals); // Append the fetched deals to the array
                if (data.paging===undefined) {
                    hasMore = false; // Reached the end of pagination
                } else {
                    after = data.paging.next.after;
                    pageNumber++; // Move to the next page
                }
            } else {
                res.status(result.code).json(response.body);
                return;
            }
        }
        res.json(allDeals);
    } catch (err) {
        console.log("Contracts by stage : " + err.body);
        res.status(500).send("Proxy can't get deals: " + err.body.message);
    }
});

/**
 * Calls the hubspot API and get every contact matching a specified lifecycle stage.
 * If no satge is passed in query : default is customer
 * Send the array of matching contacts, containing several properties (dates, name, etc, lead convertion date)
 * Send an error is an error occurs
 */
app.get('/contacts/by/lifecyclestage', async (req, res) => {
    const URL = BASE_URL + '/crm/v3/objects/contacts/search';
    const pageSize = 100;

    try {
        const stageFilter = req.query.stage !== undefined ? req.query.stage : "customer"
        const filters = [
            {
                propertyName: "lifecyclestage",
                operator: "EQ",
                value: stageFilter,
            }
        ];

        let allContacts = []; // Array to store all the contacts

        let pageNumber = 1;
        let hasMore = true;
        let after = 0;

        while (hasMore) {
            const body = {
                filterGroups: [
                    {
                        filters: filters,
                    },
                ],
                properties: ["email", "firstname", "lastname", "createdate", "closedate", "hs_lifecyclestage_lead_date"],
                limit: pageSize,
                after: pageNumber > 1 ? after : undefined
            };

            await delay(1200);
            const result = await requestify.post(URL, body, API_OPTIONS);

            if (result.code === 200) {
                const data = JSON.parse(result.body);
                const contacts = data.results;
                allContacts.push(...contacts); // Append the fetched contacts to the array

                if (data.paging===undefined) {
                    hasMore = false; // Reached the end of pagination
                } else {
                    after = data.paging.next.after;
                    pageNumber++; // Move to the next page
                }
            } else {
                res.status(result.code).json(response.body);
                return;
            }
        }

        res.json(allContacts);
    } catch (err) {
        console.log("Contacts by lifecycle stage: " + err.body);
        res.status(500).send("Proxy encountered an error: " + err.body.message);
    }
});


app.listen(PORT, ()=>{
    console.log("Proxy listening");
})