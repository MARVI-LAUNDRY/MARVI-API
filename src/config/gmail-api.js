import {OAuth2Client} from "google-auth-library";
import {config} from "dotenv";

config();

const GMAIL_SENDER_EMAIL = process.env.GMAIL_SENDER_EMAIL;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? process.env.GMAIL_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? process.env.GMAIL_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN ?? process.env.GMAIL_REFRESH_TOKEN;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ?? "https://developers.google.com/oauthplayground";

const missingEnvVars = [
    ["GMAIL_SENDER_EMAIL", GMAIL_SENDER_EMAIL],
    ["GOOGLE_CLIENT_ID", GOOGLE_CLIENT_ID],
    ["GOOGLE_CLIENT_SECRET", GOOGLE_CLIENT_SECRET],
    ["GOOGLE_REFRESH_TOKEN", GOOGLE_REFRESH_TOKEN],
].filter(([, value]) => !value);

if (missingEnvVars.length > 0) {
    console.warn("Faltan variables para Gmail OAuth2:", missingEnvVars.map(([name]) => name).join(", "));
}

const oauthClient = new OAuth2Client({
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: GOOGLE_REDIRECT_URI,
});

if (GOOGLE_REFRESH_TOKEN) {
    oauthClient.setCredentials({refresh_token: GOOGLE_REFRESH_TOKEN});
}

export const getGmailAccessToken = async () => {
    const token = await oauthClient.getAccessToken();
    const accessToken = typeof token === "string" ? token : token?.token;

    if (!accessToken) {
        throw new Error("No se pudo obtener el access token de Gmail API");
    }

    return accessToken;
};

export const mailSender = GMAIL_SENDER_EMAIL;
export default oauthClient;

