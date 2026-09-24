const a = "https://nix-downloader.vercel.app";

const b = {
  PROCESSING: "⏰",
  SUCCESS: "✅",
  FAILED: "❌"
};

const c = /https?:\/\/[^\s]+/i;

const d =
  /(tiktok\.com|vt\.tiktok|youtube\.com|youtu\.be|instagram\.com|facebook\.com|fb\.watch|twitter\.com|x\.com|pinterest\.|snapchat\.|reddit\.com|threads\.net|linkedin\.com|dailymotion\.com|vimeo\.com|likee\.|sharechat\.|moj\.|chingari\.)/i;

const e = new Set();

async function f(api, messageID, emoji) {
  try {
    if (!api || !messageID) return;
    if (typeof api.react === "function") {
      await api.react(emoji, messageID);
    } else if (typeof api.setMessageReaction === "function") {
      await api.setMessageReaction(emoji, messageID);
    }
  } catch (_) {}
}

async function g(url) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (autodl/0.0.1)" }
    });
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  } catch (_) {
    return null;
  }
}

function h(medias) {
  if (!Array.isArray(medias) || !medias.length) return null;
  const noWm = medias.find(
    (m) => m.type === "video" && /no[_ ]?watermark|hd/i.test(m.quality || "")
  );
  if (noWm) return noWm;
  const anyV = medias.find((m) => m.type === "video");
  if (anyV) return anyV;
  return medias[0];
}

module.exports = {
  config: {
    name: "autodl",
    version: "0.0.1",
    author: "ArYAN",
    description: "Auto-detect supported links and download the video",
    category: "downloader"
  },

  onEvent: async function ({ event, api, message }) {
    if (!event || !event.body) return;

    if (event.senderID && api && api.getCurrentUserID) {
      try {
        const me = await api.getCurrentUserID();
        if (String(event.senderID) === String(me)) return;
      } catch (_) {}
    }

    const body = String(event.body).trim();
    const match = body.match(c);
    if (!match) return;

    const url = match[0];
    if (!d.test(url)) return;

    const msgID = event.messageID;
    if (!msgID || e.has(msgID)) return;
    e.add(msgID);

    await f(api, msgID, b.PROCESSING);

    try {
      const res = await fetch(`${a}/download?url=${encodeURIComponent(url)}`);
      const json = await res.json().catch(() => null);

      if (!json || !json.success) {
        await f(api, msgID, b.FAILED);
        return;
      }

      const data = json.data || {};
      const best = h(data.medias);

      if (!best || !best.url) {
        await f(api, msgID, b.FAILED);
        return;
      }

      const buf = await g(best.url);
      if (!buf) {
        await f(api, msgID, b.FAILED);
        return;
      }

      try {
        if (typeof message.reply === "function") {
          await message.reply({ attachment: buf });
        } else if (api && typeof api.sendMessage === "function") {
          await api.sendMessage({ attachment: buf }, event.threadID, msgID);
        }
      } catch (sendErr) {
        await f(api, msgID, b.FAILED);
        return;
      }

      await f(api, msgID, b.SUCCESS);
    } catch (err) {
      await f(api, msgID, b.FAILED);
    } finally {
      setTimeout(() => e.delete(msgID), 60000);
    }
  }
};
