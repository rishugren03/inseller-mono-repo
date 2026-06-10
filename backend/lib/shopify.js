export async function fetchProductCatalog(shopUrl) {
  // Strip https:// or http:// if present
  const cleanUrl = shopUrl.replace(/^https?:\/\//, "");
  const url = `https://${cleanUrl}/products.json?limit=250`;
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Shopify fetch failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  const products = Array.isArray(data.products) ? data.products : [];

  // Create a compact summary used in LLM prompts for speed.
  const summary = products
    .map((p) => {
      const variantText = Array.isArray(p.variants)
        ? p.variants
            .map(
              (v) =>
                `${v.title} ₹${v.price} ${v.available ? "in stock" : "out of stock"}`,
            )
            .join(", ")
        : "";
      const description =
        typeof p.body_html === "string"
          ? p.body_html.replace(/<[^>]*>/g, "").slice(0, 200)
          : "";
      return `${p.title} | ${variantText} | ${description}`;
    })
    .join("\n");

  return { products, summary };
}
