const { SchedulerClient, CreateScheduleCommand } = require('@aws-sdk/client-scheduler');
const { IoTDataPlaneClient, PublishCommand } = require('@aws-sdk/client-iot-data-plane');
const { v4: uuidv4 } = require('uuid');

const iotClient = new IoTDataPlaneClient({
  endpoint: `https://${process.env.IOT_ENDPOINT}`,
  region: process.env.AWS_REGION,
});

const schedulerClient = new SchedulerClient({ region: process.env.AWS_REGION });

exports.scheduleCommand = async (event) => {
  const body = event.body ? JSON.parse(event.body) : event;
  const { deviceId, seconds } = body;

  if (!deviceId || !seconds || seconds <= 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid deviceId or seconds' }),
    };
  }

  // 1️⃣ Turn ON device immediately
  await iotClient.send(new PublishCommand({
    topic: 'esp32/commands',
    qos: 1,
    payload: Buffer.from(JSON.stringify({ command: 'ON' })),
  }));

  // 2️⃣ Create EventBridge schedule to turn OFF after N seconds
const scheduleName = `turnOff-${deviceId}-${uuidv4()}`;
const future = new Date(Date.now() + seconds * 1000);
const offTime = future.toISOString().replace(/\.\d{3}Z$/, ''); // remove milliseconds & Z

await schedulerClient.send(new CreateScheduleCommand({
  Name: scheduleName,
  ScheduleExpression: `at(${offTime})`,
  FlexibleTimeWindow: { Mode: 'OFF' },
  Target: {
    Arn: process.env.TURN_OFF_LAMBDA_ARN,
    RoleArn: process.env.SCHEDULER_ROLE_ARN,
    Input: JSON.stringify({ deviceId }),
  },
}));


  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Device ${deviceId} turned ON for ${seconds} seconds`,
    }),
  };
};
