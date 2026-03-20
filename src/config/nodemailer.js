import {createTransport} from "nodemailer";
import {config} from "dotenv";

config();

const GMAIL_SENDER_EMAIL = process.env.GMAIL_SENDER_EMAIL;
const GMAIL_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

const missingEnvVars = [
    ["GMAIL_SENDER_EMAIL (o USER_EMAIL)", GMAIL_SENDER_EMAIL],
    ["GMAIL_CLIENT_ID (o GOOGLE_CLIENT_ID)", GMAIL_CLIENT_ID],
    ["GMAIL_CLIENT_SECRET", GMAIL_CLIENT_SECRET],
    ["GMAIL_REFRESH_TOKEN", GMAIL_REFRESH_TOKEN],
].filter(([, value]) => !value);

if (missingEnvVars.length > 0) {
    console.warn("Faltan variables para Gmail OAuth2:", missingEnvVars.map(([name]) => name).join(", "));
}

const transporter = createTransport({
    service: "gmail",
    auth: {
        type: "OAuth2",
        user: GMAIL_SENDER_EMAIL,
        clientId: GMAIL_CLIENT_ID,
        clientSecret: GMAIL_CLIENT_SECRET,
        refreshToken: GMAIL_REFRESH_TOKEN,
    },
});

export const mailSender = GMAIL_SENDER_EMAIL;
export default transporter;