const { DynamoDBClient, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");

const dynamo = new DynamoDBClient({ region: "us-east-1" });
const TABLE_NAME = process.env.DEVICES_TABLE;

exports.updateDevice = async (event) => {
  try {
    const { deviceId, name, room, config = {} } = JSON.parse(event.body);

    if (!deviceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: "deviceId is required"
        })
      };
    }

    const updateExpression = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {}; // NEW

    if (name !== undefined) {
      updateExpression.push("#name = :name"); // Use alias #name
      expressionAttributeValues[":name"] = { S: name };
      expressionAttributeNames["#name"] = "name"; // Map alias to actual attribute
    }

    if (room !== undefined) {
      updateExpression.push("room = :room");
      expressionAttributeValues[":room"] = { S: room };
    }

    if (config.maxCurrent !== undefined) {
      updateExpression.push("maxCurrent = :maxCurrent");
      expressionAttributeValues[":maxCurrent"] = { N: config.maxCurrent.toString() };
    }

    if (config.maxPower !== undefined) {
      updateExpression.push("maxPower = :maxPower");
      expressionAttributeValues[":maxPower"] = { N: config.maxPower.toString() };
    }

    if (config.safetyEnabled !== undefined) {
      updateExpression.push("safetyEnabled = :safetyEnabled");
      expressionAttributeValues[":safetyEnabled"] = { BOOL: config.safetyEnabled };
    }

    if (config.reportInterval !== undefined) {
      updateExpression.push("reportInterval = :reportInterval");
      expressionAttributeValues[":reportInterval"] = { N: config.reportInterval.toString() };
    }

    if (updateExpression.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: "No fields provided for update"
        })
      };
    }

    await dynamo.send(new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: { deviceId: { S: deviceId } },
      UpdateExpression: "SET " + updateExpression.join(", "),
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames // NEW
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Device updated successfully"
      })
    };

  } catch (error) {
    console.error("Error updating device:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Error updating device",
        error: error.message
      })
    };
  }
};
