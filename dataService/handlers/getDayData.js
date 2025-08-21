const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.DYNAMODB_TABLE;

exports.getDayData = async (event) => {
  try {
    const body = event.queryStringParameters;
    const deviceId = body?.deviceId;
    const date = body?.date;

    if (!deviceId || !date) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing deviceId or date (YYYY-MM-DD)' }),
      };
    }

    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;

    const params = {
      TableName: TABLE_NAME,
      FilterExpression: 'device_id = :d AND #ts BETWEEN :start AND :end',
      ExpressionAttributeNames: {
        '#ts': 'timestamp',
      },
      ExpressionAttributeValues: {
        ':d': deviceId,
        ':start': dayStart,
        ':end': dayEnd,
      },
    };

    const result = await ddb.scan(params).promise();
    const items = result.Items || [];

    return {
      statusCode: 200,
      body: JSON.stringify(items),
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
