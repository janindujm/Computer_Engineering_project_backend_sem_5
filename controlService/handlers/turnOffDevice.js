const { IoTDataPlaneClient, PublishCommand } = require('@aws-sdk/client-iot-data-plane');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { v4: uuidv4 } = require('uuid');

const iotClient = new IoTDataPlaneClient({ endpoint: `https://${process.env.IOT_ENDPOINT}`, region: 'us-east-1' });
const ddbClient = new DynamoDBClient({ region: 'us-east-1' });

exports.turnOffDevice = async (event) => {
  const { deviceId } = event;

  // 1️⃣ Publish OFF
  await iotClient.send(new PublishCommand({
    topic: 'esp32/commands',
    qos: 1,
    payload: Buffer.from(JSON.stringify({ command: 'OFF' })),
  }));

  // 2️⃣ Log zero readings in DynamoDB
  const now = new Date().toISOString();
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
};
