import {createTransport} from "nodemailer";
import {config} from "dotenv";

config();

const transporter = createTransport({
    service: 'Gmail', auth: {
        user: process.env.USER_EMAIL, pass: process.env.PASSWORD_EMAIL,
    }, tls: {
        rejectUnauthorized: false,
    }
});

export default transporter;