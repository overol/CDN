import { Hono } from "hono";
import { serveStatic } from "hono/cloudflare-workers";
import { parse } from "node-html-parser";

const CAR_LOGOS = "https://www.carlogos.org";

const app = new Hono();

app.get("/favicon.ico", serveStatic({ path: "./favicon.ico" }));

app.get("/", (c) => c.text(`Overol CDN \ndocs: https://developers.overol.mx`));

app.get("/cars/:brand/:model/:year", async (c) => {
  const { brand, model, year } = c.req.param();

  const args = new URLSearchParams({
    make: brand,
    modelYear: year,
    modelFamily: model,
    zoomType: "fullscreen",
    customer: "hrjavascript-mastery",
  });

  try {
    const result = await fetch(
      "https://cdn.imagin.studio/getimage?" + args.toString()
    );

    if (result.status !== 200) throw new Error("Error");

    return new Response(result.body);
  } catch (error) {
    return c.json({ error: "Error" }, 500);
  }
});

app.get("/brands/:brand", async (c) => {
  const brand = c.req.param("brand");

  const result = await fetch(`${CAR_LOGOS}/car-brands/${brand}-logo.html`);

  const html = await result.text();
  const root = parse(html);

  const logo = (
    root.querySelector("div.present a img") ||
    root.querySelector("div.content p a img") ||
    root.querySelector("div.current img")
  )?.getAttribute("src") as string;

  const isRelative = logo.startsWith("/");

  const logoUrl = isRelative ? CAR_LOGOS + logo : logo;

  const image = await fetch(logoUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    },
  });

  if (image.status !== 200) {
    return c.json({ error: "Not found" }, 404);
  }

  const mimeType = logo.split(".").pop();

  // @ts-ignore
  return c.body(await image.blob(), 200, {
    "Content-Type": `image/${mimeType}`,
  });
});

export default app;
