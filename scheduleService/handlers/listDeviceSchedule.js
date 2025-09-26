const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.SCHEDULE_TABLE_NAME; // DynamoDB table name from env

exports.listDeviceSchedule = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { deviceId } = body;

    if (!deviceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'deviceId is required' }),
      };
    }

    // Scan DynamoDB and filter by deviceId
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: 'deviceId = :d',
      ExpressionAttributeValues: {
        ':d': deviceId
      }
    };

    const result = await dynamoDb.scan(params).promise();
    const schedules = result.Items || [];

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        deviceId,
        schedules
      }),
    };

  } catch (error) {
    console.error('Error fetching schedules from DynamoDB:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'Error fetching schedules',
        error: error.message
      }),
    };
  }
};
