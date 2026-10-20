export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

export const button = (href, label, secondary = false) =>
  `<a href="${escapeHtml(href)}" style="display:block;text-align:center;${
    secondary
      ? "background:#ffffff;color:#040c54;border:1px solid #cfd3e5"
      : "background:#ff6b01;color:#ffffff;border:1px solid #ff6b01"
  };text-decoration:none;font-weight:700;padding:14px;border-radius:6px;margin-top:12px">${escapeHtml(label)}</a>`;

export const hr = `<hr style="border:0;border-top:1px solid #e0e2ed;margin:24px 0"/>`;

/** Struttura comune delle email: card bianca con bordo arancione e piè di pagina legale. */
export const layout = (content) => `<!doctype html>
<html lang="it"><body style="margin:0;background:#f5f6fa;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#040c54">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#ffffff;border-radius:12px;border-top:4px solid #ff6b01;padding:32px;line-height:1.55">
      <div style="font-size:18px;font-weight:700;margin-bottom:28px">
        <span style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;background:#ff6b01;border-radius:6px;margin-right:8px">✓</span>il prezzo giusto per te.
      </div>
      ${content}
    </div>
    <p style="font-size:11px;color:#5e637e;text-align:center;margin-top:16px">Mobility Express è un marchio di Alca Broker srl · RUI B000514026 · P.IVA 07965051217</p>
  </div>
</body></html>`;
