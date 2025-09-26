const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.DYNAMODB_TABLE;
const COSTPERUNIT = 0.5;

exports.getUsageSummary = async (event) => {
  try {
    const { deviceId, startDate, endDate } = JSON.parse(event.body || "{}");

    if (!deviceId || !startDate) {
      return { statusCode: 400, body: JSON.stringify({ message: "Missing deviceId or startDate" }) };
    }

    const rangeStart = `${startDate}T00:00:00`;
    const rangeEnd = `${endDate || startDate}T23:59:59`;

    // Scan DynamoDB table
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: 'device_id = :d AND #ts BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#ts': 'timestamp' },
      ExpressionAttributeValues: { ':d': deviceId, ':start': rangeStart, ':end': rangeEnd }
    };

    const result = await ddb.scan(params).promise();
    const items = result.Items || [];

    // Aggregate totals
    let totalEnergy = 0;
    let totalCost = 0;
    let totalPowerSum = 0;
    let peakPower = 0;
    let runtimeHours = 0;

    const hourlyDataMap = {};

    items.forEach(item => {
      const ts = new Date(item.timestamp);
      const hourKey = ts.toISOString().slice(0, 13) + ":00:00Z";

      const energy = Number(item.power) || 0;
      const cost = energy * COSTPERUNIT; // example cost per unit
      const power = Number(item.power) || 0;
      const stateOn = item.state === "ON" ? 1 : 0;

      totalEnergy += energy;
      totalCost += cost;
      totalPowerSum += power;
      peakPower = Math.max(peakPower, power);
      runtimeHours += stateOn * (1/12); // assuming readings every 5 mins -> 1/12 hour

      if (!hourlyDataMap[hourKey]) {
        hourlyDataMap[hourKey] = { hour: hourKey, energy: 0, avgPower: 0, cost: 0, count: 0 };
      }

      hourlyDataMap[hourKey].energy += energy;
      hourlyDataMap[hourKey].cost += cost;
      hourlyDataMap[hourKey].avgPower += power;
      hourlyDataMap[hourKey].count += 1;
    });

    const hourlyData = Object.values(hourlyDataMap).map(h => ({
      hour: h.hour,
      energy: Number(h.energy.toFixed(2)),
      avgPower: Number((h.avgPower / h.count).toFixed(2)),
      cost: Number(h.cost.toFixed(2))
    }));

    const summary = {
      deviceId,
      startDate: rangeStart,
      endDate: rangeEnd,
      totalEnergy: Number(totalEnergy.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      avgPower: Number((totalPowerSum / (items.length || 1)).toFixed(2)),
      peakPower: Number(peakPower.toFixed(2)),
      runtimeHours: Number(runtimeHours.toFixed(2)),
      hourlyData
    };

    return { statusCode: 200, body: JSON.stringify({ summary }) };

  } catch (error) {
    console.error("Error fetching usage summary:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Error fetching usage summary", error: error.message }) };
  }
};
