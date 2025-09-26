const {
  IoTClient,
  DeleteThingCommand,
  DetachThingPrincipalCommand,
  ListThingPrincipalsCommand
} = require("@aws-sdk/client-iot");

const { DynamoDBClient, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");

// Initialize clients
const iot = new IoTClient({ region: "us-east-1" });
const dynamo = new DynamoDBClient({ region: "us-east-1" });

const TABLE_NAME = process.env.DEVICES_TABLE;

exports.deleteDevice = async (event) => {
  try {
    const { deviceId } = JSON.parse(event.body);

    if (!deviceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: "deviceId is required"
        })
      };
    }

    // 1. Optionally detach any principals (certificates) from the IoT Thing
    const principalsResponse = await iot.send(new ListThingPrincipalsCommand({ thingName: deviceId }));
    const principals = principalsResponse.principals || [];

    for (const principal of principals) {
      await iot.send(new DetachThingPrincipalCommand({
        thingName: deviceId,
        principal
      }));
    }

    // 2. Delete the IoT Thing
    await iot.send(new DeleteThingCommand({ thingName: deviceId }));

    // 3. Delete the device from DynamoDB
    await dynamo.send(new DeleteItemCommand({
      TableName: TABLE_NAME,
      Key: { deviceId: { S: deviceId } }
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Device deleted successfully"
      })
    };

  } catch (error) {
    console.error("Error deleting device:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Error deleting device",
        error: error.message
      })
    };
  }
};
