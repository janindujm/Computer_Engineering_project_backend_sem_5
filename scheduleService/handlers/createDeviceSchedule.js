const { SchedulerClient, CreateScheduleCommand } = require('@aws-sdk/client-scheduler');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');

const schedulerClient = new SchedulerClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.createDeviceSchedule = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : event;
    const { deviceId, startTime, endTime, weekdays, name, isEnabled = true } = body;

    if (!deviceId || !startTime || !weekdays || weekdays.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing deviceId, startTime, or weekdays' }),
      };
    }

    const daysMap = {
      sunday: 'SUN',
      monday: 'MON',
      tuesday: 'TUE',
      wednesday: 'WED',
      thursday: 'THU',
      friday: 'FRI',
      saturday: 'SAT',
    };
    const dayCron = weekdays.map(d => daysMap[d.toLowerCase()]).join(',');

    const toCron = (time) => `cron(${time.minute} ${time.hour} ? * ${dayCron} *)`;

    // Generate unique names for EventBridge schedules
    const turnOnScheduleName = `turnOn-${deviceId}-${uuidv4()}`;
    const turnOffScheduleName = endTime ? `turnOff-${deviceId}-${uuidv4()}` : null;

    // Create turn ON schedule
    await schedulerClient.send(new CreateScheduleCommand({
      Name: turnOnScheduleName,
      ScheduleExpression: toCron(startTime),
      FlexibleTimeWindow: { Mode: 'OFF' },
      Target: {
        Arn: process.env.TURN_ON_LAMBDA_ARN,
        RoleArn: process.env.SCHEDULER_ROLE_ARN,
        Input: JSON.stringify({ deviceId, action: 'turnOn' }),
      },
      State: isEnabled ? 'ENABLED' : 'DISABLED',
    }));

    // Create turn OFF schedule if endTime exists
    if (endTime) {
      await schedulerClient.send(new CreateScheduleCommand({
        Name: turnOffScheduleName,
        ScheduleExpression: toCron(endTime),
        FlexibleTimeWindow: { Mode: 'OFF' },
        Target: {
          Arn: process.env.TURN_OFF_LAMBDA_ARN,
          RoleArn: process.env.SCHEDULER_ROLE_ARN,
          Input: JSON.stringify({ deviceId, action: 'turnOff' }),
        },
        State: isEnabled ? 'ENABLED' : 'DISABLED',
      }));
    }

    // Store schedule info in DynamoDB using scheduleName as the key
    const scheduleItem = {
      scheduleName: turnOnScheduleName, // Partition key
      deviceId,
      name: name || 'Unnamed',
      weekdays,
      startTime,
      endTime: endTime || null,
      isEnabled,
      turnOnScheduleName,
      turnOffScheduleName,
      createdAt: new Date().toISOString(),
    };

    await dynamoDb.put({
      TableName: process.env.SCHEDULE_TABLE_NAME,
      Item: scheduleItem,
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Schedule '${name || 'Unnamed'}' created for device ${deviceId}`,
        schedule: scheduleItem
      }),
    };

  } catch (error) {
    console.error('Error creating device schedule:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Error creating schedule', error: error.message }),
    };
  }
};
