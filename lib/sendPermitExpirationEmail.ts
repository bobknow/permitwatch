import { resend } from "@/lib/resend";

type PermitExpirationEmailProps = {
  to: string;
  recipientName?: string | null;
  propertyName?: string | null;
  propertyAddress?: string | null;
  boilerNumber?: string | null;
  permitNumber?: string | null;
  expirationDate: string;
  daysRemaining: number;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value: string) {
  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function sendPermitExpirationEmail({
  to,
  recipientName,
  propertyName,
  propertyAddress,
  boilerNumber,
  permitNumber,
  expirationDate,
  daysRemaining,
}: PermitExpirationEmailProps) {
  const safeRecipientName = escapeHtml(
    recipientName?.trim() || "there"
  );

  const safePropertyName = escapeHtml(
    propertyName?.trim() || "Property"
  );

  const safePropertyAddress = propertyAddress
    ? escapeHtml(propertyAddress)
    : null;

  const safeBoilerNumber = boilerNumber
    ? escapeHtml(boilerNumber)
    : null;

  const safePermitNumber = permitNumber
    ? escapeHtml(permitNumber)
    : null;

  const formattedExpirationDate =
    formatDate(expirationDate);

  const isExpired = daysRemaining < 0;

  const subject = isExpired
    ? `Permit expired — ${safePropertyName}`
    : `Permit expires in ${daysRemaining} ${
        daysRemaining === 1 ? "day" : "days"
      } — ${safePropertyName}`;

  const statusText = isExpired
    ? `This permit expired ${Math.abs(
        daysRemaining
      )} ${
        Math.abs(daysRemaining) === 1
          ? "day"
          : "days"
      } ago.`
    : `This permit expires in ${daysRemaining} ${
        daysRemaining === 1 ? "day" : "days"
      }.`;

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.getpermitwatch.com";

  const { data, error } =
    await resend.emails.send({
      from: "PermitWatch Notifications <notifications@getpermitwatch.com>",
      replyTo: "support@getpermitwatch.com",
      to,
      subject,
      html: `
        <!doctype html>
        <html>
          <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
            <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
              <div style="background:#0f172a;border-radius:20px;padding:32px;">
                <div style="font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#34d399;">
                  PermitWatch
                </div>

                <h1 style="margin:16px 0 0;font-size:30px;line-height:1.2;color:#ffffff;">
                  Permit compliance alert
                </h1>

                <p style="margin:18px 0 0;font-size:16px;line-height:1.7;color:#cbd5e1;">
                  Hi ${safeRecipientName},
                </p>

                <p style="margin:12px 0 0;font-size:16px;line-height:1.7;color:#cbd5e1;">
                  ${statusText}
                </p>

                <div style="margin-top:26px;background:#020617;border:1px solid #334155;border-radius:14px;padding:22px;">
                  <div style="margin-bottom:16px;">
                    <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#64748b;">
                      Property
                    </div>
                    <div style="margin-top:4px;font-size:17px;font-weight:700;color:#ffffff;">
                      ${safePropertyName}
                    </div>
                    ${
                      safePropertyAddress
                        ? `
                          <div style="margin-top:4px;font-size:14px;color:#94a3b8;">
                            ${safePropertyAddress}
                          </div>
                        `
                        : ""
                    }
                  </div>

                  ${
                    safeBoilerNumber
                      ? `
                        <div style="margin-bottom:16px;">
                          <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#64748b;">
                            Boiler
                          </div>
                          <div style="margin-top:4px;font-size:16px;color:#ffffff;">
                            ${safeBoilerNumber}
                          </div>
                        </div>
                      `
                      : ""
                  }

                  ${
                    safePermitNumber
                      ? `
                        <div style="margin-bottom:16px;">
                          <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#64748b;">
                            Permit
                          </div>
                          <div style="margin-top:4px;font-size:16px;color:#ffffff;">
                            ${safePermitNumber}
                          </div>
                        </div>
                      `
                      : ""
                  }

                  <div>
                    <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#64748b;">
                      Expiration Date
                    </div>
                    <div style="margin-top:4px;font-size:18px;font-weight:700;color:${
                      isExpired
                        ? "#f87171"
                        : "#fbbf24"
                    };">
                      ${formattedExpirationDate}
                    </div>
                  </div>
                </div>

                <a
                  href="${appUrl}/notifications"
                  style="display:inline-block;margin-top:28px;background:#059669;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:10px;"
                >
                  View in PermitWatch
                </a>

                <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                  This automated compliance reminder was generated by PermitWatch.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

  if (error) {
    throw new Error(
      `Unable to send PermitWatch notification: ${error.message}`
    );
  }

  return data;
}