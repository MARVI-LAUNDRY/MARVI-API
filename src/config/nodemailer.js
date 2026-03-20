import {createTransport} from "nodemailer";
import {config} from "dotenv";

config();

const transporter = createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.PASSWORD_EMAIL,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

export default transporter;