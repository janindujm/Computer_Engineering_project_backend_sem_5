const {
  IoTClient,
  CreateThingCommand,
  CreateKeysAndCertificateCommand,
  AttachPolicyCommand,
  AttachThingPrincipalCommand
} = require("@aws-sdk/client-iot");

const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");

// Initialize clients
const iot = new IoTClient({ region: "us-east-1" });
const dynamo = new DynamoDBClient({ region: "us-east-1" });

const TABLE_NAME = process.env.DEVICES_TABLE;

exports.addNewDevice = async (event) => {
  try {
    // Parse request body
    const {
      deviceName,
      name,
      room,
      config = {} // Expecting config object in body
    } = JSON.parse(event.body) || {};

    const finalDeviceName = deviceName || `device_${Date.now()}`;
    const policyName = "MyIoTPolicy";

    // 1. Create IoT Thing
    await iot.send(new CreateThingCommand({ thingName: finalDeviceName }));

    // 2. Create keys and certificate
    const certResponse = await iot.send(
      new CreateKeysAndCertificateCommand({ setAsActive: true })
    );

    // 3. Attach policy
    await iot.send(new AttachPolicyCommand({
      policyName,
      target: certResponse.certificateArn
    }));

    // 4. Attach cert to Thing
    await iot.send(new AttachThingPrincipalCommand({
      thingName: finalDeviceName,
      principal: certResponse.certificateArn
    }));

    // 5. Save device info in DynamoDB
    const newItem = {
      deviceId: { S: finalDeviceName },
      name: { S: name || "Updated Device Name" },
      room: { S: room || "Updated Room" },
      maxCurrent: { N: (config.maxCurrent || 15).toString() },
      maxPower: { N: (config.maxPower || 3000).toString() },
      safetyEnabled: { BOOL: config.safetyEnabled ?? true },
      reportInterval: { N: (config.reportInterval || 10).toString() },
      certificateId: { S: certResponse.certificateId },
      certificateArn: { S: certResponse.certificateArn },
      createdAt: { S: new Date().toISOString() }
    };

    await dynamo.send(new PutItemCommand({
      TableName: TABLE_NAME,
      Item: newItem
    }));

    // 6. Return response
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Device added successfully",
        device: {
          deviceId: finalDeviceName,
          name: newItem.name.S,
          room: newItem.room.S,
          maxCurrent: parseFloat(newItem.maxCurrent.N),
          maxPower: parseFloat(newItem.maxPower.N),
          safetyEnabled: newItem.safetyEnabled.BOOL,
          reportInterval: parseInt(newItem.reportInterval.N),
          certificateId: certResponse.certificateId,
          certificateArn: certResponse.certificateArn,
          createdAt: newItem.createdAt.S
        },
        certificatePem: certResponse.certificatePem,
        privateKey: certResponse.keyPair.PrivateKey,
        publicKey: certResponse.keyPair.PublicKey
      })
    };

  } catch (error) {
    console.error("Error adding device:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Error adding device",
        error: error.message
      })
    };
  }
};
