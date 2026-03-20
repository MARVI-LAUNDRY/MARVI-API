import transporter from "../config/nodemailer.js";

export const sendEmail = async ({destino, asunto, html}) => {
    try {
        const info = await transporter.sendMail({
            from: '"Lavandería MARVI" <no-reply>',
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
        console.error("No se pudo enviar el correo,", error.message);
        return false;
    }
};