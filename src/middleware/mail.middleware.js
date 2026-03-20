import {getGmailAccessToken, mailSender} from "../config/gmail-api.js";

const encodeBase64Url = (value) => Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const sanitizeHeaderValue = (value) => String(value ?? "").replace(/[\r\n]+/g, " ").trim();

const encodeMimeHeader = (value) => {
    const safeValue = sanitizeHeaderValue(value);
    return /[^\x00-\x7F]/.test(safeValue)
        ? `=?UTF-8?B?${Buffer.from(safeValue, "utf8").toString("base64")}?=`
        : safeValue;
};

const buildRawEmail = ({destino, asunto, html}) => {
    const message = [
        `From: \"Lavanderia MARVI\" <${mailSender}>`,
        `To: ${sanitizeHeaderValue(destino)}`,
        `Subject: ${encodeMimeHeader(asunto)}`,
        "MIME-Version: 1.0",
        "X-No-Auto-Append: 1",
        "X-Mailer: Lavanderia MARVI",
        "X-Priority: 1",
        "Precedence: bulk",
        "Content-Type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: 7bit",
        "",
        html,
    ].join("\r\n");

    return encodeBase64Url(message);
};

export const sendEmail = async ({destino, asunto, html}) => {
    try {
        const accessToken = await getGmailAccessToken();
        const raw = buildRawEmail({destino, asunto, html});

        const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({raw})
        });

        if (!response.ok) {
            const responseError = await response.text();
            const isAuthError = [401, 403].includes(response.status)
                || responseError.includes("invalid_grant");
            if (isAuthError) {
                console.error("No se pudo autenticar con Gmail API. Revisa GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REFRESH_TOKEN.");
            } else {
                console.error("No se pudo enviar el correo:", responseError || `Error HTTP ${response.status}`);
            }
            return false;
        }

        const payload = await response.json();
        console.debug("Correo enviado: %s", payload.id);
        return true;
    } catch (error) {
        const isAuthError = ["invalid_grant", 401, 403].includes(error?.code)
            || String(error?.message || "").includes("invalid_grant");
        if (isAuthError) {
            console.error("No se pudo autenticar con Gmail API. Revisa GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REFRESH_TOKEN.");
        } else {
            console.error("No se pudo enviar el correo:", error.message);
        }
        return false;
    }
};

