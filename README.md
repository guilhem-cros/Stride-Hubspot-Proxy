# Express Server for HubSpot Analytics

This Express server provides an API to interact with the HubSpot API to gather analytics and data related to HubSpot contacts and deals. The server is built to handle GET and PUT requests for retrieving and updating variables stored in a JSON file. The server also acts as a proxy to the HubSpot API for retrieving analytics data.

## Getting Started

1. Install the required dependencies using npm:

   ```bash
   npm install

2. Create a .env file in the root directory of the project and set your HubSpot API token:
   ```bash
   HUBSPOT_API_TOKEN=your_hubspot_api_token_here

3. Start the server:
   ```bash
   npm start
The server will run on port 8000 by default.

## Endpoints

### GET /contacts/lifecyclestages/count/by/months
This endpoint calls the HubSpot API to get the lifecycle stage metrics for contacts for a specified period. The required query parameters are from and to, representing the beginning and ending of the period as timestamps. The response will contain the API response or an error status if an error occurs.

### GET /contacts/lifecyclestages/total/count
This endpoint calls the HubSpot API for each lifecycle stage and retrieves the total number of contacts associated with each stage. The response will be a list of objects, each containing the lifecycle stage name and its total contact count. An error response will be sent if an error occurs.

### GET /deals/by/stage
This endpoint calls the HubSpot API and retrieves deals within a specified period and optionally filtered by a specific stage. If no stage is specified in the query, it returns all deals matching the period. The response will be a list of deals sorted by date and containing various properties like amount, dates, etc. An error response will be sent if an error occurs.

### GET /contacts/by/lifecyclestage
This endpoint calls the HubSpot API and retrieves contacts matching a specified lifecycle stage. If no stage is specified in the query, the default is "customer." The response will contain an array of matching contacts with properties like dates, name, lead conversion date, etc. An error response will be sent if an error occurs.

### GET /constants
This endpoint retrieves the variables stored in the data.json file. The response will contain the JSON data with your server's variables or an error status if an error occurs.

### PUT /constants
This endpoint updates the variables stored in the data.json file. The request body should be a JSON object containing the variables you want to update. The response will contain { "success": true } upon a successful update or an error status if an error occurs.

## Note
- The server introduces a delay of 1500ms between requests to the HubSpot API to avoid rate-limiting issues.
- Ensure that your .env file contains the correct HubSpot API token to access the HubSpot API.
- The server uses CORS and allows requests from any origin for simplicity. For production deployment, configure CORS settings accordingly.
