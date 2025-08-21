// Import AWS SDK v3 clients
const { IoTDataPlaneClient, PublishCommand } = require('@aws-sdk/client-iot-data-plane');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { v4: uuidv4 } = require('uuid');

// Ensure endpoint has https://
const iotClient = new IoTDataPlaneClient({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: `https://${process.env.IOT_ENDPOINT}`,
});

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

exports.sendCommand = async (event) => {
  console.log("Incoming event:", JSON.stringify(event));

  try {
    const body = event.body ? JSON.parse(event.body) : event;
    const command = (body.command || '').toUpperCase();
    const deviceId = body.deviceId;

    console.log("Parsed body:", body);
    console.log("Command:", command, "DeviceId:", deviceId);

    if (!deviceId || !['ON', 'OFF'].includes(command)) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Invalid deviceId or command' }) };
    }

    // 1️⃣ Publish to IoT Core
    console.log("Publishing to IoT topic esp32/commands");
    await iotClient.send(new PublishCommand({
      topic: 'esp32/commands',
      qos: 1,
      payload: Buffer.from(JSON.stringify({ command })),
    }));

    // 2️⃣ Insert zero reading if OFF
    if (command === 'OFF') {
      const now = new Date().toISOString();
      console.log("Inserting OFF state into DynamoDB at", now);

      await ddbClient.send(new PutItemCommand({
        TableName: process.env.DYNAMODB_TABLE,
        Item: {
          id: { S: uuidv4() },
          timestamp: { S: now },
          device_id: { S: deviceId },
          voltage: { N: '0' },
          current: { N: '0' },
          power: { N: '0' },
          state: { S: 'OFF' },
        },
      }));
    }

    return { statusCode: 200, body: JSON.stringify({ message: `Command ${command} sent to ${deviceId}` }) };
  } catch (err) {
    console.error("Error details:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
