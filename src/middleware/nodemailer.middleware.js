import transporter, {mailSender} from "../config/nodemailer.js";

export const sendEmail = async ({destino, asunto, html}) => {
    try {
        const info = await transporter.sendMail({
            from: `"Lavandería MARVI" <${mailSender}>`,
            to: destino,
            subject: asunto,
            html: html,
            attachments: [{
                filename: "logo.png", path: "./public/pictures/logo.png", cid: "logo",
            },],
            headers: {
                'X-No-Auto-Append': '1',
                'X-Mailer': 'Lavandería MARVI',
                'X-Priority': '1',
                'Precedence': 'bulk'
            }
        });

        console.debug("Correo enviado: %s", info.messageId);
        return true
    } catch (error) {
        const isAuthError = ["EAUTH", "invalid_grant"].includes(error?.code) || error?.responseCode === 535;
        if (isAuthError) {
            console.error("No se pudo autenticar con Gmail API. Revisa CLIENT_ID, CLIENT_SECRET y REFRESH_TOKEN.");
        } else {
            console.error("No se pudo enviar el correo:", error.message);
        }
        return false;
    }
};