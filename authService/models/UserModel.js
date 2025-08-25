const {DynamoDBClient, PutItemCommand} = require('@aws-sdk/client-dynamodb');
const {v4: uuidv4} = require('uuid');

const TABLE_NAME = "User_Table"; //DynamoDB table name for storing user data

//Initialize DynamoDB client with specified AWS region
const dynamoClient = new DynamoDBClient({
    region: 'us-east-1', //Specify the AWS region where your DynamoDB table is located
});

//User Model class to represent a user and handle database operations
class UserModel {
    constructor(email, fullName){
        this.userId = uuidv4(); //Generate a unique user ID
        this.email = email; //User's email
        this.fullName = fullName; //User's full name
        this.state = '' //default empty string for state
        this.city = '' //default empty string for city
        this.locality = '' //default empty string for country
        this.createdAt = new Date().toISOString(); //Timestamp for user creation0
    }
//save user data to DynamoDb

    async save(){
        const params = {
            TableName : TABLE_NAME, //DynamoDB table name
            Item: {
                userId: {S: this.userId}, //User ID as string
                email: {S: this.email}, //User email as string
                fullName: {S: this.fullName}, //User full name as string
                state: {S: this.state}, //User state as string
                city: {S: this.city}, //User city as string
                locality: {S: this.locality}, //User locality as string
                createdAt: {S: this.createdAt} //Creation timestamp as string
            }
        }
        try {
            await dynamoClient.send(new PutItemCommand(params)); //Execute the PutItem command to save user data
            
        } catch (error) {
            throw error;
        }

    }
}

module.exports = UserModel; //Export the UserModel class for use in other modules