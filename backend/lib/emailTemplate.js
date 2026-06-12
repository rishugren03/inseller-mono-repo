export function buildThemedEmailHtml({
  store,
  visitorName,
  subject,
  bodyText,
  products = [],
}) {
  const themeColor = store.themeColor || "#FF6B2C";
  const botName = store.botName || "Inseller";
  const shopUrl = store.shopUrl || "";
  const cleanShopUrl = shopUrl.replace(/^https?:\/\//, "");
  const storeDisplayLink = `https://${cleanShopUrl}`;

  // Convert plaintext newlines into HTML paragraphs
  const paragraphsHtml = bodyText
    .split("\n")
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">${para}</p>`)
    .join("");

  // Build product cards HTML if any products were discussed
  let productsHtml = "";
  if (products.length > 0) {
    const cardsHtml = products
      .map((p) => {
        const imageUrl = p.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=60";
        return `
          <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; display: inline-block; width: 260px; margin: 10px; text-align: left; vertical-align: top; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="height: 180px; overflow: hidden; background-color: #f7fafc; display: flex; align-items: center; justify-content: center;">
              <img src="${imageUrl}" alt="${p.title}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
            </div>
            <div style="padding: 16px;">
              <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1a202c; height: 40px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                ${p.title}
              </h4>
              <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: bold; color: ${themeColor};">
                ${p.price ? `${p.price}` : ""}
              </p>
              <a href="${p.url}" target="_blank" style="display: block; text-align: center; background-color: ${themeColor}; color: #ffffff; padding: 10px 16px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                View Details
              </a>
            </div>
          </div>
        `;
      })
      .join("");

    productsHtml = `
      <div style="margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 24px; text-align: center;">
        <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1a202c;">
          Products Discussed
        </h3>
        <div style="display: flex; flex-wrap: wrap; justify-content: center;">
          ${cardsHtml}
        </div>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" class="content-table" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: ${themeColor}; padding: 32px 40px; text-align: left;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                ${botName}
              </h1>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 40px;">
              ${paragraphsHtml}
              
              <!-- Products Section -->
              ${productsHtml}

              <!-- Return to Store Button -->
              <div style="margin-top: 36px; text-align: center;">
                <a href="${storeDisplayLink}" target="_blank" style="display: inline-block; background-color: #1a202c; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                  Visit Our Store
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #718096; line-height: 1.4;">
                Have more questions? Reply directly to this email to reach us at <strong>${store.brevoSender}</strong>.
              </p>
              <p style="margin: 0; font-size: 11px; color: #a0aec0;">
                Powered by Inseller &bull; Elevating Shopify Sales
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
