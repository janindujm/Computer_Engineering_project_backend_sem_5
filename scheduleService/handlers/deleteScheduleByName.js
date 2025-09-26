const AWS = require('aws-sdk');
const { SchedulerClient, DeleteScheduleCommand } = require('@aws-sdk/client-scheduler');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const schedulerClient = new SchedulerClient({ region: process.env.AWS_REGION || 'us-east-1' });

exports.deleteScheduleByName = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : event;
    const { scheduleName } = body;

    if (!scheduleName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'scheduleName is required' }),
      };
    }

    // 1️⃣ Get schedule details from DynamoDB to retrieve Scheduler ARN if needed
    const getParams = {
      TableName: process.env.SCHEDULE_TABLE_NAME,
      Key: { scheduleName },
    };

    const result = await dynamoDb.get(getParams).promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, message: `Schedule '${scheduleName}' not found` }),
      };
    }

    // 2️⃣ Delete schedule from AWS Scheduler (optional if you are using Scheduler)
    if (result.Item.turnOnScheduleName) {
      await schedulerClient.send(new DeleteScheduleCommand({
        Name: result.Item.turnOnScheduleName,
      }));
    }

    if (result.Item.turnOffScheduleName) {
      await schedulerClient.send(new DeleteScheduleCommand({
        Name: result.Item.turnOffScheduleName,
      }));
    }

    // 3️⃣ Delete schedule from DynamoDB
    const deleteParams = {
      TableName: process.env.SCHEDULE_TABLE_NAME,
      Key: { scheduleName },
    };

    await dynamoDb.delete(deleteParams).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: `Schedule '${scheduleName}' deleted successfully` }),
    };

  } catch (error) {
    console.error('Error deleting schedule:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Error deleting schedule', error: error.message }),
    };
  }
};
