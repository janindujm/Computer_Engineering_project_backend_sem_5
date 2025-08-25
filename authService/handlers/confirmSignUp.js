const {CognitoIdentityProviderClient, ConfirmSignUpCommand} = require('@aws-sdk/client-cognito-identity-provider');

//Initialize Cognito client with specified AWS region
const client = new CognitoIdentityProviderClient({
    region: 'us-east-1', //Specify the AWS region where your Cognito User Pool is located
});

//define Cognito App Client ID for user pool authentication

const CLIENT_ID = process.env.CLIENT_ID;

//Exported confirm-sign-up function to handle user email verification

exports.confirmSignUp = async (event) => {
    //parse the incoming request body to extract user data
    const {email, confirmationCode} = JSON.parse(event.body);

    //Configure parameters for Cognito ConfirmSignUp command

    const params = {
        ClientId: CLIENT_ID, //Cognito App Client ID
        Username: email, //User's email as username
        ConfirmationCode: confirmationCode, //Verification code sent to user's email
    };

    try {
        //Confirm the user's sign-up in cognito user pool
        const command = new ConfirmSignUpCommand(params);
        //Execute the confirm sign-up request
        await client.send(command);

        //return client response with success message
        return {
            statusCode: 200, //HTTP status code for created resource
            body: JSON.stringify({
                message: "User email verified successfully", //Success message
            }),
        };
        
    } catch (error) {
        return {
            statusCode: 400, //HTTP status code for internal server error
            body: JSON.stringify({
                message: "Error verifying user email", //Error message
                error: error.message, //Include the error message from the exception
            }),
        };
        
    }
}