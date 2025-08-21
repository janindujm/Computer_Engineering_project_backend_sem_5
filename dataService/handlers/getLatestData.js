//import AWS SDK and create a DynamoDB DocumentClient instance
// This handler retrieves the latest data from a DynamoDB table named EnergyReadings


const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.DYNAMODB_TABLE; // EnergyReadings

exports.getLatestData = async (event) => {
  try {
    // Scan all items
    const result = await ddb.scan({ TableName: TABLE_NAME }).promise();
    const items = result.Items || [];

    if (items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'No items found' }),
      };
    }

    // Sort by timestamp descending
    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const latestItem = items[0];

    return {
      statusCode: 200,
      body: JSON.stringify(latestItem),
    };

  } catch (err) {
    console.error('Error fetching latest data:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
