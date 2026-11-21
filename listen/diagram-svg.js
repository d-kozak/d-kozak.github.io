"use strict";
// Shared by the build renderer, encrypted schema, and viewer. This is NOT an SVG
// parser: accept only a small JSON drawing tree, never arbitrary SVG/XML or CSS.
(() => {
  const tags = new Set(["svg", "g", "defs", "symbol", "use", "marker", "clipPath", "linearGradient", "radialGradient", "stop", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "tspan", "title", "desc"]);
  const attributes = new Set(("id href viewBox width height x y x1 y1 x2 y2 cx cy r rx ry dx dy d points transform preserveAspectRatio refX refY markerWidth markerHeight markerUnits orient clipPathUnits " +
    "offset gradientUnits gradientTransform fx fy fr stop-color stop-opacity fill stroke stroke-width stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit fill-rule clip-rule fill-opacity stroke-opacity opacity " +
    "font-family font-size font-weight font-style text-anchor dominant-baseline alignment-baseline text-decoration visibility display marker-start marker-mid marker-end clip-path").split(" "));
  const references = new Set(["marker-start", "marker-mid", "marker-end", "clip-path"]);
  const idPattern = /^[A-Za-z_][A-Za-z0-9_.-]{0,199}$/;
  function validate(tree) {
    let count = 0, chars = 0;
    function visit(value, depth) {
      if (++count > 5000 || depth > 64) throw new Error("Diagram drawing is too complex.");
      if (typeof value === "string") {
        chars += value.length;
        if (chars > 300000) throw new Error("Diagram drawing is too large.");
        return value;
      }
      if (!value || typeof value !== "object" || Array.isArray(value) || !tags.has(value.tag)) throw new Error(`Unsupported diagram element: ${String(value?.tag).slice(0, 40)}`);
      if (!value.attrs || typeof value.attrs !== "object" || Array.isArray(value.attrs) || !Array.isArray(value.children)) throw new Error("Malformed diagram element.");
      const attrs = {};
      for (const [name, content] of Object.entries(value.attrs)) {
        if (!attributes.has(name) || typeof content !== "string" || content.length > 20000) throw new Error("Unsupported diagram attribute.");
        chars += content.length;
        if (chars > 300000) throw new Error("Diagram drawing is too large.");
        if (name === "id") {
          if (!idPattern.test(content)) throw new Error("Invalid diagram ID.");
        } else if (name === "href") {
          if (!/^#[A-Za-z_][A-Za-z0-9_.-]{0,199}$/.test(content)) throw new Error("Only local diagram references are allowed.");
        } else if (references.has(name) || (["fill", "stroke"].includes(name) && content.startsWith("url("))) {
          if (content !== "none" && !/^url\(#[A-Za-z_][A-Za-z0-9_.-]{0,199}\)$/.test(content)) throw new Error("Only local diagram references are allowed.");
        } else if (!/^[A-Za-z0-9_#.,%()+\-\s]*$/.test(content) || /url\s*\(/i.test(content)) {
          throw new Error("Unsafe diagram attribute value.");
        }
        attrs[name] = content;
      }
      return {tag: value.tag, attrs, children: value.children.map(child => visit(child, depth + 1))};
    }
    if (tree?.tag !== "svg") throw new Error("Diagram needs an SVG root.");
    const result = visit(tree, 0);
    for (const name of ["width", "height"]) {
      if (!/^\d+(\.\d+)?$/.test(result.attrs[name]) || Number(result.attrs[name]) <= 0 || Number(result.attrs[name]) > 10000) throw new Error("Invalid diagram dimensions.");
    }
    if (!/^[-+\d.eE]+\s+[-+\d.eE]+\s+[-+\d.eE]+\s+[-+\d.eE]+$/.test(result.attrs.viewBox || "") || !result.attrs.viewBox.split(/\s+/).every(n => Number.isFinite(Number(n)))) throw new Error("Invalid diagram viewBox.");
    return result;
  }
  const escape = text => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  function serialize(tree) {
    const safe = validate(tree);
    function xml(value, root = false) {
      if (typeof value === "string") return escape(value);
      const attrs = Object.entries(value.attrs).map(([k, v]) => ` ${k}="${escape(v)}"`).join("");
      return `<${value.tag}${root ? ' xmlns="http://www.w3.org/2000/svg"' : ""}${attrs}>${value.children.map(v => xml(v)).join("")}</${value.tag}>`;
    }
    return xml(safe, true);
  }
  globalThis.ListeningDiagram = Object.freeze({validate, serialize});
})();
